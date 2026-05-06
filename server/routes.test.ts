// @vitest-environment node
import express, { type Request, type Response, type NextFunction } from "express";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getConversations: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getMessagesByConversationId: vi.fn(),
  createMessage: vi.fn(),
  getPracticeWords: vi.fn(),
  createPracticeWord: vi.fn(),
  deletePracticeWord: vi.fn(),
  getPhraseLists: vi.fn(),
  getPhraseList: vi.fn(),
  createPhraseList: vi.fn(),
  updatePhraseList: vi.fn(),
  deletePhraseList: vi.fn(),
  getPhraseListItems: vi.fn(),
  getPhraseListItem: vi.fn(),
  createPhraseListItem: vi.fn(),
  updatePhraseListItem: vi.fn(),
  deletePhraseListItem: vi.fn(),
  getMediaItems: vi.fn(),
  getMediaItem: vi.fn(),
  getMediaItemByFileUrl: vi.fn(),
  createMediaItem: vi.fn(),
  deleteMediaItem: vi.fn(),
}));

vi.mock("./storage.js", () => ({ storage: storageMock }));

vi.mock("./openai.js", () => ({
  mandarinTutorService: {
    transcribeAudio: vi.fn().mockResolvedValue({ text: "你好", language: "zh" }),
    addPinyinAndTranslation: vi
      .fn()
      .mockResolvedValueOnce({ pinyin: "nǐ hǎo", english: "hello" })
      .mockResolvedValue({ pinyin: "wǒ hěn hǎo", english: "I am very good" }),
    generateResponse: vi.fn().mockResolvedValue({ chinese: "我很好", pinyin: "", english: "" }),
    generateSpeech: vi.fn().mockResolvedValue(Buffer.from("mp3-data")),
    generateExampleSentence: vi.fn().mockResolvedValue({
      sentence: "我喜欢喝茶。",
      pinyin: "wǒ xǐ huan hē chá.",
      translation: "I like drinking tea.",
    }),
  },
}));

vi.mock("./translation.js", () => ({
  lookupPhrase: vi.fn().mockResolvedValue({ pinyin: "nǐ hǎo", english: "hello" }),
  translateSentence: vi.fn().mockResolvedValue({
    tokens: [{ char: "你", pinyin: "nǐ" }],
    chinese: "你好",
    translation: "hello",
  }),
}));

vi.mock("./media.js", () => ({
  runOCR: vi.fn().mockResolvedValue([{ text: "菜单", x: 0, y: 0, width: 20, height: 10, confidence: 0.95 }]),
  generateCaptions: vi.fn().mockResolvedValue([{ startMs: 0, endMs: 1000, chinese: "你好", english: "hello" }]),
}));

vi.mock("passport", () => ({
  default: {
    authenticate:
      (_strategy: string, callback: (err: unknown, user: unknown, info?: { message: string }) => void) =>
      (req: Request, _res: Response, _next: NextFunction) => {
        if (req.body.email === "user@example.com" && req.body.password === "correct-password") {
          callback(null, { id: "user-1", email: "user@example.com", createdAt: null });
          return;
        }
        callback(null, false, { message: "Invalid email or password" });
      },
  },
}));

process.env.UPLOADS_DIR = path.join(os.tmpdir(), `mandarin-mind-test-uploads-${process.pid}`);

const { registerRoutes } = await import("./routes.js");

async function buildApp(authenticated = true) {
  const app = express();
  let isAuthenticated = authenticated;
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.isAuthenticated = () => isAuthenticated;
    req.user = { id: "user-1", email: "user@example.com", createdAt: null };
    req.login = (user: Express.User, done: (err?: unknown) => void) => {
      req.user = user;
      isAuthenticated = true;
      done();
    };
    req.logout = (done: (err?: unknown) => void) => {
      isAuthenticated = false;
      done();
    };
    req.session = {
      destroy: (done: (err?: unknown) => void) => {
        isAuthenticated = false;
        done();
      },
    } as Request["session"];
    next();
  });
  await registerRoutes(app);
  return app;
}

beforeEach(() => {
  Object.values(storageMock).forEach((mock) => mock.mockReset());
  storageMock.getUserByEmail.mockResolvedValue(undefined);
  storageMock.createUser.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hashed-password",
    createdAt: null,
  });
  storageMock.getConversations.mockResolvedValue([]);
  storageMock.createConversation.mockResolvedValue({
    id: "conv-1",
    userId: "user-1",
    topic: "Dining",
    topicZh: "用餐",
    difficulty: "Beginner",
    duration: 0,
    messageCount: 0,
    createdAt: null,
    updatedAt: null,
  });
  storageMock.getConversation.mockResolvedValue({
    id: "conv-1",
    userId: "user-1",
    topic: "Dining",
    topicZh: "用餐",
    difficulty: "Beginner",
    duration: 0,
    messageCount: 0,
    createdAt: null,
    updatedAt: null,
  });
  storageMock.getMessagesByConversationId.mockResolvedValue([]);
  storageMock.createMessage
    .mockResolvedValueOnce({
      id: "msg-user",
      conversationId: "conv-1",
      text: "你好",
      pinyin: "nǐ hǎo",
      translation: "hello",
      isUser: 1,
      audioUrl: null,
      createdAt: null,
    })
    .mockResolvedValue({
      id: "msg-ai",
      conversationId: "conv-1",
      text: "我很好",
      pinyin: "wǒ hěn hǎo",
      translation: "I am very good",
      isUser: 0,
      audioUrl: "data:audio/mp3;base64,bXAzLWRhdGE=",
      createdAt: null,
    });
  storageMock.getPracticeWords.mockResolvedValue([]);
  storageMock.createPracticeWord.mockImplementation(async (word) => ({ id: "word-1", createdAt: null, ...word }));
  storageMock.getPhraseLists.mockResolvedValue([{ id: "list-1", userId: "user-1", name: "Travel", description: null }]);
  storageMock.getPhraseList.mockResolvedValue({ id: "list-1", userId: "user-1", name: "Travel", description: null });
  storageMock.createPhraseList.mockImplementation(async (list) => ({ id: "list-1", createdAt: null, updatedAt: null, ...list }));
  storageMock.updatePhraseList.mockImplementation(async (_id, updates) => ({ id: "list-1", userId: "user-1", ...updates }));
  storageMock.getPhraseListItems.mockResolvedValue([]);
  storageMock.getPhraseListItem.mockResolvedValue({ id: "item-1", listId: "list-1", chinese: "你好", english: "hello" });
  storageMock.createPhraseListItem.mockImplementation(async (item) => ({ id: "item-1", createdAt: null, ...item }));
  storageMock.updatePhraseListItem.mockImplementation(async (_id, listId, updates) => ({ id: "item-1", listId, ...updates }));
  storageMock.getMediaItems.mockResolvedValue([]);
  storageMock.getMediaItem.mockResolvedValue({ id: "media-1", userId: "user-1", fileUrl: "/uploads/a.png" });
  storageMock.createMediaItem.mockImplementation(async (item) => ({ id: "media-1", uploadedAt: null, ...item }));
});

describe("API route integration", () => {
  it("rejects protected routes when the request is not authenticated", async () => {
    const res = await request(await buildApp(false)).get("/api/conversations");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("registers a user with normalized email and omits passwordHash from the response", async () => {
    const res = await request(await buildApp(false))
      .post("/api/auth/register")
      .send({ email: "USER@EXAMPLE.COM", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(storageMock.getUserByEmail).toHaveBeenCalledWith("user@example.com");
    expect(storageMock.createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      passwordHash: expect.any(String),
    });
    expect(res.body).toEqual({ id: "user-1", email: "user@example.com", createdAt: null });
  });

  it("logs in valid credentials and rejects invalid credentials", async () => {
    const ok = await request(await buildApp(false))
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "correct-password" });
    const bad = await request(await buildApp(false))
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "wrong-password" });

    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe("user@example.com");
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("Invalid email or password");
  });

  it("creates conversations and guards message access by conversation ownership", async () => {
    const app = await buildApp(true);
    const created = await request(app)
      .post("/api/conversations")
      .send({ topic: "Dining", topicZh: "用餐", difficulty: "Beginner" });
    const messages = await request(app).get("/api/conversations/conv-1/messages");

    expect(created.status).toBe(200);
    expect(storageMock.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", topic: "Dining" })
    );
    expect(messages.status).toBe(200);
    expect(storageMock.getConversation).toHaveBeenCalledWith("conv-1", "user-1");
  });

  it("processes the conversation audio flow into user and assistant messages", async () => {
    const res = await request(await buildApp(true))
      .post("/api/conversations/conv-1/audio")
      .attach("audio", Buffer.from("audio"), { filename: "voice.webm", contentType: "audio/webm" });

    expect(res.status).toBe(200);
    expect(res.body.userMessage.text).toBe("你好");
    expect(res.body.aiMessage.audioUrl).toMatch(/^data:audio\/mp3;base64,/);
    expect(storageMock.createMessage).toHaveBeenCalledTimes(2);
  });

  it("runs phrase list and item CRUD routes for the authenticated user", async () => {
    const app = await buildApp(true);
    const list = await request(app).post("/api/phrase-lists").send({ name: "Travel" });
    const item = await request(app)
      .post("/api/phrase-lists/list-1/items")
      .send({ chinese: "你好", pinyin: "nǐ hǎo", english: "hello" });
    const updated = await request(app)
      .patch("/api/phrase-lists/list-1/items/item-1")
      .send({ english: "hi" });
    const deleted = await request(app).delete("/api/phrase-lists/list-1/items/item-1");

    expect(list.status).toBe(200);
    expect(item.status).toBe(200);
    expect(updated.body.english).toBe("hi");
    expect(deleted.body).toEqual({ success: true });
  });

  it("serves translation, lookup, example sentence, audio, and media list helpers", async () => {
    const app = await buildApp(true);
    const lookup = await request(app).post("/api/phrases/lookup").send({ chinese: "你好" });
    const sentence = await request(app).post("/api/translate/sentence").send({ text: "你好" });
    const example = await request(app).post("/api/phrases/example-sentence").send({ chinese: "茶", english: "tea" });
    const audio = await request(app).post("/api/audio/generate").send({ text: "你好" });
    const media = await request(app).get("/api/media");

    expect(lookup.body.english).toBe("hello");
    expect(sentence.body.translation).toBe("hello");
    expect(example.body.sentence).toBe("我喜欢喝茶。");
    expect(audio.body.audioUrl).toMatch(/^data:audio\/mp3;base64,/);
    expect(media.body).toEqual([]);
  });

  it("streams image upload progress and persists the OCR media item", async () => {
    const res = await request(await buildApp(true))
      .post("/api/media/upload/image")
      .attach("file", Buffer.from("fake image"), { filename: "menu.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("event: progress");
    expect(res.text).toContain("event: complete");
    expect(storageMock.createMediaItem).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "image", originalName: "menu.png" })
    );
  });
});
