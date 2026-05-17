# MandarinMind Desktop Keyboard Widget

This is a lightweight Electron floating widget for Chinese writing feedback. It is intentionally separate from the main web app so it can sit above other desktop apps while you type.

## Run

```bash
cd keyboard/desktop
npm install
MANDARIN_MIND_API_BASE_URL=http://localhost:5000 \
MANDARIN_MIND_ACCESS_TOKEN=<supabase-access-token> \
npm start
```

The widget posts text to `POST /api/keyboard/analyze` and shows:

- Corrected Chinese
- Pinyin and translation
- Character/pinyin/grammar issues
- Tone and authenticity score

## Notes

Global replacement into arbitrary apps requires platform-specific accessibility permissions and pasteboard automation. This first version keeps the safer workflow: analyze text, copy the corrected result, and paste it where needed.
