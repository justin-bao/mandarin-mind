<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Mandarin Mind Node.js/Express server. Two files were created (`server/posthog.ts`, `posthog-setup-report.md`) and two were modified (`server/routes.ts`, `server/app.ts`). The `posthog-node` package was added as a dependency. Environment variables `POSTHOG_API_KEY` and `POSTHOG_HOST` were written to `.env.local`.

**Key changes:**

- **`server/posthog.ts`** — Singleton PostHog client initialized from environment variables with `enableExceptionAutocapture: true`. Graceful shutdown hooks registered for `SIGINT`/`SIGTERM`.
- **`server/app.ts`** — `posthog.identify()` called each time a user is authenticated via Supabase, associating their `id` and `email` as a person profile. `posthog.captureException()` added to the Express error middleware to capture unhandled server errors.
- **`server/routes.ts`** — `posthog.capture()` calls added across 13 route handlers covering conversations, practice words, phrase lists, flashcard sessions, media uploads, translations, and AI feature usage.

| Event Name | Description | File |
|---|---|---|
| `conversation created` | User creates a new Mandarin conversation session | `server/routes.ts` |
| `conversation audio message sent` | User sends an audio message and receives an AI response | `server/routes.ts` |
| `practice word added` | User adds a word to their practice word list | `server/routes.ts` |
| `practice word deleted` | User removes a word from their practice word list | `server/routes.ts` |
| `phrase list created` | User creates a new phrase list | `server/routes.ts` |
| `phrase list deleted` | User deletes a phrase list | `server/routes.ts` |
| `phrase list item added` | User adds a phrase to a phrase list | `server/routes.ts` |
| `flashcard session started` | User starts a new flashcard study session | `server/routes.ts` |
| `flashcard session completed` | User completes a flashcard session | `server/routes.ts` |
| `example sentence generated` | User requests an AI-generated example sentence | `server/routes.ts` |
| `sentence translated` | User translates a sentence (en-zh or zh-en) | `server/routes.ts` |
| `media image uploaded` | User uploads an image for OCR text extraction | `server/routes.ts` |
| `media video uploaded` | User uploads a video/audio file for caption generation | `server/routes.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1553704)
- [Conversations Created Over Time](/insights/byYfJ9ca) — daily trend of new conversation sessions
- [AI Feature Usage](/insights/bD1giM1E) — audio messages, translations, and example sentence generation over time
- [Flashcard Study Funnel](/insights/M2HBS1hL) — conversion rate from session started → session completed
- [Media Uploads](/insights/ok9oiVeY) — image and video/audio upload volume
- [Vocabulary Building Activity](/insights/ZfQMnyuI) — practice words and phrase list items added over time

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
