# iOS Keyboard Extension

This folder contains a Swift custom keyboard extension scaffold for MandarinMind Keyboard.

Expo managed apps cannot directly define an iOS keyboard extension in `app.json`; this needs to be added in Xcode as a native target. Use the existing Expo app for the main app, and add this extension target when generating or maintaining the native iOS project.

## Xcode Setup

1. Open or generate the native iOS project for the mobile app.
2. Add a new target: `File > New > Target > iOS > Custom Keyboard Extension`.
3. Name it `MandarinMindKeyboard`.
4. Replace the generated `KeyboardViewController.swift` and `Info.plist` with the files in this folder.
5. Enable `RequestsOpenAccess` in the extension `Info.plist`; network access is required to call the MandarinMind backend.
6. Share Supabase session/token data from the containing app using an App Group, or prompt the user to paste a short-lived access token during early development.

## Development Configuration

Set these values inside `KeyboardViewController.swift` while wiring the containing app:

```swift
private let apiBaseURL = "https://your-mandarinmind-host.com"
private var accessToken: String? = nil
```

The extension posts selected text to `/api/keyboard/analyze` and displays:

- Corrected text
- Pinyin
- Tone/authenticity summary
- Issue list with replacements

The keyboard can insert the corrected text back into the active field.
