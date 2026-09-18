// Test-only deterministic adapter. Deliberately absent from the production registry.
import type {
  AudioInput,
  ExtractionContext,
  SummaryFact,
  TextProvider,
  VoiceProvider,
} from "../../src/lib/ai/contracts.ts";
export class MockAIAdapter implements VoiceProvider, TextProvider {
  async transcribe(_audio: AudioInput, _instruction: string): Promise<unknown> {
    return {
      transcript: "আজ বাজারে ৫০০ টাকা, রিকশায় ৬০ টাকা আর দুপুরের খাবারে ১৫০ টাকা খরচ হয়েছে।",
      no_speech: false,
    };
  }
  async extract(
    input: string,
    _context: ExtractionContext,
    _instruction: string,
  ): Promise<unknown> {
    if (input === "ambiguous")
      return {
        entries: [
          {
            title: "বাজার",
            amount: null,
            category_id: "groceries",
            date: null,
            issue: "পরিমাণ স্পষ্ট নয়।",
          },
        ],
      };
    return {
      entries: [
        { title: "বাজার", amount: "৫০০", category_id: "groceries", date: "today", issue: null },
        { title: "রিকশা ভাড়া", amount: "60", category_id: "transport", date: null, issue: null },
        { title: "দুপুরের খাবার", amount: "১৫০", category_id: "food", date: "today", issue: null },
      ],
    };
  }
  async summarize(facts: SummaryFact[], _instruction: string): Promise<unknown> {
    return {
      fact_ids: facts.slice(0, 6).map((f) => f.id),
      closing: facts.some((f) => f.id.startsWith("overrun-"))
        ? "review-overruns"
        : "review-categories",
    };
  }
}
