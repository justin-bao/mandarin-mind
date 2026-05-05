import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import passport from "passport";
import { storage } from "./storage";
import { mandarinTutorService } from "./openai";
import { lookupPhrase, translateSentence } from "./translation";
import { runOCR, generateCaptions } from "./media";
import {
  insertConversationSchema,
  insertMessageSchema,
  insertPracticeWordSchema,
  insertPhraseListSchema,
  insertPhraseListItemSchema,
} from "@shared/schema";
import { z } from "zod";

// ─── Uploads directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
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
  limits: { fileSize: 100 * 1024 * 1024 },
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
  // Serve uploaded files
  app.use("/uploads", (req: Request, res: Response, next) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    next();
  });

  // ─── Auth endpoints (no requireAuth) ─────────────────────────────────────

  const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = registerSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      const existing = await storage.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: "An account with that email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ email: normalizedEmail, passwordHash });
      const { passwordHash: _, ...safeUser } = user;

      req.login(safeUser, (err) => {
        if (err) return res.status(500).json({ error: "Login after register failed" });
        res.json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Invalid email or password" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    res.json(req.user);
  });

  // ─── Conversations ────────────────────────────────────────────────────────
  app.get("/api/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const convs = await storage.getConversations(req.user!.id);
      res.json(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse({ ...req.body, userId: req.user!.id });
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id, req.user!.id);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // ─── Messages ─────────────────────────────────────────────────────────────
  app.get("/api/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id, req.user!.id);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      const msgs = await storage.getMessagesByConversationId(req.params.id);
      res.json(msgs);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/audio", requireAuth, audioUpload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No audio file provided" });

      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId, req.user!.id);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

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

      const msgs = await storage.getMessagesByConversationId(conversationId);
      const conversationHistory = msgs.slice(-6).map((msg) => ({
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
  app.get("/api/practice-words", requireAuth, async (req: Request, res: Response) => {
    try {
      const words = await storage.getPracticeWords(req.user!.id);
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch practice words" });
    }
  });

  app.post("/api/practice-words", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPracticeWordSchema.parse({ ...req.body, userId: req.user!.id });
      const word = await storage.createPracticeWord(validatedData);
      res.json(word);
    } catch (error) {
      res.status(400).json({ error: "Failed to create practice word" });
    }
  });

  app.delete("/api/practice-words/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deletePracticeWord(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete practice word" });
    }
  });

  // ─── Phrase Lists ─────────────────────────────────────────────────────────
  app.get("/api/phrase-lists", requireAuth, async (req: Request, res: Response) => {
    try {
      const lists = await storage.getPhraseLists(req.user!.id);
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

  app.post("/api/phrase-lists", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPhraseListSchema.parse({ ...req.body, userId: req.user!.id });
      const list = await storage.createPhraseList(validatedData);
      res.json(list);
    } catch (error) {
      res.status(400).json({ error: "Failed to create phrase list" });
    }
  });

  app.get("/api/phrase-lists/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const list = await storage.getPhraseList(req.params.id, req.user!.id);
      if (!list) return res.status(404).json({ error: "Phrase list not found" });
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phrase list" });
    }
  });

  app.patch("/api/phrase-lists/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const list = await storage.updatePhraseList(req.params.id, { name, description }, req.user!.id);
      res.json(list);
    } catch (error) {
      res.status(400).json({ error: "Failed to update phrase list" });
    }
  });

  app.delete("/api/phrase-lists/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deletePhraseList(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete phrase list" });
    }
  });

  // ─── Phrase List Items ────────────────────────────────────────────────────
  app.get("/api/phrase-lists/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const list = await storage.getPhraseList(req.params.id, req.user!.id);
      if (!list) return res.status(404).json({ error: "Phrase list not found" });
      const items = await storage.getPhraseListItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phrase list items" });
    }
  });

  app.post("/api/phrase-lists/:id/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const list = await storage.getPhraseList(req.params.id, req.user!.id);
      if (!list) return res.status(404).json({ error: "Phrase list not found" });
      const validatedData = insertPhraseListItemSchema.parse({ ...req.body, listId: req.params.id });
      const item = await storage.createPhraseListItem(validatedData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to create phrase list item" });
    }
  });

  app.patch("/api/phrase-lists/:listId/items/:itemId", requireAuth, async (req: Request, res: Response) => {
    try {
      const list = await storage.getPhraseList(req.params.listId, req.user!.id);
      if (!list) return res.status(404).json({ error: "Phrase list not found" });
      const existing = await storage.getPhraseListItem(req.params.itemId, req.params.listId);
      if (!existing) return res.status(404).json({ error: "Item not found in this list" });
      const item = await storage.updatePhraseListItem(req.params.itemId, req.params.listId, req.body);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to update phrase list item" });
    }
  });

  app.delete("/api/phrase-lists/:listId/items/:itemId", requireAuth, async (req: Request, res: Response) => {
    try {
      const list = await storage.getPhraseList(req.params.listId, req.user!.id);
      if (!list) return res.status(404).json({ error: "Phrase list not found" });
      const existing = await storage.getPhraseListItem(req.params.itemId, req.params.listId);
      if (!existing) return res.status(404).json({ error: "Item not found in this list" });
      await storage.deletePhraseListItem(req.params.itemId, req.params.listId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete phrase list item" });
    }
  });

  // ─── Example sentence + translate + lookup + audio ───────────────────────
  app.post("/api/phrases/example-sentence", requireAuth, async (req: Request, res: Response) => {
    try {
      const { chinese, english } = req.body;
      if (!chinese || !english) return res.status(400).json({ error: "chinese and english are required" });
      const result = await mandarinTutorService.generateExampleSentence(chinese.trim(), english.trim());
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate example sentence" });
    }
  });

  app.post("/api/translate/sentence", requireAuth, async (req: Request, res: Response) => {
    try {
      const { text, direction } = req.body;
      if (!text || typeof text !== "string") return res.status(400).json({ error: "text is required" });
      const dir = direction === "en-zh" ? "en-zh" : "zh-en";
      const result = await translateSentence(text.trim(), dir);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to translate sentence" });
    }
  });

  app.post("/api/phrases/lookup", requireAuth, async (req: Request, res: Response) => {
    try {
      const { chinese } = req.body;
      if (!chinese || typeof chinese !== "string") return res.status(400).json({ error: "Chinese text is required" });
      const result = await lookupPhrase(chinese.trim());
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to look up phrase" });
    }
  });

  app.post("/api/audio/generate", requireAuth, async (req: Request, res: Response) => {
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
  app.get("/api/media", requireAuth, async (req: Request, res: Response) => {
    try {
      const items = await storage.getMediaItems(req.user!.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });

  app.delete("/api/media/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const item = await storage.getMediaItem(req.params.id, req.user!.id);
      if (!item) return res.status(404).json({ error: "Media item not found" });

      const filePath = path.join(UPLOADS_DIR, path.basename(item.fileUrl));
      try { fs.unlinkSync(filePath); } catch { /* already gone */ }

      await storage.deleteMediaItem(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media item" });
    }
  });

  // ─── SSE helper ───────────────────────────────────────────────────────────
  function sendSSE(res: Response, event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // ─── Media: upload image (OCR) — SSE progress stream ─────────────────────
  app.post("/api/media/upload/image", requireAuth, mediaUpload.single("file"), async (req: Request, res: Response) => {
    let uploadedPath: string | undefined;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      if (!req.file) {
        sendSSE(res, "error", { message: "No file provided" });
        return res.end();
      }
      if (!req.file.mimetype.startsWith("image/")) {
        fs.unlinkSync(req.file.path);
        sendSSE(res, "error", { message: "Only image files are accepted by this endpoint" });
        return res.end();
      }
      uploadedPath = req.file.path;
      const fileUrl = `/uploads/${req.file.filename}`;

      sendSSE(res, "progress", { step: "uploading", status: "done" });
      sendSSE(res, "progress", { step: "scanning", status: "in-progress" });

      const ocrBlocks = await runOCR(uploadedPath, (step) => {
        if (step === "extracting") {
          sendSSE(res, "progress", { step: "scanning", status: "done" });
          sendSSE(res, "progress", { step: "extracting", status: "in-progress" });
        }
      });

      sendSSE(res, "progress", { step: "extracting", status: "done" });

      const item = await storage.createMediaItem({
        userId: req.user!.id,
        type: "image",
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileUrl,
        ocrBlocks: ocrBlocks ?? null,
        captions: null,
      });

      sendSSE(res, "complete", { item });
    } catch (error) {
      console.error("Image upload/OCR error:", error);
      if (uploadedPath) { try { fs.unlinkSync(uploadedPath); } catch { /* gone */ } }
      const message = error instanceof Error ? error.message : "Failed to process image";
      sendSSE(res, "error", { message });
    } finally {
      res.end();
    }
  });

  // ─── Media: upload video/audio (captions) — SSE progress stream ──────────
  app.post("/api/media/upload/video", requireAuth, mediaUpload.single("file"), async (req: Request, res: Response) => {
    let uploadedPath: string | undefined;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      if (!req.file) {
        sendSSE(res, "error", { message: "No file provided" });
        return res.end();
      }
      if (!req.file.mimetype.startsWith("video/") && !req.file.mimetype.startsWith("audio/")) {
        fs.unlinkSync(req.file.path);
        sendSSE(res, "error", { message: "Only video or audio files are accepted by this endpoint" });
        return res.end();
      }
      if (!process.env.GROQ_API_KEY) {
        fs.unlinkSync(req.file.path);
        sendSSE(res, "error", { message: "Caption generation is unavailable: GROQ_API_KEY is not set. Add your key at https://console.groq.com" });
        return res.end();
      }

      uploadedPath = req.file.path;
      const fileUrl = `/uploads/${req.file.filename}`;
      const isVideo = req.file.mimetype.startsWith("video/");

      sendSSE(res, "progress", { step: "uploading", status: "done" });
      sendSSE(res, "progress", { step: "transcribing", status: "in-progress" });

      const captions = await generateCaptions(uploadedPath, (step) => {
        if (step === "translating") {
          sendSSE(res, "progress", { step: "transcribing", status: "done" });
          sendSSE(res, "progress", { step: "translating", status: "in-progress" });
        }
      });

      sendSSE(res, "progress", { step: "translating", status: "done" });

      const item = await storage.createMediaItem({
        userId: req.user!.id,
        type: isVideo ? "video" : "audio",
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileUrl,
        ocrBlocks: null,
        captions: captions ?? null,
      });

      sendSSE(res, "complete", { item });
    } catch (error) {
      console.error("Video/audio upload error:", error);
      if (uploadedPath) { try { fs.unlinkSync(uploadedPath); } catch { /* gone */ } }
      const message = error instanceof Error ? error.message : "Failed to process media file";
      sendSSE(res, "error", { message });
    } finally {
      res.end();
    }
  });

  // Authenticated media file delivery — verifies caller owns the media item before streaming
  app.get("/uploads/:filename", requireAuth, async (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(UPLOADS_DIR, filename);

      // Verify a media item with this file URL exists and belongs to the caller
      const allItems = await storage.getMediaItems(req.user!.id);
      const owned = allItems.some((item) => item.fileUrl === `/uploads/${filename}`);
      if (!owned) return res.status(403).json({ error: "Forbidden" });

      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
      res.sendFile(filePath, { maxAge: "1d" });
    } catch {
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
