import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import OpenAI from "openai";
import type { OcrBlock, Caption } from "@shared/schema";

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
  words: TesseractWord[];
  bbox: TesseractBbox;
}

interface TesseractParagraph {
  lines: TesseractLine[];
}

interface TesseractBlock {
  paragraphs: TesseractParagraph[];
  bbox: TesseractBbox;
}

interface TesseractData {
  blocks: TesseractBlock[];
  width: number;
  height: number;
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

export async function runOCR(filePath: string): Promise<OcrBlock[]> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(["chi_sim", "eng"]);

  try {
    const { data } = await worker.recognize(filePath);
    const td = data as unknown as TesseractData;

    const imgWidth = td.width > 0 ? td.width : 800;
    const imgHeight = td.height > 0 ? td.height : 600;

    const blocks: OcrBlock[] = [];

    for (const block of td.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          const words = line.words ?? [];
          if (!words.length) continue;

          const lineText = words.map((w) => w.text).join(" ").trim();
          if (!lineText) continue;

          const conf =
            words.reduce((s, w) => s + (w.confidence ?? 0), 0) / words.length;

          if (conf < 30) continue;

          const bbox = line.bbox;
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

    return blocks;
  } finally {
    await worker.terminate();
  }
}

// ─── Audio/Video transcription + caption generation ──────────────────────────

export async function generateCaptions(filePath: string): Promise<Caption[]> {
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

  if (!segments.length) return [];

  // Detect language from first few segments
  const sampleText = segments
    .slice(0, 5)
    .map((s) => s.text)
    .join(" ");
  const isChinese = /[\u4e00-\u9fff]/.test(sampleText);

  // Translate all segments with gpt-4o-mini
  const segmentList = segments
    .map((s, i) => `${i}: ${s.text.trim()}`)
    .join("\n");

  const translationPrompt = isChinese
    ? `You are a professional translator. Below are numbered segments of Chinese text. For each segment, provide the English translation. Respond with one line per segment in the format: INDEX|ENGLISH\n\n${segmentList}`
    : `You are a professional translator. Below are numbered segments of text. For each segment, provide the Chinese (Simplified) translation. Respond with one line per segment in the format: INDEX|CHINESE\n\n${segmentList}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: translationPrompt }],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const translationText = completion.choices[0]?.message?.content ?? "";
  const translationMap = new Map<number, string>();
  for (const line of translationText.split("\n")) {
    const match = line.match(/^(\d+)\|(.+)/);
    if (match) {
      translationMap.set(parseInt(match[1], 10), match[2].trim());
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
