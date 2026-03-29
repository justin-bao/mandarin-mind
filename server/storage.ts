import { type Conversation, type InsertConversation, type Message, type InsertMessage, type PracticeWord, type InsertPracticeWord, type PhraseList, type InsertPhraseList, type PhraseListItem, type InsertPhraseListItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  
  // Messages
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Practice Words (legacy)
  getPracticeWords(): Promise<PracticeWord[]>;
  createPracticeWord(word: InsertPracticeWord): Promise<PracticeWord>;
  deletePracticeWord(id: string): Promise<void>;

  // Phrase Lists
  getPhraseLists(): Promise<PhraseList[]>;
  getPhraseList(id: string): Promise<PhraseList | undefined>;
  createPhraseList(list: InsertPhraseList): Promise<PhraseList>;
  updatePhraseList(id: string, updates: Partial<PhraseList>): Promise<PhraseList>;
  deletePhraseList(id: string): Promise<void>;

  // Phrase List Items
  getPhraseListItems(listId: string): Promise<PhraseListItem[]>;
  createPhraseListItem(item: InsertPhraseListItem): Promise<PhraseListItem>;
  deletePhraseListItem(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private practiceWords: Map<string, PracticeWord>;
  private phraseLists: Map<string, PhraseList>;
  private phraseListItems: Map<string, PhraseListItem>;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.practiceWords = new Map();
    this.phraseLists = new Map();
    this.phraseListItems = new Map();
  }

  // Conversations
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      id,
      topic: insertConversation.topic ?? null,
      topicZh: insertConversation.topicZh ?? null,
      difficulty: (insertConversation.difficulty ?? null) as 'Beginner' | 'Intermediate' | 'Advanced' | null,
      duration: 0,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const existing = this.conversations.get(id);
    if (!existing) {
      throw new Error(`Conversation ${id} not found`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  // Messages
  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      id,
      conversationId: insertMessage.conversationId,
      text: insertMessage.text,
      pinyin: insertMessage.pinyin ?? null,
      translation: insertMessage.translation ?? null,
      isUser: insertMessage.isUser as 0 | 1,
      audioUrl: insertMessage.audioUrl ?? null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);

    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      await this.updateConversation(insertMessage.conversationId, {
        messageCount: (conversation.messageCount || 0) + 1,
      });
    }

    return message;
  }

  // Practice Words (legacy)
  async getPracticeWords(): Promise<PracticeWord[]> {
    return Array.from(this.practiceWords.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createPracticeWord(insertWord: InsertPracticeWord): Promise<PracticeWord> {
    const id = randomUUID();
    const word: PracticeWord = {
      id,
      chinese: insertWord.chinese,
      pinyin: insertWord.pinyin ?? null,
      english: insertWord.english,
      createdAt: new Date(),
    };
    this.practiceWords.set(id, word);
    return word;
  }

  async deletePracticeWord(id: string): Promise<void> {
    this.practiceWords.delete(id);
  }

  // Phrase Lists
  async getPhraseLists(): Promise<PhraseList[]> {
    return Array.from(this.phraseLists.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getPhraseList(id: string): Promise<PhraseList | undefined> {
    return this.phraseLists.get(id);
  }

  async createPhraseList(insertList: InsertPhraseList): Promise<PhraseList> {
    const id = randomUUID();
    const now = new Date();
    const list: PhraseList = {
      ...insertList,
      id,
      description: insertList.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.phraseLists.set(id, list);
    return list;
  }

  async updatePhraseList(id: string, updates: Partial<PhraseList>): Promise<PhraseList> {
    const existing = this.phraseLists.get(id);
    if (!existing) {
      throw new Error(`Phrase list ${id} not found`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.phraseLists.set(id, updated);
    return updated;
  }

  async deletePhraseList(id: string): Promise<void> {
    this.phraseLists.delete(id);
    // Cascade: remove all items in this list
    for (const [itemId, item] of Array.from(this.phraseListItems.entries())) {
      if (item.listId === id) {
        this.phraseListItems.delete(itemId);
      }
    }
  }

  // Phrase List Items
  async getPhraseListItems(listId: string): Promise<PhraseListItem[]> {
    return Array.from(this.phraseListItems.values())
      .filter(item => item.listId === listId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createPhraseListItem(insertItem: InsertPhraseListItem): Promise<PhraseListItem> {
    const id = randomUUID();
    const item: PhraseListItem = {
      ...insertItem,
      id,
      pinyin: insertItem.pinyin ?? null,
      createdAt: new Date(),
    };
    this.phraseListItems.set(id, item);
    return item;
  }

  async deletePhraseListItem(id: string): Promise<void> {
    this.phraseListItems.delete(id);
  }
}

export const storage = new MemStorage();
