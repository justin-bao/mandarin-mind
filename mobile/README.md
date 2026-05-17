# MandarinMind Mobile

This is the Expo React Native mobile client for MandarinMind. It supports iOS and Android while using the same Supabase Auth project and the same Express `/api/*` backend as the web app.

## Setup

```bash
cd mobile
npm install
cp .env.example .env
```

Set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

For the iOS simulator, `http://localhost:5000` reaches the dev server on your Mac. For the Android emulator, use `http://10.0.2.2:5000`. For a physical iPhone or Android phone, use your Mac's LAN URL, for example `http://192.168.1.20:5000`.

## Run

Start the existing backend from the repo root:

```bash
npm run dev
```

Then start the iOS app:

```bash
cd mobile
npm run ios
```

Or start the Android app:

```bash
cd mobile
npm run android
```

## Included Mobile Flows

- Supabase email/password sign-in and registration
- Current-user loading through `GET /api/auth/me`
- Guided and free-form conversations
- In-app grammar checker for Chinese corrections and tone/authenticity feedback
- iOS and Android microphone recording uploaded to `POST /api/conversations/:id/audio`
- Conversation history and message playback
- Phrase list creation, phrase lookup, and phrase saving
- Offline phrase-list cache for existing account data, with queued item sync after reconnect
- Offline creation of new phrase lists, including phrase additions before the list receives its server ID
- Offline exact-match dictionary lookup and translation for common phrases when adding new entries

The bundled offline dictionary is intentionally small and exact-match based. General offline translation for arbitrary new phrases would require a substantially larger dictionary bundle or an on-device translation model.
- Starter flashcards with session creation against the backend
- Settings with account, AI usage, API base URL, and sign out
