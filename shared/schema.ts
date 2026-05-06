import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic"),
  topicZh: text("topic_zh"),
  difficulty: text("difficulty").$type<'Beginner' | 'Intermediate' | 'Advanced'>(),
  duration: integer("duration").default(0),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  pinyin: text("pinyin"),
  translation: text("translation"),
  isUser: integer("is_user").notNull().$type<0 | 1>(),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Practice words table (legacy)
export const practiceWords = pgTable("practice_words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chinese: text("chinese").notNull(),
  pinyin: text("pinyin"),
  english: text("english").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phrase lists table
export const phraseLists = pgTable("phrase_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phrase list items table
export const phraseListItems = pgTable("phrase_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => phraseLists.id, { onDelete: "cascade" }),
  chinese: text("chinese").notNull(),
  pinyin: text("pinyin"),
  english: text("english").notNull(),
  exampleSentences: text("example_sentences"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Media items table
export const mediaItems = pgTable("media_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<'image' | 'video' | 'audio'>(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileUrl: text("file_url").notNull(),
  ocrBlocks: jsonb("ocr_blocks").$type<OcrBlock[]>(),
  captions: jsonb("captions").$type<Caption[]>(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Flashcard sessions table
export const flashcardSessions = pgTable("flashcard_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Flashcard session cards table
export const flashcardSessionCards = pgTable("flashcard_session_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => flashcardSessions.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  chinese: text("chinese").notNull(),
  pinyin: text("pinyin"),
  english: text("english").notNull(),
  sourceListId: varchar("source_list_id"),
  status: text("status").notNull().$type<'known' | 'unknown' | 'pending'>().default("pending"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Insert schemas ────────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeWordSchema = createInsertSchema(practiceWords).omit({
  id: true,
  createdAt: true,
});

export const insertPhraseListSchema = createInsertSchema(phraseLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhraseListItemSchema = createInsertSchema(phraseListItems).omit({
  id: true,
  createdAt: true,
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({
  id: true,
  uploadedAt: true,
});

export const insertFlashcardSessionSchema = createInsertSchema(flashcardSessions).omit({
  id: true,
  startedAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertFlashcardSessionCardSchema = createInsertSchema(flashcardSessionCards).omit({
  id: true,
  sessionId: true,
  updatedAt: true,
});

// ─── Types ─────────────────────────────────────────────────────────────────────

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPracticeWord = z.infer<typeof insertPracticeWordSchema>;
export type InsertPhraseList = z.infer<typeof insertPhraseListSchema>;
export type InsertPhraseListItem = z.infer<typeof insertPhraseListItemSchema>;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type InsertFlashcardSession = z.infer<typeof insertFlashcardSessionSchema>;
export type InsertFlashcardSessionCard = z.infer<typeof insertFlashcardSessionCardSchema>;

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PracticeWord = typeof practiceWords.$inferSelect;
export type PhraseList = typeof phraseLists.$inferSelect;
export type PhraseListItem = typeof phraseListItems.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type FlashcardSession = typeof flashcardSessions.$inferSelect;
export type FlashcardSessionCard = typeof flashcardSessionCards.$inferSelect;

// ─── Media sub-types ───────────────────────────────────────────────────────────

export interface OcrBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface Caption {
  startMs: number;
  endMs: number;
  chinese: string;
  english: string;
}
