import { eq, desc, asc, and } from "drizzle-orm";
import { db } from "./db.js";
import {
  users, conversations, messages, practiceWords, phraseLists, phraseListItems, mediaItems,
  flashcardSessions, flashcardSessionCards,
  type User, type InsertUser,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type PracticeWord, type InsertPracticeWord,
  type PhraseList, type InsertPhraseList,
  type PhraseListItem, type InsertPhraseListItem,
  type MediaItem, type InsertMediaItem,
  type FlashcardSession, type InsertFlashcardSession,
  type FlashcardSessionCard, type InsertFlashcardSessionCard,
  type OcrBlock, type Caption,
} from "../shared/schema.js";

export type FlashcardSessionWithCards = FlashcardSession & {
  cards: FlashcardSessionCard[];
};

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  linkUserToGoogle(id: string, googleId: string): Promise<User>;

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
  getPhraseListItem(id: string, listId: string): Promise<PhraseListItem | undefined>;
  createPhraseListItem(item: InsertPhraseListItem): Promise<PhraseListItem>;
  updatePhraseListItem(id: string, listId: string, updates: Partial<PhraseListItem>): Promise<PhraseListItem>;
  deletePhraseListItem(id: string, listId: string): Promise<void>;

  // Media Items
  getMediaItems(userId: string): Promise<MediaItem[]>;
  getMediaItem(id: string, userId: string): Promise<MediaItem | undefined>;
  getMediaItemByFileUrl(fileUrl: string, userId: string): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  deleteMediaItem(id: string, userId: string): Promise<void>;

  // Flashcard Sessions
  getFlashcardSessions(userId: string): Promise<FlashcardSessionWithCards[]>;
  getFlashcardSession(id: string, userId: string): Promise<FlashcardSessionWithCards | undefined>;
  createFlashcardSession(
    session: InsertFlashcardSession,
    cards: Omit<InsertFlashcardSessionCard, "sessionId">[]
  ): Promise<FlashcardSessionWithCards>;
  updateFlashcardSessionCardStatus(
    sessionId: string,
    cardId: string,
    status: "known" | "unknown" | "pending",
    userId: string
  ): Promise<FlashcardSessionCard>;
  completeFlashcardSession(id: string, userId: string): Promise<FlashcardSession>;
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

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async linkUserToGoogle(id: string, googleId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ googleId })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error(`User ${id} not found`);
    return user;
  }

  // ─── Conversations ────────────────────────────────────────────────────────

  async getConversation(id: string, userId: string): Promise<Conversation | undefined> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
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
      .where(and(eq(practiceWords.id, id), eq(practiceWords.userId, userId)));
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
    const [list] = await db
      .select()
      .from(phraseLists)
      .where(and(eq(phraseLists.id, id), eq(phraseLists.userId, userId)));
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
      .where(and(eq(phraseLists.id, id), eq(phraseLists.userId, userId)))
      .returning();
    if (!list) throw new Error(`Phrase list ${id} not found`);
    return list;
  }

  async deletePhraseList(id: string, userId: string): Promise<void> {
    await db
      .delete(phraseLists)
      .where(and(eq(phraseLists.id, id), eq(phraseLists.userId, userId)));
  }

  // ─── Phrase List Items ────────────────────────────────────────────────────

  async getPhraseListItems(listId: string): Promise<PhraseListItem[]> {
    return db
      .select()
      .from(phraseListItems)
      .where(eq(phraseListItems.listId, listId))
      .orderBy(asc(phraseListItems.createdAt));
  }

  async getPhraseListItem(id: string, listId: string): Promise<PhraseListItem | undefined> {
    const [item] = await db
      .select()
      .from(phraseListItems)
      .where(and(eq(phraseListItems.id, id), eq(phraseListItems.listId, listId)));
    return item;
  }

  async createPhraseListItem(insertItem: InsertPhraseListItem): Promise<PhraseListItem> {
    const [item] = await db.insert(phraseListItems).values(insertItem).returning();
    return item;
  }

  async updatePhraseListItem(id: string, listId: string, updates: Partial<PhraseListItem>): Promise<PhraseListItem> {
    const [item] = await db
      .update(phraseListItems)
      .set(updates)
      .where(and(eq(phraseListItems.id, id), eq(phraseListItems.listId, listId)))
      .returning();
    if (!item) throw new Error(`Phrase list item ${id} not found`);
    return item;
  }

  async deletePhraseListItem(id: string, listId: string): Promise<void> {
    await db
      .delete(phraseListItems)
      .where(and(eq(phraseListItems.id, id), eq(phraseListItems.listId, listId)));
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
    const [item] = await db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId)));
    return item;
  }

  async getMediaItemByFileUrl(fileUrl: string, userId: string): Promise<MediaItem | undefined> {
    const [item] = await db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.fileUrl, fileUrl), eq(mediaItems.userId, userId)));
    return item;
  }

  async createMediaItem(insertItem: InsertMediaItem): Promise<MediaItem> {
    const [item] = await db.insert(mediaItems).values({
      userId: insertItem.userId,
      type: insertItem.type as 'image' | 'video' | 'audio',
      originalName: insertItem.originalName,
      mimeType: insertItem.mimeType,
      fileUrl: insertItem.fileUrl,
      ocrBlocks: (insertItem.ocrBlocks ?? null) as OcrBlock[] | null,
      captions: (insertItem.captions ?? null) as Caption[] | null,
    }).returning();
    return item;
  }

  async deleteMediaItem(id: string, userId: string): Promise<void> {
    await db
      .delete(mediaItems)
      .where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId)));
  }

  // ─── Flashcard Sessions ──────────────────────────────────────────────────

  async getFlashcardSessions(userId: string): Promise<FlashcardSessionWithCards[]> {
    const sessions = await db
      .select()
      .from(flashcardSessions)
      .where(eq(flashcardSessions.userId, userId))
      .orderBy(desc(flashcardSessions.startedAt));

    return Promise.all(
      sessions.map(async (session) => ({
        ...session,
        cards: await this.getFlashcardSessionCards(session.id),
      }))
    );
  }

  async getFlashcardSession(id: string, userId: string): Promise<FlashcardSessionWithCards | undefined> {
    const [session] = await db
      .select()
      .from(flashcardSessions)
      .where(and(eq(flashcardSessions.id, id), eq(flashcardSessions.userId, userId)));
    if (!session) return undefined;
    return {
      ...session,
      cards: await this.getFlashcardSessionCards(session.id),
    };
  }

  private async getFlashcardSessionCards(sessionId: string): Promise<FlashcardSessionCard[]> {
    return db
      .select()
      .from(flashcardSessionCards)
      .where(eq(flashcardSessionCards.sessionId, sessionId))
      .orderBy(asc(flashcardSessionCards.orderIndex));
  }

  async createFlashcardSession(
    insertSession: InsertFlashcardSession,
    cards: Omit<InsertFlashcardSessionCard, "sessionId">[]
  ): Promise<FlashcardSessionWithCards> {
    const [session] = await db.insert(flashcardSessions).values(insertSession).returning();
    if (cards.length > 0) {
      await db
        .insert(flashcardSessionCards)
        .values(
          cards.map((card) => ({
            ...card,
            sessionId: session.id,
            status: (card.status ?? "pending") as "known" | "unknown" | "pending",
          }))
        );
    }
    return {
      ...session,
      cards: await this.getFlashcardSessionCards(session.id),
    };
  }

  async updateFlashcardSessionCardStatus(
    sessionId: string,
    cardId: string,
    status: "known" | "unknown" | "pending",
    userId: string
  ): Promise<FlashcardSessionCard> {
    const session = await this.getFlashcardSession(sessionId, userId);
    if (!session) throw new Error(`Flashcard session ${sessionId} not found`);

    const [card] = await db
      .update(flashcardSessionCards)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(flashcardSessionCards.id, cardId), eq(flashcardSessionCards.sessionId, sessionId)))
      .returning();
    if (!card) throw new Error(`Flashcard session card ${cardId} not found`);

    await db
      .update(flashcardSessions)
      .set({ updatedAt: new Date() })
      .where(and(eq(flashcardSessions.id, sessionId), eq(flashcardSessions.userId, userId)));

    return card;
  }

  async completeFlashcardSession(id: string, userId: string): Promise<FlashcardSession> {
    const [session] = await db
      .update(flashcardSessions)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(flashcardSessions.id, id), eq(flashcardSessions.userId, userId)))
      .returning();
    if (!session) throw new Error(`Flashcard session ${id} not found`);
    return session;
  }
}

export const storage = new DbStorage();
