# Backend Implementation Summary

The backend is an Express application written in TypeScript. The main entrypoint is
`server/index.ts`, which creates the app through `server/app.ts`; Vercel uses
`api/index.ts`.

## Application Setup

- `server/app.ts` validates required environment variables, creates the Express app,
  installs JSON/body parsing, verifies Supabase bearer tokens, attaches API logging,
  registers routes, and installs centralized error handling.
- Required runtime env vars are `OPENAI_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`,
  `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` is optional
  but preferred on the server for Auth admin verification.
- In Vercel, `trust proxy` is enabled.

## Data Model

- `shared/schema.ts` defines Drizzle PostgreSQL tables and insert schemas.
- Tables:
  - `users`: app profile and AI usage budget rows keyed by Supabase Auth user id.
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

- Supabase Auth owns sign-up, sign-in, OAuth, token refresh, and sign-out.
- The frontend sends the current Supabase access token in `Authorization: Bearer ...`
  for API requests.
- `server/app.ts` verifies the token with Supabase, then upserts/loads the matching
  app profile row in `users` using the Supabase Auth user id.
- `server/routes.ts` exposes:
  - `POST /api/auth/register` and `POST /api/auth/login`, both deprecated with 410
    responses because Supabase Auth handles those flows client-side.
  - `POST /api/auth/logout`, a compatibility no-op.
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

1. `server/app.ts` for process setup, Supabase token verification, and error handling.
2. `server/routes.ts` for every HTTP API route.
3. `server/storage.ts` for persistence behavior and ownership checks.
4. `shared/schema.ts` for database tables and insert validation schemas.
5. `server/openai.ts`, `server/translation.ts`, and `server/media.ts` for external
   AI/OCR/translation behavior.
