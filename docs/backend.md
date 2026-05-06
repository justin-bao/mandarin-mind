# Backend Implementation Summary

The backend is an Express application written in TypeScript. The main entrypoint is
`server/index.ts`, which creates the app through `server/app.ts`; Vercel uses
`api/index.ts`.

## Application Setup

- `server/app.ts` validates required environment variables, configures Passport local
  auth plus optional Google OAuth, creates the Express app, installs JSON/body parsing, configures
  `express-session` with PostgreSQL-backed sessions, initializes Passport, attaches
  API logging, registers routes, and installs centralized error handling.
- Required runtime env vars are `OPENAI_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`, and
  `SESSION_SECRET`.
- Optional Google sign-in uses `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
  `GOOGLE_CALLBACK_URL`.
- In Vercel, `trust proxy` and secure cookies are enabled.

## Data Model

- `shared/schema.ts` defines Drizzle PostgreSQL tables and insert schemas.
- Tables:
  - `users`: email/password-hash accounts.
  - `conversations`: user-owned topic sessions with difficulty and message count.
  - `messages`: ordered user/assistant messages for each conversation.
  - `practice_words`: legacy standalone practice words.
  - `phrase_lists`: user-owned phrase collections.
  - `phrase_list_items`: saved phrases inside a list.
  - `media_items`: uploaded image/video/audio metadata with OCR blocks or captions.
- `server/storage.ts` implements `IStorage` using Drizzle queries. It enforces
  user ownership in read/update/delete calls that accept `userId`, and updates a
  conversation's `messageCount` whenever messages are inserted.

## Authentication

- `server/app.ts` configures Passport's local strategy with `email` as the username
  field and registers Google OAuth when the Google env vars are present.
- Login normalizes email, loads the user from storage, compares the password with
  bcrypt, and serializes only the safe user shape into the session.
- Google login finds users by `google_id`, links an existing account by verified email,
  or creates a new account with an unusable generated password hash.
- `server/routes.ts` exposes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/google`
  - `GET /api/auth/google/callback`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- `requireAuth` protects all user-data and AI/media routes.

## Conversation And Audio Flow

- `GET /api/conversations` lists the authenticated user's conversations.
- `POST /api/conversations` creates a conversation for the authenticated user.
- `GET /api/conversations/:id` loads one owned conversation.
- `GET /api/conversations/:id/messages` validates ownership, then returns messages.
- `POST /api/conversations/:id/audio` accepts one in-memory audio file, validates
  ownership, transcribes it with OpenAI Whisper, stores the user message, asks the
  tutor service for a Chinese reply, adds pinyin/English, generates TTS audio, stores
  the assistant message, and returns both created messages.

## Phrase And Translation Flow

- Legacy practice words live at `/api/practice-words`.
- Phrase list CRUD lives at `/api/phrase-lists`.
- Phrase list item CRUD lives at `/api/phrase-lists/:id/items` and
  `/api/phrase-lists/:listId/items/:itemId`.
- `POST /api/phrases/lookup` returns pinyin plus English for Chinese text.
- `POST /api/translate/sentence` returns annotated tokens, normalized Chinese text,
  and translation. It supports Chinese-to-English and English-to-Chinese directions.
- `POST /api/phrases/example-sentence` asks OpenAI for one example sentence.
- `POST /api/audio/generate` returns generated speech as a base64 data URL.

## AI And Translation Services

- `server/openai.ts` wraps OpenAI transcription, chat response generation, TTS, pinyin
  and translation enrichment, and example-sentence generation.
- `server/translation.ts` uses `pinyin-pro` locally for pinyin and MyMemory's public
  API for translation. This is useful for phrase lookup and sentence translation
  flows that do not need OpenAI.
- `server/media.ts` handles OCR and caption generation for uploaded media. Image OCR
  and media captioning are surfaced through SSE routes.

## Media Flow

- Uploaded files are stored in `server/uploads` locally or `/tmp/mandarin-mind-uploads`
  on Vercel. The location can be overridden with `UPLOADS_DIR`.
- `GET /api/media` lists uploaded items for the current user.
- `DELETE /api/media/:id` deletes the metadata and best-effort removes the local file.
- `POST /api/media/upload/image` streams SSE progress while running OCR, stores an
  image media item, and sends a final `complete` event.
- `POST /api/media/upload/video` streams SSE progress while generating captions for
  audio/video, stores a media item, and sends a final `complete` event.
- `GET /uploads/:filename` serves media only after verifying the file URL belongs to
  the authenticated user.

## Deployment And Build

- `vite.config.ts` builds the client to `dist/public`.
- `npm run build` builds the client and bundles `server/index.ts` with esbuild.
- `vercel.json` and `api/index.ts` support Vercel deployment using the same Express app.
- `drizzle.config.ts` points Drizzle migrations/schema tooling at `shared/schema.ts`.

## Files To Read First

1. `server/app.ts` for process setup, sessions, Passport, and error handling.
2. `server/routes.ts` for every HTTP API route.
3. `server/storage.ts` for persistence behavior and ownership checks.
4. `shared/schema.ts` for database tables and insert validation schemas.
5. `server/openai.ts`, `server/translation.ts`, and `server/media.ts` for external
   AI/OCR/translation behavior.
