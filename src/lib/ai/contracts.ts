import type { Category } from "../domain/types.ts";
export type AudioInput = { bytes: Uint8Array; mimeType: "audio/wav"; durationSeconds: number };
export type ExtractionContext = {
  today: string;
  timeZone: "Asia/Dhaka";
  categories: Pick<Category, "id" | "name_bn" | "name_en">[];
};
export type SummaryFact = { id: string; heading: string; body: string };
export interface VoiceProvider {
  transcribe(audio: AudioInput, instruction: string): Promise<unknown>;
}
export interface TextProvider {
  extract(text: string, context: ExtractionContext, instruction: string): Promise<unknown>;
  summarize(facts: SummaryFact[], instruction: string): Promise<unknown>;
}
export type ProviderCapabilities = {
  voice: { available: boolean; reason: string; label: string };
  text: { available: boolean; reason: string; label: string };
  maxAudioSeconds: number;
  maxAudioBytes: number;
};
