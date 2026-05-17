export class AiUsageBudgetExceededError extends Error {
  constructor(message = "AI usage budget exceeded") {
    super(message);
    this.name = "AiUsageBudgetExceededError";
  }
}

export type AiFeature =
  | "conversation.transcription"
  | "conversation.response"
  | "conversation.annotation"
  | "conversation.speech"
  | "phrase.example_sentence"
  | "keyboard.analysis"
  | "media.transcription"
  | "media.translation";

export interface AiUsageCharge {
  feature: AiFeature;
  provider: "openai" | "groq";
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  durationSeconds?: number | null;
  billableUnits?: number | null;
  costUsdMicros: number;
  metadata?: Record<string, unknown> | null;
}

const USD_MICROS = 1_000_000;

const OPENAI_CHAT_PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-4": { input: 30, output: 60 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

const OPENAI_AUDIO_PRICES = {
  whisperUsdPerMinute: 0.006,
  ttsUsdPerMillionCharacters: 15,
};

const GROQ_AUDIO_PRICES = {
  whisperLargeV3TurboUsdPerHour: 0.04,
};

function usdToMicros(usd: number): number {
  return Math.max(1, Math.ceil(usd * USD_MICROS));
}

export function calculateOpenAIChatCostUsdMicros(
  model: string,
  inputTokens = 0,
  outputTokens = 0
): number {
  const prices = OPENAI_CHAT_PRICES_PER_MILLION[model];
  if (!prices) return 0;
  return usdToMicros((inputTokens / 1_000_000) * prices.input + (outputTokens / 1_000_000) * prices.output);
}

export function calculateOpenAIWhisperCostUsdMicros(durationSeconds: number): number {
  return usdToMicros((durationSeconds / 60) * OPENAI_AUDIO_PRICES.whisperUsdPerMinute);
}

export function calculateOpenAITtsCostUsdMicros(characterCount: number): number {
  return usdToMicros((characterCount / 1_000_000) * OPENAI_AUDIO_PRICES.ttsUsdPerMillionCharacters);
}

export function calculateGroqWhisperCostUsdMicros(durationSeconds: number): number {
  return usdToMicros((durationSeconds / 3600) * GROQ_AUDIO_PRICES.whisperLargeV3TurboUsdPerHour);
}
