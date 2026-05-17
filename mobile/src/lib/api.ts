import { Audio } from "expo-av";
import { getAuthHeaders } from "./supabase";
import type { Conversation, FlashCard, KeyboardTextAnalysis, Message, PhraseList, PhraseListItem } from "../types";

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

async function parseError(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text).error ?? text;
  } catch {
    return text || res.statusText;
  }
}

export async function apiRequest<T>(method: string, path: string, data?: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: data ? { "Content-Type": "application/json", ...authHeaders } : authHeaders,
    body: data ? JSON.stringify(data) : undefined
  });

  if (!res.ok) throw new Error(`${res.status}: ${await parseError(res)}`);
  return res.json() as Promise<T>;
}

export const conversationApi = {
  getAll: () => apiRequest<Conversation[]>("GET", "/api/conversations"),
  create: (data: { topic?: string; topicZh?: string; difficulty?: string }) =>
    apiRequest<Conversation>("POST", "/api/conversations", data),
  getMessages: (id: string) => apiRequest<Message[]>("GET", `/api/conversations/${id}/messages`),
  sendAudio: async (id: string, uri: string) => {
    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append("audio", {
      uri,
      name: "recording.m4a",
      type: "audio/m4a"
    } as unknown as Blob);

    const res = await fetch(`${API_BASE_URL}/api/conversations/${id}/audio`, {
      method: "POST",
      headers: authHeaders,
      body: formData
    });

    if (!res.ok) throw new Error(`${res.status}: ${await parseError(res)}`);
    return res.json() as Promise<{ userMessage: Message; aiMessage: Message }>;
  }
};

export const phraseListsApi = {
  getAll: () => apiRequest<(PhraseList & { itemCount: number })[]>("GET", "/api/phrase-lists"),
  create: (data: { name: string; description?: string }) => apiRequest<PhraseList>("POST", "/api/phrase-lists", data),
  getItems: (listId: string) => apiRequest<PhraseListItem[]>("GET", `/api/phrase-lists/${listId}/items`),
  addItem: (listId: string, data: { chinese: string; pinyin?: string; english: string }) =>
    apiRequest<PhraseListItem>("POST", `/api/phrase-lists/${listId}/items`, data)
};

export const phraseLookupApi = {
  lookup: (chinese: string) => apiRequest<{ pinyin: string; english: string }>("POST", "/api/phrases/lookup", { chinese })
};

export const flashcardSessionsApi = {
  create: (cards: FlashCard[]) => apiRequest<{ id: string }>("POST", "/api/flashcard-sessions", { cards })
};

export const grammarApi = {
  analyze: (text: string) => apiRequest<KeyboardTextAnalysis>("POST", "/api/keyboard/analyze", { text })
};

export async function playAudioUrl(uri: string) {
  const { sound } = await Audio.Sound.createAsync({ uri });
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      sound.unloadAsync();
    }
  });
  await sound.playAsync();
}
