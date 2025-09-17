import { type Conversation, type InsertConversation, type Message, type InsertMessage, type PracticeWord, type InsertPracticeWord } from "@shared/schema";
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
  
  // Practice Words
  getPracticeWords(): Promise<PracticeWord[]>;
  createPracticeWord(word: InsertPracticeWord): Promise<PracticeWord>;
  deletePracticeWord(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private practiceWords: Map<string, PracticeWord>;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.practiceWords = new Map();
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
      ...insertConversation,
      id,
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
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);

    // Update conversation message count and duration
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      await this.updateConversation(insertMessage.conversationId, {
        messageCount: (conversation.messageCount || 0) + 1,
      });
    }

    return message;
  }

  // Practice Words
  async getPracticeWords(): Promise<PracticeWord[]> {
    return Array.from(this.practiceWords.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createPracticeWord(insertWord: InsertPracticeWord): Promise<PracticeWord> {
    const id = randomUUID();
    const word: PracticeWord = {
      ...insertWord,
      id,
      createdAt: new Date(),
    };
    this.practiceWords.set(id, word);
    return word;
  }

  async deletePracticeWord(id: string): Promise<void> {
    this.practiceWords.delete(id);
  }
}

export const storage = new MemStorage();
