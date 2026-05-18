import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import OpenAI from "openai";
import type { OcrBlock, Caption } from "../shared/schema.js";
import { storage } from "./storage.js";
import { calculateGroqWhisperCostUsdMicros, calculateOpenAIChatCostUsdMicros } from "./usage.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Tesseract types ──────────────────────────────────────────────────────────

interface TesseractBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: TesseractBbox;
}

interface TesseractLine {
  words?: TesseractWord[];
  text?: string;
  confidence?: number;
  bbox?: TesseractBbox;
}

interface TesseractParagraph {
  lines: TesseractLine[];
}

interface TesseractBlock {
  paragraphs: TesseractParagraph[];
  text?: string;
  confidence?: number;
  bbox?: TesseractBbox;
}

interface TesseractData {
  blocks?: TesseractBlock[] | null;
  text?: string;
  confidence?: number;
  width?: number;
  height?: number;
}

// ─── Groq types ───────────────────────────────────────────────────────────────

interface GroqSegment {
  start: number;
  end: number;
  text: string;
}

interface GroqVerboseTranscription {
  segments: GroqSegment[];
  language: string;
  duration: number;
  text: string;
}

// ─── OCR via Tesseract.js ─────────────────────────────────────────────────────

const OCR_LANGUAGES = "chi_sim+eng";
const OCR_CACHE_DIR = path.join(process.cwd(), ".tessdata-cache");

function isRecoverableTesseractLanguageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("traineddata") ||
    message.includes("TESSDATA_PREFIX") ||
    message.includes("Failed loading language") ||
    message.includes("expected OCR data structure")
  );
}

function mapTesseractData(data: unknown): OcrBlock[] {
  const td = data as TesseractData;

  if (typeof td !== "object" || td === null) {
    throw new Error("Tesseract did not return expected OCR data structure");
  }

  const imgWidth = typeof td.width === "number" && td.width > 0 ? td.width : 800;
  const imgHeight = typeof td.height === "number" && td.height > 0 ? td.height : 600;
  const blocks: OcrBlock[] = [];

  for (const block of Array.isArray(td.blocks) ? td.blocks : []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        const words = line.words ?? [];
        const lineText = (line.text ?? words.map((w) => w.text).join(" ")).trim();
        if (!lineText) continue;

        const conf =
          typeof line.confidence === "number"
            ? line.confidence
            : words.length
              ? words.reduce((s, w) => s + (w.confidence ?? 0), 0) / words.length
              : 100;

        if (conf < 30) continue;

        const bbox = line.bbox ?? block.bbox;
        if (!bbox) continue;

        blocks.push({
          text: lineText,
          x: (bbox.x0 / imgWidth) * 100,
          y: (bbox.y0 / imgHeight) * 100,
          width: ((bbox.x1 - bbox.x0) / imgWidth) * 100,
          height: ((bbox.y1 - bbox.y0) / imgHeight) * 100,
          confidence: Math.round(conf),
        });
      }
    }
  }

  if (blocks.length === 0 && typeof td.text === "string" && td.text.trim()) {
    blocks.push({
      text: td.text.trim(),
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      confidence: Math.round(typeof td.confidence === "number" ? td.confidence : 0),
    });
  }

  return blocks;
}

export async function runOCR(
  filePath: string,
  onProgress?: (step: "scanning" | "extracting") => void
): Promise<OcrBlock[]> {
  const Tesseract = await import("tesseract.js");

  async function recognizeWithCache(cacheMethod: "write" | "refresh") {
    fs.mkdirSync(OCR_CACHE_DIR, { recursive: true });
    const worker = await Tesseract.createWorker(OCR_LANGUAGES, 1, {
      cacheMethod,
      cachePath: OCR_CACHE_DIR,
    });
    try {
      onProgress?.("scanning");
      const { data } = await worker.recognize(filePath, {}, { blocks: true });
      onProgress?.("extracting");
      return mapTesseractData(data);
    } finally {
      await worker.terminate();
    }
  }

  try {
    return await recognizeWithCache("refresh");
  } catch (error) {
    if (!isRecoverableTesseractLanguageError(error)) throw error;
    return recognizeWithCache("refresh");
  }
}

// ─── Audio/Video transcription + caption generation ──────────────────────────

export async function generateCaptions(
  filePath: string,
  onProgress?: (step: "transcribing" | "translating") => void,
  userId?: string
): Promise<Caption[]> {
  onProgress?.("transcribing");
  if (userId) await storage.assertAiUsageWithinBudget(userId);
  const fileStream = fs.createReadStream(filePath);

  // groq-sdk types the response as SpeechCreateParams but verbose_json returns
  // a richer object at runtime — cast through unknown to our typed interface.
  const rawTranscription = await groq.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-large-v3-turbo",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  // Validate the SDK returned a verbose response with segments before mapping
  const transcription = rawTranscription as unknown as GroqVerboseTranscription;
  if (
    typeof transcription !== "object" ||
    transcription === null ||
    !Array.isArray(transcription.segments)
  ) {
    throw new Error("Groq API did not return expected verbose_json with segments");
  }
  const segments: GroqSegment[] = transcription.segments;
  if (userId) {
    await storage.recordAiUsage(userId, {
      feature: "media.transcription",
      provider: "groq",
      model: "whisper-large-v3-turbo",
      durationSeconds: transcription.duration,
      billableUnits: Math.ceil(transcription.duration),
      costUsdMicros: calculateGroqWhisperCostUsdMicros(transcription.duration),
      metadata: { segmentCount: segments.length },
    });
  }

  if (!segments.length) return [];

  // Detect language from first few segments
  const sampleText = segments
    .slice(0, 5)
    .map((s) => s.text)
    .join(" ");
  const isChinese = /[\u4e00-\u9fff]/.test(sampleText);

  onProgress?.("translating");

  // Translate segments in chunks of 50 to avoid token-limit truncation on long media.
  const CHUNK_SIZE = 50;

  interface TranslationEntry { index: number; translated: string }
  interface TranslationResponse { translations: TranslationEntry[] }

  const translationMap = new Map<number, string>();

  for (let chunkStart = 0; chunkStart < segments.length; chunkStart += CHUNK_SIZE) {
    if (userId) await storage.assertAiUsageWithinBudget(userId);

    const chunk = segments.slice(chunkStart, chunkStart + CHUNK_SIZE);
    const segmentList = chunk.map((s, i) => ({ index: chunkStart + i, text: s.text.trim() }));

    const translationPrompt = isChinese
      ? `You are a professional translator. Translate each Chinese segment to English.
Return a JSON object with key "translations" whose value is an array of objects: { "index": number, "translated": string }.
Segments:\n${JSON.stringify(segmentList)}`
      : `You are a professional translator. Translate each segment to Chinese (Simplified).
Return a JSON object with key "translations" whose value is an array of objects: { "index": number, "translated": string }.
Segments:\n${JSON.stringify(segmentList)}`;

    const model = "gpt-4o-mini";
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: translationPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000,
    });

    if (userId) {
      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      await storage.recordAiUsage(userId, {
        feature: "media.translation",
        provider: "openai",
        model,
        inputTokens,
        outputTokens,
        costUsdMicros: calculateOpenAIChatCostUsdMicros(model, inputTokens, outputTokens),
        metadata: { chunkStart, chunkSize: chunk.length },
      });
    }

    try {
      const parsed = JSON.parse(
        completion.choices[0]?.message?.content ?? "{}"
      ) as TranslationResponse;
      if (Array.isArray(parsed.translations)) {
        for (const entry of parsed.translations) {
          if (typeof entry.index === "number" && typeof entry.translated === "string") {
            translationMap.set(entry.index, entry.translated.trim());
          }
        }
      }
    } catch {
      console.warn(`Caption translation parsing failed for chunk ${chunkStart}–${chunkStart + chunk.length - 1}; that batch will have empty translations`);
    }
  }

  return segments.map((seg, i) => {
    const translated = translationMap.get(i) ?? "";
    return {
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      chinese: isChinese ? seg.text.trim() : translated,
      english: isChinese ? translated : seg.text.trim(),
    };
  });
}
