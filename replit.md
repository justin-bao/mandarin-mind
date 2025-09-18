# Mandarin Language Tutor App

## Overview

This is a Mandarin language learning application that provides interactive conversation practice with an AI tutor. The app focuses on speech-to-speech interaction, allowing users to practice pronunciation and conversation skills through real-time audio transcription and AI-generated responses. Users can engage in topic-based conversations, practice with custom word lists, and track their learning progress through conversation history.

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
- Memory-based storage implementation with interface for future database integration
- Middleware for request logging and error handling
- File upload handling via multer for audio processing

**Audio Processing**
- Browser-based audio recording using MediaRecorder API
- WebM audio format with Opus codec for optimal quality and compression
- Audio transcription through OpenAI Whisper API
- Real-time speech-to-text conversion for user input

**AI Integration**
- OpenAI GPT integration for conversational AI tutor responses
- Context-aware conversation management with topic and difficulty tracking
- Structured response generation including Chinese text, pinyin, and English translations
- Conversation history tracking for context continuity

**Data Models**
- Conversations: Track learning sessions with topics, difficulty levels, and metadata
- Messages: Store conversation exchanges with multilingual content (Chinese, pinyin, English)
- Practice Words: Custom vocabulary lists for targeted learning
- Database schema designed for PostgreSQL with Drizzle ORM

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
- Custom word practice lists for personalized learning
- Progress tracking through conversation metrics

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
- OpenAI API for speech transcription (Whisper) and text generation (GPT)
- Browser MediaRecorder API for audio capture
- Multer for server-side file upload handling

**Development and Production**
- tsx for TypeScript execution in development
- esbuild for production bundling
- PostCSS with Autoprefixer for CSS processing
- Environment variable management for API keys and database URLs

**Database and Storage**
- PostgreSQL database (configured for Neon Database)
- connect-pg-simple for session storage
- Drizzle Kit for database migrations and schema management