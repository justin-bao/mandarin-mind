# Frontend Implementation Summary

MandarinMind's frontend is a Vite + React application rooted at `client/src/main.tsx`.
`client/src/App.tsx` provides the top-level application shell, React Query provider,
tooltips, toasts, authentication gate, desktop sidebar, mobile tabs, and the main
tab state machine.

## App Shell And Navigation

- `AppShell` calls `/api/auth/me` through `getQueryFn({ on401: "returnNull" })`.
  The query helper attaches the current Supabase access token when present.
  Unauthenticated users see `pages/AuthPage.tsx`; authenticated users enter `MainApp`.
- `MainApp` owns the cross-feature UI state: active tab, conversation subtab,
  selected topic, selected conversation id, active conversation mode, practice words,
  and whether recording is in progress.
- `AppSidebar.tsx` and `NavigationTabs.tsx` expose the same major modes:
  conversation, phrase practice, flashcards, media, and settings.
- Recording state intentionally blocks navigation/topic changes so the user cannot
  leave the active audio flow mid-recording.

## Authentication

- `pages/AuthPage.tsx` contains Supabase email/password sign-in, account creation,
  and Google OAuth entry points.
- Login, registration, Google OAuth, token refresh, and sign-out use the browser
  Supabase client in `lib/supabase.ts`.
- On auth changes, React Query invalidates `/api/auth/me` and clears other
  user-scoped query data so the backend profile is refetched with the new token.
- Client-side validation checks registration password confirmation and minimum length
  before sending the request.

## API Layer And Query Behavior

- `lib/queryClient.ts` centralizes JSON fetches, bearer auth headers, error handling,
  and React Query defaults.
- `lib/supabase.ts` creates the browser Supabase client and exposes helpers for
  reading the current access token and auth headers.
- `lib/api.ts` groups typed-ish API helpers for conversations, practice words,
  phrase lists, phrase lookup, sentence translation, audio generation, microphone
  recording, and audio playback.
- Most screen components call API helpers through React Query `useQuery` and
  `useMutation`, then invalidate affected query keys after successful mutations.

## Conversation Flow

- `TopicSelector.tsx` displays built-in practice topics with Chinese labels and
  difficulty badges.
- `ConversationInterface.tsx` creates a conversation when mounted unless it receives
  an existing `conversationId`.
- Messages are loaded from `/api/conversations/:id/messages` and rendered with
  `ConversationBubble.tsx`.
- `VoiceRecorder.tsx` captures microphone audio using `MediaRecorder`. When recording
  completes, `ConversationInterface` posts the audio blob to
  `/api/conversations/:id/audio`, then invalidates the message query to show the user
  and AI messages returned by the backend.
- `ConversationHistory.tsx` lists previous conversations and lets `App.tsx` reopen
  one by passing the saved id back into `ConversationInterface`.

## Phrase Lists And Practice

- `PhraseListsManager.tsx` is the main phrase CRUD workspace.
- It can create, rename, describe, and delete phrase lists; add/edit/delete phrases;
  look up pinyin/English; generate example sentences; play generated audio; and start
  a practice session from a selected list.
- It uses `SentenceTranslator.tsx` and the exported selection popup helpers to let
  users translate selected Chinese text and save selected phrases into a list.
- `WordPractice.tsx` appears to be a legacy practice component retained alongside the
  newer list-driven practice flow.

## Flashcards

- `Flashcards.tsx` supports two deck sources:
  user phrase lists from the backend and built-in discovery decks from `data/vocab.ts`.
- Study sessions progress through setup, session, and summary screens.
- Session history is stored in `localStorage` under
  `mandarin-mind.flashcard-sessions` and capped to the most recent 50 sessions.

## Media Learning

- `MediaMode.tsx` lists uploaded media, handles image/audio/video uploads, tracks
  server-sent progress events, opens processed items, and deletes media.
- Image uploads post to `/api/media/upload/image` and expect OCR blocks.
- Video/audio uploads post to `/api/media/upload/video` and expect caption segments.
- `ProcessingProgressSheet.tsx` displays upload/OCR/transcription/translation steps.
- `ImageOCRViewer.tsx` displays OCR text overlays/blocks for images.
- `MediaCaptionPlayer.tsx` coordinates video/audio playback with timed captions.

## Styling And Shared UI

- Styling is Tailwind-based with shadcn/Radix-style primitives in
  `client/src/components/ui`.
- `index.css`, `tailwind.config.ts`, and `components.json` define the design tokens,
  utility behavior, and component conventions.
- `ThemeToggle.tsx` uses the app's theme infrastructure to switch light/dark mode.

## Files To Read First

1. `client/src/App.tsx` for overall frontend state and routing.
2. `client/src/lib/api.ts` and `client/src/lib/queryClient.ts` for network behavior.
3. `client/src/components/ConversationInterface.tsx` for the live conversation flow.
4. `client/src/components/PhraseListsManager.tsx` for phrase-list workflows.
5. `client/src/components/Flashcards.tsx` for study sessions and local history.
6. `client/src/components/MediaMode.tsx` for upload/SSE/media interactions.
