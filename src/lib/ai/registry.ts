import "server-only";
import { aiConfig } from "./config.ts";
import { GeminiAdapter } from "./adapters/gemini.ts";
import type { TextProvider, VoiceProvider } from "./contracts.ts";
import { AppError } from "../server/errors.ts";
// Register additional real adapters here; test mocks are NOT registered or shipped in this factory.
const voiceRegistry: Record<string, () => VoiceProvider> = {
  gemini: () => new GeminiAdapter(aiConfig()),
};
const textRegistry: Record<string, () => TextProvider> = {
  gemini: () => new GeminiAdapter(aiConfig()),
};
function available(kind: "voice" | "text") {
  const c = aiConfig();
  const provider = kind === "voice" ? c.voiceProvider : c.textProvider;
  if (provider === "disabled") throw new AppError("AI_UNAVAILABLE", "এই AI সুবিধাটি বন্ধ আছে।", 503);
  if (provider === "gemini" && !c.apiKey)
    throw new AppError(
      "AI_UNAVAILABLE",
      "Gemini API key সেটআপ করা হয়নি। ম্যানুয়াল এন্ট্রি ব্যবহার করুন।",
      503,
    );
  return provider;
}
export function voiceProvider(): VoiceProvider {
  const factory = voiceRegistry[available("voice")];
  if (!factory) throw new AppError("AI_UNAVAILABLE", "Voice provider adapter ইনস্টল করা নেই।", 503);
  return factory();
}
export function textProvider(): TextProvider {
  const factory = textRegistry[available("text")];
  if (!factory) throw new AppError("AI_UNAVAILABLE", "Text provider adapter ইনস্টল করা নেই।", 503);
  return factory();
}
