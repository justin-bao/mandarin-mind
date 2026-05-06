# Mandarin Language Tutor App

## Overview

This is a Mandarin language learning application that provides interactive conversation practice with an AI tutor. The app focuses on speech-to-speech interaction, allowing users to practice pronunciation and conversation skills through real-time audio transcription and AI-generated responses. Users can engage in topic-based conversations, practice with custom word lists, track their learning progress through conversation history, study with HSK-level flashcards, and analyze media (images + video/audio) for language learning.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

**Frontend Architecture**
- Built with React 18 and TypeScript using Vite as the build tool
- Component library based on shadcn/ui with Radix UI primitives for accessibility
- Styled with Tailwind CSS using a custom design system with Material Design inspiration
- State management through React hooks and TanStack Query for server state
- Mobile-first responsive design with dedicated mobile breakpoints

**Backend Architecture**  
- Express.js server with TypeScript support
- RESTful API design with structured route handlers
- PostgreSQL database via Drizzle ORM (node-postgres driver) — all data persisted permanently
- Supabase Auth for email/password, OAuth, token refresh, and sign-out
- Backend verifies Supabase bearer tokens and upserts an app profile row before route handling
- requireAuth middleware protecting all data API routes
- File upload handling via multer: audio (memory, 10 MB) for conversation; image/video/audio (disk, 100 MB) for media mode
- Static file serving from server/uploads/ at /uploads/ route

**Audio Processing**
- Browser-based audio recording using MediaRecorder API
- WebM audio format with Opus codec for optimal quality and compression
- Audio transcription through OpenAI Whisper API (conversation mode)
- Groq Whisper API (whisper-large-v3-turbo) for media video/audio captions
- Real-time speech-to-text conversion for user input

**AI Integration**
- OpenAI GPT integration for conversational AI tutor responses
- Context-aware conversation management with topic and difficulty tracking
- Structured response generation including Chinese text, pinyin, and English translations
- Conversation history tracking for context continuity
- GPT-4o-mini for caption translation (Chinese ↔ English per segment)

**Media Mode (OCR + Captions)**
- Image OCR via Tesseract.js (server-side, chi_sim+eng, line-level bounding boxes as % coordinates)
- Tappable text chip overlay on images — tap any detected block to translate + add to phrase list
- Video/audio captioning: Groq Whisper transcribes → GPT-4o-mini translates per segment
- Synchronized caption player with auto-scroll and active-line highlight
- All media persisted in PostgreSQL (media_items table) with history list showing thumbnails/icons
- Translate any caption → detailed character-by-character pinyin breakdown
- "Add to phrase list" action available from both OCR viewer and caption player

**Authentication**
- Supabase Auth email/password and Google OAuth
- Frontend sends Supabase access tokens as API bearer tokens
- All app data is private per user account; unauthenticated requests redirected to login page
- Auth endpoints: GET /api/auth/me for app profile; Supabase owns login/register/OAuth/logout
- Settings tab shows logged-in email and Sign Out button

**Data Models (PostgreSQL via Drizzle)**
- Users: id (Supabase Auth user id), email (unique), AI usage budget/spend, createdAt
- Conversations: userId FK, topic, difficulty, duration, messageCount
- Messages: conversationId FK, text, pinyin, translation, isUser, audioUrl
- Practice Words: userId FK, chinese, pinyin, english
- Phrase Lists + Items: userId FK on lists; listId FK on items; AI-powered pinyin/English auto-fill
- Media Items: userId FK, type (image|video|audio), fileUrl, ocrBlocks (jsonb), captions (jsonb)

**Design System**
- Custom color palette optimized for learning (teal-based primary colors)
- Typography hierarchy using Inter for Latin text and Noto Sans SC for Chinese characters
- Consistent spacing system based on Tailwind's scale
- Chat-style conversation interface with bubble layout
- Theme support for both light and dark modes

**User Experience Features**
- Topic-based conversation starters across different difficulty levels
- Tap-to-translate functionality for instant comprehension
- Audio playback for pronunciation practice
- Conversation history with search and filtering capabilities
- Phrase Lists: named collections (e.g. Restaurant, Job Interview) with full CRUD
  - Autocomplete/autosuggest on Chinese input using a built-in 100+ phrase dictionary
  - AI-powered pinyin + English auto-population via lookup endpoint
  - Practice sessions launchable from any list
- Flashcards: HSK 1–6 levels (~2,000 words total) with flip animation
- Media mode: scan images for Chinese text (OCR) or upload videos/audio for bilingual captions
- Progress tracking through conversation metrics
- Desktop responsive layout: Shadcn sidebar (13rem, collapsible=none) on md+ screens, mobile bottom tabs on small screens
- Content width constrained to max-w-5xl mx-auto on desktop; multi-column grids (lg:grid-cols-3) for topics and flashcard categories

## External Dependencies

**Core Framework Dependencies**
- React 18 with TypeScript for frontend development
- Express.js for backend API server
- Vite for development server and build tooling
- Drizzle ORM with PostgreSQL support via Neon Database

**UI and Styling**
- Tailwind CSS for utility-first styling
- shadcn/ui component library with Radix UI primitives
- Lucide React for consistent iconography
- Google Fonts (Inter and Noto Sans SC) for typography

**State Management and Data Fetching**
- TanStack Query for server state management and caching
- React Hook Form with Zod resolvers for form handling
- Wouter for lightweight client-side routing

**Audio and AI Services**
- OpenAI API for speech transcription (Whisper) and text generation (GPT-4 / GPT-4o-mini)
- Groq API (whisper-large-v3-turbo) for fast video/audio transcription with timestamps
- Browser MediaRecorder API for audio capture
- Multer for server-side file upload handling

**OCR**
- tesseract.js for server-side image OCR (Chinese Simplified + English)

**Development and Production**
- tsx for TypeScript execution in development
- esbuild for production bundling
- PostCSS with Autoprefixer for CSS processing
- Environment variable management for API keys and database URLs

**Database and Storage**
- PostgreSQL database (configured for Neon Database)
- Drizzle Kit for database migrations and schema management

## Environment Variables Required
- OPENAI_API_KEY — OpenAI GPT + Whisper
- GROQ_API_KEY — Groq Whisper for media captions
- DATABASE_URL — PostgreSQL connection string
- SUPABASE_URL / SUPABASE_ANON_KEY — Supabase Auth verification
- SUPABASE_SERVICE_ROLE_KEY — preferred server-side Supabase Auth key
- VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — browser Supabase client
