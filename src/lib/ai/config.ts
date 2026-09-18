import "server-only";
import type { ProviderCapabilities } from "./contracts.ts";
function integer(name: string, fallback: number, min: number, max: number) {
  const n = Number(process.env[name] ?? fallback);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}
export function aiConfig() {
  return {
    voiceProvider: process.env.VOICE_AI_PROVIDER ?? "gemini",
    textProvider: process.env.TEXT_AI_PROVIDER ?? "gemini",
    apiKey: process.env.GEMINI_API_KEY ?? "",
    voiceModel: process.env.GEMINI_VOICE_MODEL ?? "gemini-2.5-flash",
    textModel: process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash",
    timeout: integer("AI_REQUEST_TIMEOUT_MS", 30000, 1000, 40000),
    maxAudioSeconds: integer("AUDIO_MAX_DURATION_SECONDS", 60, 1, 60),
    maxAudioBytes: integer("AUDIO_MAX_UPLOAD_BYTES", 2000000, 32044, 2500000),
  };
}
export function aiCapabilities(): ProviderCapabilities {
  const c = aiConfig();
  const capability = (provider: string) => ({
    available: provider === "gemini" && Boolean(c.apiKey),
    label: provider === "gemini" ? "Google Gemini" : provider,
    reason:
      provider === "disabled"
        ? "এই AI সুবিধাটি বন্ধ আছে।"
        : provider !== "gemini"
          ? "এই AI provider-এর adapter ইনস্টল করা নেই।"
          : !c.apiKey
            ? "Gemini API key সেটআপ করা হয়নি। ম্যানুয়াল এন্ট্রি ব্যবহার করুন।"
            : "",
  });
  return {
    voice: capability(c.voiceProvider),
    text: capability(c.textProvider),
    maxAudioSeconds: Math.min(c.maxAudioSeconds, Math.floor((c.maxAudioBytes - 44) / 32000)),
    maxAudioBytes: c.maxAudioBytes,
  };
}
