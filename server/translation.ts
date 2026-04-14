import { pinyin as getPinyinLib } from 'pinyin-pro';

/**
 * Convert Chinese text to pinyin with tone marks using pinyin-pro (offline, free).
 */
export function chineseToPinyin(text: string): string {
  return getPinyinLib(text, { toneType: 'symbol', separator: ' ' });
}

/**
 * Translate Chinese text to English using the MyMemory free API.
 * No API key required. Limit: 5000 chars/day per IP (plenty for phrase lookups).
 */
export async function translateChineseToEnglish(text: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=zh|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      responseData: { translatedText: string };
      quotaFinished: boolean;
    };
    if (data.quotaFinished) {
      throw new Error('MyMemory daily quota reached');
    }
    // MyMemory sometimes appends stray "+" characters — strip them
    return data.responseData.translatedText.replace(/\+$/, '').trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

/**
 * Lookup a Chinese phrase: returns pinyin (offline) + English translation (free API).
 */
export async function lookupPhrase(chinese: string): Promise<{ pinyin: string; english: string }> {
  const pinyinResult = chineseToPinyin(chinese);
  const english = await translateChineseToEnglish(chinese);
  return { pinyin: pinyinResult, english };
}

/**
 * Translate English text to Chinese using the MyMemory free API.
 */
export async function translateEnglishToChinese(text: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      responseData: { translatedText: string };
      quotaFinished: boolean;
    };
    if (data.quotaFinished) throw new Error('MyMemory daily quota reached');
    return data.responseData.translatedText.replace(/\+$/, '').trim();
  } catch (error) {
    console.error('English→Chinese translation error:', error);
    throw error;
  }
}

/**
 * Tokenise a Chinese sentence into per-character tokens with pinyin.
 * Punctuation / spaces are returned with an empty pinyin string.
 */
export function tokenizeSentence(text: string): { char: string; pinyin: string }[] {
  const pinyinArr = (getPinyinLib as unknown as (t: string, opts: object) => string[])(
    text,
    { toneType: 'symbol', type: 'array' }
  );

  return Array.from(text).map((char, i) => ({
    char,
    pinyin: pinyinArr[i] ?? '',
  }));
}

/**
 * Full sentence translation.
 * direction = 'zh-en' (default): Chinese input → annotated tokens + English translation
 * direction = 'en-zh': English input → Chinese translation, then annotated tokens + original English
 */
export async function translateSentence(
  text: string,
  direction: 'zh-en' | 'en-zh' = 'zh-en'
): Promise<{
  tokens: { char: string; pinyin: string }[];
  chinese: string;
  translation: string;
}> {
  if (direction === 'en-zh') {
    const chinese = await translateEnglishToChinese(text);
    const tokens = tokenizeSentence(chinese);
    return { tokens, chinese, translation: text };
  }
  const [tokens, translation] = await Promise.all([
    Promise.resolve(tokenizeSentence(text)),
    translateChineseToEnglish(text),
  ]);
  return { tokens, chinese: text, translation };
}
