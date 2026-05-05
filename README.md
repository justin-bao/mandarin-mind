# MandarinMind

MandarinMind is a full-stack Mandarin learning app for speech practice, phrase study, flashcards, and media-assisted vocabulary discovery. Users can hold AI-guided Mandarin conversations, save useful phrases into custom lists, review HSK flashcards, scan images for Chinese text, and generate bilingual captions from uploaded video or audio.

## Features

- Email/password accounts with private per-user data
- Topic-based and free-form Mandarin conversation practice
- Browser audio recording, Mandarin transcription, AI tutor replies, pinyin, English translation, and generated speech playback
- Conversation history with saved messages
- Phrase lists with CRUD operations, phrase lookup, pinyin, translation, generated example sentences, and practice sessions
- HSK 1-6 flashcards from local vocabulary data
- Image OCR for Chinese and English text using Tesseract.js
- Video/audio upload with timestamped bilingual captions using Groq Whisper and OpenAI translation
- Light/dark theme support and responsive desktop/mobile navigation

## Tech Stack

- React 18, TypeScript, Vite
- Express, Passport, express-session
- PostgreSQL with Drizzle ORM
- TanStack Query
- Tailwind CSS, shadcn/ui, Radix UI, Lucide icons
- OpenAI for conversation, transcription, translation, and text-to-speech
- Groq Whisper for media transcription
- Tesseract.js for OCR

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL database
- OpenAI API key
- Groq API key for video/audio captions

### Install

```bash
npm install
```

### Configure Environment

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
SESSION_SECRET=replace_with_a_long_random_secret
PORT=5000
```

`PORT` is optional and defaults to `5000`.

The server exits on startup if any required environment variable is missing. `GROQ_API_KEY` is required by the current startup check even though it is only used by the media caption workflow.

### Set Up the Database

Push the Drizzle schema to your PostgreSQL database:

```bash
npm run db:push
```

This creates the application tables from [shared/schema.ts](/Users/Justin/personal_projects/mandarin-mind/shared/schema.ts). Session storage is created automatically by `connect-pg-simple` when the server starts.

### Run in Development

```bash
npm run dev
```

Open `http://localhost:5000`.

In development, Express serves the API and Vite middleware serves the React client from the same server.

## Deploying to Vercel

This repo includes [vercel.json](/Users/Justin/personal_projects/mandarin-mind/vercel.json) and [api/index.ts](/Users/Justin/personal_projects/mandarin-mind/api/index.ts) so Vercel can deploy the Vite client as static assets and run the Express API as a Node.js serverless function.

In Vercel project settings, set these environment variables for the environments you deploy to:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
SESSION_SECRET=replace_with_a_long_random_secret
```

Vercel uses `npm run vercel-build`, which builds only the Vite client into `dist/public`. Requests to `/api/*` and `/uploads/*` are routed to the Express function; all other routes fall back to `index.html` for the React app.

Run `npm run db:push` against the production database before first deploy, or from a trusted environment with `DATABASE_URL` set.

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Build the Vite client and bundled server into dist/
npm run vercel-build # Build the static client for Vercel
npm run start    # Run the production build
npm run check    # Type-check with TypeScript
npm run db:push  # Push Drizzle schema changes to the database
```

## Project Structure

```text
client/                 React app
client/src/components/  App features and shadcn/ui components
client/src/data/        Local vocabulary data
server/                 Express server and integrations
server/routes.ts        REST API routes
server/openai.ts        OpenAI conversation, transcription, and TTS service
server/media.ts         OCR and media caption generation
server/translation.ts   Phrase and sentence translation helpers
shared/schema.ts        Drizzle schema and shared TypeScript types
```

## API Overview

All data routes require authentication unless noted.

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/conversations`, `POST /api/conversations`, `GET /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/audio`
- `GET /api/practice-words`, `POST /api/practice-words`, `DELETE /api/practice-words/:id`
- `GET /api/phrase-lists`, `POST /api/phrase-lists`, `GET/PATCH/DELETE /api/phrase-lists/:id`
- `GET/POST /api/phrase-lists/:id/items`
- `PATCH/DELETE /api/phrase-lists/:listId/items/:itemId`
- `POST /api/phrases/lookup`
- `POST /api/phrases/example-sentence`
- `POST /api/translate/sentence`
- `POST /api/audio/generate`
- `GET /api/media`, `DELETE /api/media/:id`
- `POST /api/media/upload/image`
- `POST /api/media/upload/video`
- `GET /uploads/:filename`

The image and video/audio upload endpoints stream progress with server-sent events before sending a final `complete` event.

## Data Model

The PostgreSQL schema includes:

- `users`
- `conversations`
- `messages`
- `practice_words`
- `phrase_lists`
- `phrase_list_items`
- `media_items`

Uploaded media files are stored on disk in `server/uploads` and referenced from the `media_items` table. Access to uploaded files is authenticated and checked against the owning user.

## Production

Build the app:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

The production server serves static client assets from `dist/public` and the bundled API from `dist/index.js`.

## Notes

- Phrase lookup and sentence translation use the MyMemory translation API in [server/translation.ts](/Users/Justin/personal_projects/mandarin-mind/server/translation.ts), which may have daily quota limits.
- Conversation audio uploads are limited to 10 MB.
- Media uploads are limited to 100 MB.
- On Vercel, uploaded media files are written to temporary function storage. For durable media history across function invocations, replace the local disk storage in [server/routes.ts](/Users/Justin/personal_projects/mandarin-mind/server/routes.ts) with persistent object storage such as Vercel Blob or S3.
- The app expects simplified Chinese for OCR and tutor workflows.
