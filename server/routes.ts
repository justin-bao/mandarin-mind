import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { mandarinTutorService } from "./openai";
import { lookupPhrase, translateSentence } from "./translation";
import { runOCR, generateCaptions } from "./media";
import { insertConversationSchema, insertMessageSchema, insertPracticeWordSchema, insertPhraseListSchema, insertPhraseListItemSchema } from "@shared/schema";

// ─── Uploads directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Multer: audio (memory) for conversation audio endpoint ──────────────────
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Only audio files are allowed"));
  },
});

// ─── Multer: image/video/audio (disk) for media endpoints ────────────────────
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image, video, or audio files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    next();
  }, ((_req: Request, _res: Response, next: any) => next()) as any);

  // ─── Conversations ────────────────────────────────────────────────────────
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // ─── Messages ─────────────────────────────────────────────────────────────
  app.get("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const messages = await storage.getMessagesByConversationId(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Process audio input for conversation
  app.post("/api/conversations/:id/audio", audioUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const transcription = await mandarinTutorService.transcribeAudio(req.file.buffer);
      const userTranslation = await mandarinTutorService.addPinyinAndTranslation(transcription.text);

      const userMessage = await storage.createMessage({
        conversationId,
        text: transcription.text,
        pinyin: userTranslation.pinyin,
        translation: userTranslation.english,
        isUser: 1,
        audioUrl: null,
      });

      const messages = await storage.getMessagesByConversationId(conversationId);
      const conversationHistory = messages.slice(-6).map((msg) => ({
        role: msg.isUser ? ("user" as const) : ("assistant" as const),
        content: msg.text,
      }));

      const context = {
        topic: conversation.topic || undefined,
        topicZh: conversation.topicZh || undefined,
        difficulty: conversation.difficulty || ("Beginner" as const),
      };

      const aiResponse = await mandarinTutorService.generateResponse(
        transcription.text,
        context,
        conversationHistory
      );

      const aiTranslation = await mandarinTutorService.addPinyinAndTranslation(aiResponse.chinese);
      const audioBuffer = await mandarinTutorService.generateSpeech(aiResponse.chinese);
      const audioBase64 = audioBuffer.toString("base64");

      const aiMessage = await storage.createMessage({
        conversationId,
        text: aiResponse.chinese,
        pinyin: aiTranslation.pinyin,
        translation: aiTranslation.english,
        isUser: 0,
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error processing audio:", error);
      res.status(500).json({ error: "Failed to process audio" });
    }
  });

  // ─── Practice Words ───────────────────────────────────────────────────────
  app.get("/api/practice-words", async (req: Request, res: Response) => {
    try {
      const words = await storage.getPracticeWords();
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch practice words" });
    }
  });

  app.post("/api/practice-words", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPracticeWordSchema.parse(req.body);
      const word = await storage.createPracticeWord(validatedData);
      res.json(word);
    } catch (error) {
      res.status(400).json({ error: "Failed to create practice word" });
    }
  });

  app.delete("/api/practice-words/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePracticeWord(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete practice word" });
    }
  });

  // ─── Phrase Lists ─────────────────────────────────────────────────────────
  app.get("/api/phrase-lists", async (req: Request, res: Response) => {
    try {
      const lists = await storage.getPhraseLists();
      const listsWithCount = await Promise.all(
        lists.map(async (list) => {
          const items = await storage.getPhraseListItems(list.id);
          return { ...list, itemCount: items.length };
        })
      );
      res.json(listsWithCount);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phrase lists" });
    }
  });

  app.post("/api/phrase-lists", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPhraseListSchema.parse(req.body);
      const list = await storage.createPhraseList(validatedData);
      res.json(list);
    } catch (error) {
      res.status(400).json({ error: "Failed to create phrase list" });
    }
  });

  app.get("/api/phrase-lists/:id", async (req: Request, res: Response) => {
    try {
      const list = await storage.getPhraseList(req.params.id);
      if (!list) return res.status(404).json({ error: "Phrase list not found" });
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phrase list" });
    }
  });

  app.patch("/api/phrase-lists/:id", async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const list = await storage.updatePhraseList(req.params.id, { name, description });
      res.json(list);
    } catch (error) {
      res.status(400).json({ error: "Failed to update phrase list" });
    }
  });

  app.delete("/api/phrase-lists/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePhraseList(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete phrase list" });
    }
  });

  // ─── Phrase List Items ────────────────────────────────────────────────────
  app.get("/api/phrase-lists/:id/items", async (req: Request, res: Response) => {
    try {
      const items = await storage.getPhraseListItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phrase list items" });
    }
  });

  app.post("/api/phrase-lists/:id/items", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPhraseListItemSchema.parse({ ...req.body, listId: req.params.id });
      const item = await storage.createPhraseListItem(validatedData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to create phrase list item" });
    }
  });

  app.patch("/api/phrase-lists/:listId/items/:itemId", async (req: Request, res: Response) => {
    try {
      const item = await storage.updatePhraseListItem(req.params.itemId, req.body);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to update phrase list item" });
    }
  });

  app.delete("/api/phrase-lists/:listId/items/:itemId", async (req: Request, res: Response) => {
    try {
      await storage.deletePhraseListItem(req.params.itemId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete phrase list item" });
    }
  });

  // ─── Example sentence + translate + lookup + audio ───────────────────────
  app.post("/api/phrases/example-sentence", async (req: Request, res: Response) => {
    try {
      const { chinese, english } = req.body;
      if (!chinese || !english) {
        return res.status(400).json({ error: "chinese and english are required" });
      }
      const result = await mandarinTutorService.generateExampleSentence(chinese.trim(), english.trim());
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate example sentence" });
    }
  });

  app.post("/api/translate/sentence", async (req: Request, res: Response) => {
    try {
      const { text, direction } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }
      const dir = direction === "en-zh" ? "en-zh" : "zh-en";
      const result = await translateSentence(text.trim(), dir);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to translate sentence" });
    }
  });

  app.post("/api/phrases/lookup", async (req: Request, res: Response) => {
    try {
      const { chinese } = req.body;
      if (!chinese || typeof chinese !== "string") {
        return res.status(400).json({ error: "Chinese text is required" });
      }
      const result = await lookupPhrase(chinese.trim());
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to look up phrase" });
    }
  });

  app.post("/api/audio/generate", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "No text provided" });
      const audioBuffer = await mandarinTutorService.generateSpeech(text);
      const audioBase64 = audioBuffer.toString("base64");
      res.json({ audioUrl: `data:audio/mp3;base64,${audioBase64}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // ─── Media: list + delete ─────────────────────────────────────────────────
  app.get("/api/media", async (req: Request, res: Response) => {
    try {
      const items = await storage.getMediaItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });

  app.delete("/api/media/:id", async (req: Request, res: Response) => {
    try {
      const item = await storage.getMediaItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Media item not found" });

      // Delete file from disk
      const filePath = path.join(process.cwd(), item.fileUrl.replace(/^\//, ""));
      try {
        fs.unlinkSync(filePath);
      } catch {
        // File already gone — continue
      }

      await storage.deleteMediaItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media item" });
    }
  });

  // ─── Media: upload image (OCR) ────────────────────────────────────────────
  app.post("/api/media/upload/image", mediaUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });

      const fileUrl = `/uploads/${req.file.filename}`;
      const filePath = req.file.path;

      // Run Tesseract OCR
      let ocrBlocks = null;
      try {
        ocrBlocks = await runOCR(filePath);
      } catch (ocrErr) {
        console.error("OCR error (continuing without blocks):", ocrErr);
      }

      const item = await storage.createMediaItem({
        type: "image",
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileUrl,
        ocrBlocks,
      });

      res.json(item);
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  // ─── Media: upload video/audio (captions) ────────────────────────────────
  app.post("/api/media/upload/video", mediaUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });

      const fileUrl = `/uploads/${req.file.filename}`;
      const filePath = req.file.path;
      const isVideo = req.file.mimetype.startsWith("video/");

      let captions = null;
      try {
        captions = await generateCaptions(filePath, req.file.mimetype);
      } catch (captionErr) {
        console.error("Caption generation error (continuing without captions):", captionErr);
      }

      const item = await storage.createMediaItem({
        type: isVideo ? "video" : "audio",
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileUrl,
        captions,
      });

      res.json(item);
    } catch (error) {
      console.error("Video/audio upload error:", error);
      res.status(500).json({ error: "Failed to process media file" });
    }
  });

  // ─── Static file serving for uploads ─────────────────────────────────────
  app.use("/uploads", (req: Request, res: Response) => {
    const safeName = path.basename(req.path);
    const filePath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
