import OpenAI from 'openai';
import { storage } from './storage.js';
import {
  calculateOpenAIChatCostUsdMicros,
  calculateOpenAITtsCostUsdMicros,
  type AiFeature,
} from './usage.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ConversationContext {
  topic?: string;
  topicZh?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  practiceWords?: string[];
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface KeyboardTextIssue {
  rangeText: string;
  type: 'pinyin' | 'wrong-character' | 'grammar' | 'word-choice' | 'punctuation' | 'tone';
  severity: 'info' | 'suggestion' | 'important';
  message: string;
  replacement?: string;
}

export interface KeyboardTextAnalysis {
  originalText: string;
  correctedText: string;
  pinyin: string;
  translation: string;
  issues: KeyboardTextIssue[];
  tone: {
    label: 'local-casual' | 'neutral-natural' | 'formal' | 'awkward' | 'mixed';
    summary: string;
    authenticityScore: number;
  };
  suggestions: string[];
}

export class MandarinTutorService {
  async transcribeAudio(audioBuffer: Buffer): Promise<{ text: string; language: string }> {
    try {
      const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'zh',
        response_format: 'json',
      });

      return {
        text: transcription.text,
        language: 'zh'
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async generateResponse(
    userMessage: string,
    context: ConversationContext,
    conversationHistory: ConversationMessage[] = [],
    userId?: string
  ): Promise<{ chinese: string; pinyin: string; english: string }> {
    if (userId) await storage.assertAiUsageWithinBudget(userId);
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const messages: ConversationMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const model = 'gpt-4';
      const completion = await openai.chat.completions.create({
        model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 200,
      });

      await this.recordChatUsage(userId, {
        feature: 'conversation.response',
        model,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // Parse the structured response
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Response generation error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async generateSpeech(text: string, userId?: string): Promise<Buffer> {
    if (userId) await storage.assertAiUsageWithinBudget(userId);
    try {
      const model = 'tts-1';
      const mp3 = await openai.audio.speech.create({
        model,
        voice: 'nova',
        input: text,
        speed: 1.0,
      });

      if (userId) {
        await storage.recordAiUsage(userId, {
          feature: 'conversation.speech',
          provider: 'openai',
          model,
          billableUnits: text.length,
          costUsdMicros: calculateOpenAITtsCostUsdMicros(text.length),
        });
      }

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Speech generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async addPinyinAndTranslation(
    chineseText: string,
    userId?: string,
    feature: AiFeature = 'conversation.annotation'
  ): Promise<{ pinyin: string; english: string }> {
    if (userId) await storage.assertAiUsageWithinBudget(userId);
    try {
      const model = 'gpt-4';
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a Chinese language expert. Given Chinese text, provide:
1. Accurate pinyin with tone marks
2. Natural English translation

Format your response as:
PINYIN: [pinyin here]
ENGLISH: [translation here]`
          },
          {
            role: 'user',
            content: chineseText
          }
        ],
        temperature: 0.1,
        max_tokens: 150,
      });

      await this.recordChatUsage(userId, {
        feature,
        model,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      });

      const response = completion.choices[0]?.message?.content || '';
      
      const pinyinMatch = response.match(/PINYIN:\s*(.+)/);
      const englishMatch = response.match(/ENGLISH:\s*(.+)/);

      return {
        pinyin: pinyinMatch?.[1]?.trim() || '',
        english: englishMatch?.[1]?.trim() || chineseText
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        pinyin: '',
        english: chineseText
      };
    }
  }

  async generateExampleSentence(
    chinese: string,
    english: string,
    userId?: string
  ): Promise<{ sentence: string; pinyin: string; translation: string }> {
    if (userId) await storage.assertAiUsageWithinBudget(userId);
    try {
      const model = 'gpt-4o-mini';
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: `Create one natural example sentence in Mandarin Chinese that clearly uses the phrase "${chinese}" (${english}). The sentence should be suitable for a language learner.

Respond in exactly this format:
SENTENCE: [Chinese sentence only]
PINYIN: [full pinyin with tone marks]
ENGLISH: [natural English translation]`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      });

      await this.recordChatUsage(userId, {
        feature: 'phrase.example_sentence',
        model,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      });

      const text = completion.choices[0]?.message?.content ?? '';
      const sentence = text.match(/SENTENCE:\s*(.+)/)?.[1]?.trim() ?? '';
      const pinyin   = text.match(/PINYIN:\s*(.+)/)?.[1]?.trim()   ?? '';
      const translation = text.match(/ENGLISH:\s*(.+)/)?.[1]?.trim() ?? '';
      return { sentence, pinyin, translation };
    } catch (error) {
      console.error('Example sentence generation error:', error);
      throw new Error('Failed to generate example sentence');
    }
  }

  async analyzeKeyboardText(text: string, userId?: string): Promise<KeyboardTextAnalysis> {
    if (userId) await storage.assertAiUsageWithinBudget(userId);
    try {
      const trimmed = text.trim();
      const model = 'gpt-4o-mini';
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are MandarinMind Keyboard, a Chinese writing assistant similar to Grammarly.
Analyze short Chinese or mixed pinyin/Chinese text typed by a learner.

You must:
- Recognize pinyin typed where Chinese characters would be more natural.
- Catch likely wrong characters, homophones, awkward word choice, grammar, punctuation, and register problems.
- Suggest natural simplified Chinese.
- Comment on tone/authenticity: local casual, neutral natural, formal, awkward, or mixed.
- Prefer concise, practical comments suitable for a keyboard suggestion panel.

Return only valid JSON matching this TypeScript type:
{
  "correctedText": string,
  "pinyin": string,
  "translation": string,
  "issues": {
    "rangeText": string,
    "type": "pinyin" | "wrong-character" | "grammar" | "word-choice" | "punctuation" | "tone",
    "severity": "info" | "suggestion" | "important",
    "message": string,
    "replacement"?: string
  }[],
  "tone": {
    "label": "local-casual" | "neutral-natural" | "formal" | "awkward" | "mixed",
    "summary": string,
    "authenticityScore": number
  },
  "suggestions": string[]
}`
          },
          {
            role: 'user',
            content: trimmed
          }
        ],
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      });

      await this.recordChatUsage(userId, {
        feature: 'keyboard.analysis',
        model,
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as Partial<KeyboardTextAnalysis>;

      return {
        originalText: trimmed,
        correctedText: typeof parsed.correctedText === 'string' ? parsed.correctedText : trimmed,
        pinyin: typeof parsed.pinyin === 'string' ? parsed.pinyin : '',
        translation: typeof parsed.translation === 'string' ? parsed.translation : '',
        issues: Array.isArray(parsed.issues) ? parsed.issues.filter((issue) => issue && typeof issue.message === 'string') as KeyboardTextIssue[] : [],
        tone: {
          label: parsed.tone?.label ?? 'neutral-natural',
          summary: parsed.tone?.summary ?? 'Naturalness looks okay, but no detailed tone note was returned.',
          authenticityScore: Math.max(0, Math.min(100, Number(parsed.tone?.authenticityScore ?? 70))),
        },
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((item): item is string => typeof item === 'string') : [],
      };
    } catch (error) {
      console.error('Keyboard analysis error:', error);
      throw new Error('Failed to analyze keyboard text');
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    let prompt = `You are a helpful Mandarin Chinese language tutor. You should:
1. Respond naturally in Mandarin Chinese
2. Keep responses conversational and encouraging
3. Use vocabulary appropriate for the difficulty level
4. Provide corrections when needed, but gently
5. Ask follow-up questions to continue the conversation

Difficulty level: ${context.difficulty || 'Beginner'}
`;

    if (context.topic && context.topicZh) {
      prompt += `\nConversation topic: ${context.topic} (${context.topicZh})
Focus the conversation on this topic while keeping it natural and engaging.`;
    }

    if (context.practiceWords && context.practiceWords.length > 0) {
      prompt += `\nPractice words to incorporate: ${context.practiceWords.join(', ')}
Try to naturally include these words/phrases in the conversation.`;
    }

    prompt += `\nImportant: Respond ONLY in simplified Chinese characters. Do not include pinyin or English in your response - those will be added separately.`;

    return prompt;
  }

  private parseAIResponse(response: string): { chinese: string; pinyin: string; english: string } {
    // If the response is already just Chinese text, we'll add pinyin and translation separately
    const chinese = response.trim();
    
    return {
      chinese,
      pinyin: '', // Will be filled by addPinyinAndTranslation
      english: ''  // Will be filled by addPinyinAndTranslation
    };
  }

  private async recordChatUsage(
    userId: string | undefined,
    usage: { feature: AiFeature; model: string; inputTokens: number; outputTokens: number }
  ) {
    if (!userId) return;
    const costUsdMicros = calculateOpenAIChatCostUsdMicros(
      usage.model,
      usage.inputTokens,
      usage.outputTokens
    );
    await storage.recordAiUsage(userId, {
      feature: usage.feature,
      provider: 'openai',
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsdMicros,
    });
  }
}

export const mandarinTutorService = new MandarinTutorService();
