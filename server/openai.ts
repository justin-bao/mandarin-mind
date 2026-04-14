import OpenAI from 'openai';

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
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ chinese: string; pinyin: string; english: string }> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const messages: ConversationMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // Parse the structured response
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Response generation error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Speech generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async addPinyinAndTranslation(chineseText: string): Promise<{ pinyin: string; english: string }> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
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
    english: string
  ): Promise<{ sentence: string; pinyin: string; translation: string }> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
}

export const mandarinTutorService = new MandarinTutorService();