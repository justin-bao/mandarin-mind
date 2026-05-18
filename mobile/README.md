# MandarinMind Mobile

This is the Expo React Native mobile client for MandarinMind. It supports iOS and Android while using the same Supabase Auth project and the same Express `/api/*` backend as the web app.

## Setup

```bash
cd mobile
npm install
```

Create your real local and production env files from the committed examples:

```bash
cp .env.local.example .env.localdev
cp .env.production.example .env.production
```

Edit `.env.localdev` and `.env.production` with real values. The npm scripts below copy the selected source into `.env.local`, which Expo reads as the active mobile configuration.

The files only contain `EXPO_PUBLIC_*` values, so they are safe client-side values, but `.env.local` is still ignored to avoid accidental machine-specific churn.

For a local backend:
- iOS simulator: `http://localhost:5000`
- Android emulator: `http://10.0.2.2:5000`
- Physical phone: your Mac LAN URL, for example `http://192.168.1.20:5000`

For the deployed backend, use the stable Vercel production origin, for example `https://your-production-domain.vercel.app`, without `/api`.

## Run

To run against the local backend, start the existing backend from the repo root:

```bash
npm run dev
```

Then from `mobile/` run:

```bash
npm run ios:local
```

For a physical iPhone against your local Mac backend:

```bash
npm run ios:local:device
```

For Android against the local backend:

```bash
npm run android:local
```

To run against the deployed backend:

```bash
npm run ios:prod
npm run android:prod
```

For a standalone release build installed directly onto a physical iPhone:

```bash
npm run ios:prod:device
```

`ios:prod` and `ios:prod:device` build with the iOS `Release` configuration, so the app bundles its JavaScript and does not require Metro after installation. `ios:local` remains a faster debug build for normal development.

To start Metro without immediately building native code:

```bash
npm run start:local
npm run start:prod
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
- Starter flashcards with session creation against the backend
- Settings with account, AI usage, API base URL, and sign out

The bundled offline dictionary is intentionally small and exact-match based. General offline translation for arbitrary new phrases would require a substantially larger dictionary bundle or an on-device translation model.
