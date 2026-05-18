export type AuthUser = {
  id: string;
  email: string;
  aiUsageBudgetUsdMicros?: number;
  aiUsageSpentUsdMicros?: number;
  createdAt: string | null;
};

export type Topic = {
  id: string;
  name: string;
  nameZh: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  icon: string;
};

export type Conversation = {
  id: string;
  topic?: string | null;
  topicZh?: string | null;
  difficulty?: Topic["difficulty"] | null;
  messageCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Message = {
  id: string;
  text: string;
  pinyin?: string | null;
  translation?: string | null;
  isUser: 0 | 1 | boolean;
  audioUrl?: string | null;
  createdAt?: string | null;
};

export type PhraseList = {
  id: string;
  name: string;
  description?: string | null;
  itemCount?: number;
  createdAt?: string | null;
  pendingSync?: boolean;
};

export type PhraseListItem = {
  id: string;
  listId: string;
  chinese: string;
  pinyin?: string | null;
  english: string;
  createdAt?: string | null;
};

export type FlashCard = {
  chinese: string;
  pinyin: string;
  english: string;
  sourceListId?: string;
};

export type FlashcardSessionCard = FlashCard & {
  id: string;
  sessionId: string;
  orderIndex: number;
  status: "known" | "unknown" | "pending";
  updatedAt: string;
};

export type FlashcardSession = {
  id: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  cards: FlashcardSessionCard[];
};

export type TranslationResult = {
  tokens: { char: string; pinyin: string }[];
  chinese: string;
  translation: string;
};

export type MediaItem = {
  id: string;
  type: "image" | "video" | "audio";
  originalName: string;
  mimeType: string;
  fileUrl: string;
  ocrBlocks?: { text: string; pinyin?: string; translation?: string }[] | null;
  captions?: { start?: number; end?: number; text: string; pinyin?: string; translation?: string }[] | null;
  uploadedAt?: string | null;
};

export type KeyboardTextIssue = {
  rangeText: string;
  type: "pinyin" | "wrong-character" | "grammar" | "word-choice" | "punctuation" | "tone";
  severity: "info" | "suggestion" | "important";
  message: string;
  replacement?: string;
};

export type KeyboardTextAnalysis = {
  originalText: string;
  correctedText: string;
  pinyin: string;
  translation: string;
  issues: KeyboardTextIssue[];
  tone: {
    label: "local-casual" | "neutral-natural" | "formal" | "awkward" | "mixed";
    summary: string;
    authenticityScore: number;
  };
  suggestions: string[];
};
