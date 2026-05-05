import { eq, desc, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users, conversations, messages, practiceWords, phraseLists, phraseListItems, mediaItems,
  type User, type InsertUser,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type PracticeWord, type InsertPracticeWord,
  type PhraseList, type InsertPhraseList,
  type PhraseListItem, type InsertPhraseListItem,
  type MediaItem, type InsertMediaItem,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Conversations
  getConversation(id: string, userId: string): Promise<Conversation | undefined>;
  getConversations(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;

  // Messages
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Practice Words (legacy)
  getPracticeWords(userId: string): Promise<PracticeWord[]>;
  createPracticeWord(word: InsertPracticeWord): Promise<PracticeWord>;
  deletePracticeWord(id: string, userId: string): Promise<void>;

  // Phrase Lists
  getPhraseLists(userId: string): Promise<PhraseList[]>;
  getPhraseList(id: string, userId: string): Promise<PhraseList | undefined>;
  createPhraseList(list: InsertPhraseList): Promise<PhraseList>;
  updatePhraseList(id: string, updates: Partial<PhraseList>, userId: string): Promise<PhraseList>;
  deletePhraseList(id: string, userId: string): Promise<void>;

  // Phrase List Items
  getPhraseListItems(listId: string): Promise<PhraseListItem[]>;
  createPhraseListItem(item: InsertPhraseListItem): Promise<PhraseListItem>;
  updatePhraseListItem(id: string, updates: Partial<PhraseListItem>): Promise<PhraseListItem>;
  deletePhraseListItem(id: string): Promise<void>;

  // Media Items
  getMediaItems(userId: string): Promise<MediaItem[]>;
  getMediaItem(id: string, userId: string): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  deleteMediaItem(id: string, userId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // ─── Users ────────────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  async getConversation(id: string, userId: string): Promise<Conversation | undefined> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv || conv.userId !== userId) return undefined;
    return conv;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({
      ...insertConversation,
      difficulty: insertConversation.difficulty as 'Beginner' | 'Intermediate' | 'Advanced' | null | undefined,
    }).returning();
    return conv;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const [conv] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    if (!conv) throw new Error(`Conversation ${id} not found`);
    return conv;
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values({
      ...insertMessage,
      isUser: insertMessage.isUser as 0 | 1,
    }).returning();
    // Update conversation message count
    const convMessages = await this.getMessagesByConversationId(insertMessage.conversationId);
    await db
      .update(conversations)
      .set({ messageCount: convMessages.length, updatedAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    return msg;
  }

  // ─── Practice Words ───────────────────────────────────────────────────────

  async getPracticeWords(userId: string): Promise<PracticeWord[]> {
    return db
      .select()
      .from(practiceWords)
      .where(eq(practiceWords.userId, userId))
      .orderBy(desc(practiceWords.createdAt));
  }

  async createPracticeWord(insertWord: InsertPracticeWord): Promise<PracticeWord> {
    const [word] = await db.insert(practiceWords).values(insertWord).returning();
    return word;
  }

  async deletePracticeWord(id: string, userId: string): Promise<void> {
    await db
      .delete(practiceWords)
      .where(eq(practiceWords.id, id));
  }

  // ─── Phrase Lists ─────────────────────────────────────────────────────────

  async getPhraseLists(userId: string): Promise<PhraseList[]> {
    return db
      .select()
      .from(phraseLists)
      .where(eq(phraseLists.userId, userId))
      .orderBy(desc(phraseLists.createdAt));
  }

  async getPhraseList(id: string, userId: string): Promise<PhraseList | undefined> {
    const [list] = await db.select().from(phraseLists).where(eq(phraseLists.id, id));
    if (!list || list.userId !== userId) return undefined;
    return list;
  }

  async createPhraseList(insertList: InsertPhraseList): Promise<PhraseList> {
    const [list] = await db.insert(phraseLists).values(insertList).returning();
    return list;
  }

  async updatePhraseList(id: string, updates: Partial<PhraseList>, userId: string): Promise<PhraseList> {
    const [list] = await db
      .update(phraseLists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(phraseLists.id, id))
      .returning();
    if (!list) throw new Error(`Phrase list ${id} not found`);
    return list;
  }

  async deletePhraseList(id: string, userId: string): Promise<void> {
    await db.delete(phraseLists).where(eq(phraseLists.id, id));
  }

  // ─── Phrase List Items ────────────────────────────────────────────────────

  async getPhraseListItems(listId: string): Promise<PhraseListItem[]> {
    return db
      .select()
      .from(phraseListItems)
      .where(eq(phraseListItems.listId, listId))
      .orderBy(asc(phraseListItems.createdAt));
  }

  async createPhraseListItem(insertItem: InsertPhraseListItem): Promise<PhraseListItem> {
    const [item] = await db.insert(phraseListItems).values(insertItem).returning();
    return item;
  }

  async updatePhraseListItem(id: string, updates: Partial<PhraseListItem>): Promise<PhraseListItem> {
    const [item] = await db
      .update(phraseListItems)
      .set(updates)
      .where(eq(phraseListItems.id, id))
      .returning();
    if (!item) throw new Error(`Phrase list item ${id} not found`);
    return item;
  }

  async deletePhraseListItem(id: string): Promise<void> {
    await db.delete(phraseListItems).where(eq(phraseListItems.id, id));
  }

  // ─── Media Items ──────────────────────────────────────────────────────────

  async getMediaItems(userId: string): Promise<MediaItem[]> {
    return db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.userId, userId))
      .orderBy(desc(mediaItems.uploadedAt));
  }

  async getMediaItem(id: string, userId: string): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    if (!item || item.userId !== userId) return undefined;
    return item;
  }

  async createMediaItem(insertItem: InsertMediaItem): Promise<MediaItem> {
    const [item] = await db.insert(mediaItems).values({
      userId: insertItem.userId,
      type: insertItem.type as 'image' | 'video' | 'audio',
      originalName: insertItem.originalName,
      mimeType: insertItem.mimeType,
      fileUrl: insertItem.fileUrl,
      ocrBlocks: (insertItem.ocrBlocks ?? null) as any,
      captions: (insertItem.captions ?? null) as any,
    }).returning();
    return item;
  }

  async deleteMediaItem(id: string, userId: string): Promise<void> {
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  }
}

export const storage = new DbStorage();
