import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topic: text("topic"),
  topicZh: text("topic_zh"),
  difficulty: text("difficulty").$type<'Beginner' | 'Intermediate' | 'Advanced'>(),
  duration: integer("duration").default(0), // in seconds
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
  isUser: integer("is_user").notNull().$type<0 | 1>(), // 0 = AI, 1 = user
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Practice words table (legacy)
export const practiceWords = pgTable("practice_words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chinese: text("chinese").notNull(),
  pinyin: text("pinyin"),
  english: text("english").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phrase lists table
export const phraseLists = pgTable("phrase_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  // JSON-serialised array of { sentence, pinyin, translation } objects
  exampleSentences: text("example_sentences"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema types
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

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPracticeWord = z.infer<typeof insertPracticeWordSchema>;
export type InsertPhraseList = z.infer<typeof insertPhraseListSchema>;
export type InsertPhraseListItem = z.infer<typeof insertPhraseListItemSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PracticeWord = typeof practiceWords.$inferSelect;
export type PhraseList = typeof phraseLists.$inferSelect;
export type PhraseListItem = typeof phraseListItems.$inferSelect;

// ─── Media Items ──────────────────────────────────────────────────────────────

export interface OcrBlock {
  text: string;
  x: number;    // % of image width
  y: number;    // % of image height
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

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  originalName: string;
  mimeType: string;
  fileUrl: string;       // e.g. /uploads/uuid-filename.jpg
  uploadedAt: Date;
  ocrBlocks: OcrBlock[] | null;
  captions: Caption[] | null;
}

export interface InsertMediaItem {
  type: 'image' | 'video' | 'audio';
  originalName: string;
  mimeType: string;
  fileUrl: string;
  ocrBlocks?: OcrBlock[] | null;
  captions?: Caption[] | null;
}
