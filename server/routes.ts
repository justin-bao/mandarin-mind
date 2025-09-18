import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { mandarinTutorService } from "./openai";
import { insertConversationSchema, insertMessageSchema, insertPracticeWordSchema } from "@shared/schema";

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Conversations
  app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(400).json({ error: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // Messages
  app.get('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const messages = await storage.getMessagesByConversationId(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Process audio input for conversation
  app.post('/api/conversations/:id/audio', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // 1. Transcribe user audio
      const transcription = await mandarinTutorService.transcribeAudio(req.file.buffer);
      
      // 2. Add pinyin and translation for user input
      const userTranslation = await mandarinTutorService.addPinyinAndTranslation(transcription.text);

      // 3. Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        text: transcription.text,
        pinyin: userTranslation.pinyin,
        translation: userTranslation.english,
        isUser: 1,
        audioUrl: null,
      });

      // 4. Get conversation history for context
      const messages = await storage.getMessagesByConversationId(conversationId);
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

      // 5. Generate AI response
      const context = {
        topic: conversation.topic || undefined,
        topicZh: conversation.topicZh || undefined,
        difficulty: conversation.difficulty || 'Beginner' as const,
      };

      const aiResponse = await mandarinTutorService.generateResponse(
        transcription.text,
        context,
        conversationHistory
      );

      // 6. Add pinyin and translation for AI response
      const aiTranslation = await mandarinTutorService.addPinyinAndTranslation(aiResponse.chinese);

      // 7. Generate speech audio for AI response
      const audioBuffer = await mandarinTutorService.generateSpeech(aiResponse.chinese);
      const audioBase64 = audioBuffer.toString('base64');

      // 8. Save AI message
      const aiMessage = await storage.createMessage({
        conversationId,
        text: aiResponse.chinese,
        pinyin: aiTranslation.pinyin,
        translation: aiTranslation.english,
        isUser: 0,
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
      });

      res.json({
        userMessage,
        aiMessage,
      });

    } catch (error) {
      console.error('Error processing audio:', error);
      res.status(500).json({ error: 'Failed to process audio' });
    }
  });

  // Practice Words
  app.get('/api/practice-words', async (req: Request, res: Response) => {
    try {
      const words = await storage.getPracticeWords();
      res.json(words);
    } catch (error) {
      console.error('Error fetching practice words:', error);
      res.status(500).json({ error: 'Failed to fetch practice words' });
    }
  });

  app.post('/api/practice-words', async (req: Request, res: Response) => {
    try {
      const validatedData = insertPracticeWordSchema.parse(req.body);
      const word = await storage.createPracticeWord(validatedData);
      res.json(word);
    } catch (error) {
      console.error('Error creating practice word:', error);
      res.status(400).json({ error: 'Failed to create practice word' });
    }
  });

  app.delete('/api/practice-words/:id', async (req: Request, res: Response) => {
    try {
      await storage.deletePracticeWord(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting practice word:', error);
      res.status(500).json({ error: 'Failed to delete practice word' });
    }
  });

  // Generate audio for text (for replay functionality)
  app.post('/api/audio/generate', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'No text provided' });
      }

      const audioBuffer = await mandarinTutorService.generateSpeech(text);
      const audioBase64 = audioBuffer.toString('base64');
      
      res.json({
        audioUrl: `data:audio/mp3;base64,${audioBase64}`
      });
    } catch (error) {
      console.error('Error generating audio:', error);
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
