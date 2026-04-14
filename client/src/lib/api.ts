import { apiRequest } from "./queryClient";

// Audio recording utilities
export const startAudioRecording = (): Promise<MediaRecorder> => {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        resolve(mediaRecorder);
      })
      .catch(reject);
  });
};

export const stopAudioRecording = (mediaRecorder: MediaRecorder, chunks: BlobPart[]): Promise<Blob> => {
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
      resolve(audioBlob);
    };
    
    mediaRecorder.stop();
    
    // Stop all tracks to release microphone
    const stream = mediaRecorder.stream;
    stream.getTracks().forEach(track => track.stop());
  });
};

// API functions
export const conversationApi = {
  getAll: async () => {
    const res = await apiRequest('GET', '/api/conversations');
    return await res.json();
  },
  
  create: async (data: { topic?: string; topicZh?: string; difficulty?: string }) => {
    const res = await apiRequest('POST', '/api/conversations', data);
    return await res.json();
  },
    
  get: async (id: string) => {
    const res = await apiRequest('GET', `/api/conversations/${id}`);
    return await res.json();
  },
  
  getMessages: async (id: string) => {
    const res = await apiRequest('GET', `/api/conversations/${id}/messages`);
    return await res.json();
  },
  
  sendAudio: async (id: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await fetch(`/api/conversations/${id}/audio`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
};

export const practiceWordsApi = {
  getAll: async () => {
    const res = await apiRequest('GET', '/api/practice-words');
    return await res.json();
  },
  
  create: async (data: { chinese: string; pinyin?: string; english: string }) => {
    const res = await apiRequest('POST', '/api/practice-words', data);
    return await res.json();
  },
    
  delete: async (id: string) => {
    const res = await apiRequest('DELETE', `/api/practice-words/${id}`);
    return await res.json();
  }
};

export const audioApi = {
  generate: async (text: string) => {
    const res = await apiRequest('POST', '/api/audio/generate', { text });
    return await res.json();
  }
};

export const phraseListsApi = {
  getAll: async () => {
    const res = await apiRequest('GET', '/api/phrase-lists');
    return await res.json();
  },
  create: async (data: { name: string; description?: string }) => {
    const res = await apiRequest('POST', '/api/phrase-lists', data);
    return await res.json();
  },
  update: async (id: string, data: { name?: string; description?: string }) => {
    const res = await apiRequest('PATCH', `/api/phrase-lists/${id}`, data);
    return await res.json();
  },
  delete: async (id: string) => {
    const res = await apiRequest('DELETE', `/api/phrase-lists/${id}`);
    return await res.json();
  },
  getItems: async (listId: string) => {
    const res = await apiRequest('GET', `/api/phrase-lists/${listId}/items`);
    return await res.json();
  },
  addItem: async (listId: string, data: { chinese: string; pinyin?: string; english: string }) => {
    const res = await apiRequest('POST', `/api/phrase-lists/${listId}/items`, data);
    return await res.json();
  },
  updateItem: async (listId: string, itemId: string, data: Record<string, unknown>) => {
    const res = await apiRequest('PATCH', `/api/phrase-lists/${listId}/items/${itemId}`, data);
    return await res.json();
  },
  deleteItem: async (listId: string, itemId: string) => {
    const res = await apiRequest('DELETE', `/api/phrase-lists/${listId}/items/${itemId}`);
    return await res.json();
  },
};

export const phraseLookupApi = {
  lookup: async (chinese: string): Promise<{ pinyin: string; english: string }> => {
    const res = await apiRequest('POST', '/api/phrases/lookup', { chinese });
    return await res.json();
  },
  exampleSentence: async (chinese: string, english: string): Promise<{ sentence: string; pinyin: string; translation: string }> => {
    const res = await apiRequest('POST', '/api/phrases/example-sentence', { chinese, english });
    return await res.json();
  },
};

export const translateApi = {
  sentence: async (chinese: string): Promise<{
    tokens: { char: string; pinyin: string }[];
    translation: string;
  }> => {
    const res = await apiRequest('POST', '/api/translate/sentence', { chinese });
    return await res.json();
  },
  lookup: async (chinese: string): Promise<{ pinyin: string; english: string }> => {
    const res = await apiRequest('POST', '/api/phrases/lookup', { chinese });
    return await res.json();
  },
};

// Audio playback utilities
export const playAudio = (audioUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Failed to play audio'));
    
    audio.play().catch(reject);
  });
};