# Mandarin Language Tutor App - Design Guidelines

## Design Approach
**Selected Approach**: Design System (Material Design inspired)
**Justification**: This is a utility-focused educational app requiring clear information hierarchy, consistent patterns, and optimal learnability. The app handles complex data (Chinese characters, pinyin, translations) and needs standardized interaction patterns.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light Mode: 37 85% 53% (vibrant blue-green for learning focus)
- Dark Mode: 37 70% 45% (muted version for eye comfort)

**Surface Colors:**
- Light backgrounds with subtle 220 15% 97% tinting
- Dark mode: 220 15% 12% backgrounds with 220 20% 18% elevated surfaces

**Semantic Colors:**
- Success (correct pronunciation): 142 69% 58%
- Warning (needs practice): 45 93% 58%
- Text hierarchy: High contrast black/white with 220 15% 55% for secondary text

### Typography
**Primary Font**: Inter (clean, multilingual support)
**Chinese Font**: Noto Sans SC (excellent CJK character rendering)
**Hierarchy:**
- Headers: 24px/32px bold
- Body text: 16px/24px regular
- Chinese characters: 20px/28px medium (enhanced readability)
- Pinyin: 14px/20px regular, italicized
- Translations: 14px/20px regular, muted color

### Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12, 16
- Tight spacing (p-2, m-2) for inline elements like pinyin
- Standard spacing (p-4, p-6) for cards and sections
- Generous spacing (p-8, p-12) for main content areas and conversation bubbles

### Component Library

**Navigation:**
- Bottom tab bar with 4 sections: Conversation, Practice, History, Settings
- Floating action button for quick voice input
- Top app bar with conversation status and controls

**Conversation Interface:**
- Chat-style bubbles with generous padding (p-6)
- User messages: right-aligned, primary color background
- Tutor messages: left-aligned, neutral surface color
- Embedded transcription cards showing Chinese characters, pinyin, and tap-to-translate functionality

**Forms & Controls:**
- Topic selection: Grid of topic cards with icons
- Voice controls: Large, circular record button with visual feedback
- Practice word input: Clean text field with character counter

**Data Display:**
- Conversation history: Timeline-style list with search functionality
- Translation tooltips: Subtle overlay with English text
- Progress indicators: Linear progress bars for session tracking

**Interactive Elements:**
- Tappable Chinese text with subtle underline hint
- Voice recording with animated waveform visualization
- Topic cards with hover states and clear categorization

## Key Design Principles

1. **Clarity First**: Prioritize readability of Chinese characters and clear visual hierarchy
2. **Touch-Optimized**: Large tap targets for character selection and voice controls
3. **Consistent Feedback**: Visual and audio cues for all user actions
4. **Progressive Disclosure**: Complex features revealed contextually
5. **Accessibility**: High contrast ratios and screen reader support for language learning

## Images
**Minimal Visual Assets:**
- Topic selection icons (dining, travel, business): Simple line icons from Heroicons
- No hero images - focus on functional interface
- Subtle background patterns only if needed for visual separation
- Avatar placeholder for AI tutor (optional, small circular image)

This design emphasizes functionality and learning effectiveness over decorative elements, ensuring users can focus on language practice without visual distractions.