# MandarinMind Keyboard Assistant

MandarinMind Keyboard is a companion input assistant for Chinese writing. It calls the existing MandarinMind backend endpoint:

```http
POST /api/keyboard/analyze
Authorization: Bearer <Supabase access token>
Content-Type: application/json

{ "text": "wo xiang 去商店" }
```

The backend returns corrected Chinese, pinyin, translation, issue-level suggestions, and tone/authenticity feedback.

## What It Checks

- Pinyin typed where Chinese characters are expected
- Likely wrong characters or homophones
- Awkward grammar and word choice
- Punctuation and sentence polish
- Tone/register: local casual, neutral natural, formal, awkward, or mixed

## Clients

- [ios](/Users/Justin/personal_projects/mandarin-mind/keyboard/ios): Swift custom keyboard extension scaffold for iOS.
- [desktop](/Users/Justin/personal_projects/mandarin-mind/keyboard/desktop): Electron floating desktop widget scaffold.

Both clients are thin shells over the same authenticated backend analysis API, so improvements to the model prompt or output format benefit both platforms.
