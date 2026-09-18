import "server-only";
import { randomUUID } from "node:crypto";
import { voiceProvider, textProvider } from "./registry.ts";
import { aiCapabilities } from "./config.ts";
import { EXTRACT_PROMPT, SUMMARY_PROMPT, TRANSCRIBE_PROMPT } from "./prompts.ts";
import { normalizeDrafts, editableTranscript, makeSummaryFacts, renderSummary } from "./core.ts";
import { verifiedSession } from "../server/auth.ts";
import { getCategories, getReport } from "../server/data.ts";
import { AppError, dbError } from "../server/errors.ts";
import { todayDhaka } from "../domain/dates.ts";
import { validateWav } from "../audio/wav.ts";
async function quota(kind: string) {
  const { db } = await verifiedSession();
  const { data, error } = await db.rpc("consume_ai_quota", { p_kind: kind });
  dbError(error);
  if (!data)
    throw new AppError(
      "AI_RATE_LIMIT",
      "আপনার AI অনুরোধের সীমা পূর্ণ হয়েছে (প্রতি মিনিটে ৮টি, দিনে ৬০টি)। পরে চেষ্টা করুন।",
      429,
    );
}
export async function extractExpenses(text: string, method: "ai_text" | "ai_voice") {
  await verifiedSession();
  const provider = textProvider();
  const categories = await getCategories();
  await quota("extract");
  const today = todayDhaka();
  const output = await provider.extract(
    text,
    {
      today,
      timeZone: "Asia/Dhaka",
      categories: categories
        .filter((c) => c.type === "expense")
        .map(({ id, name_bn, name_en }) => ({ id, name_bn, name_en })),
    },
    EXTRACT_PROMPT,
  );
  try {
    return { drafts: normalizeDrafts(output, categories, today, method, randomUUID), today };
  } catch {
    throw new AppError(
      "AI_INVALID_OUTPUT",
      "AI-এর তথ্য সঠিক বিন্যাসে আসেনি। আরও স্পষ্টভাবে লিখে আবার চেষ্টা করুন।",
      502,
    );
  }
}
export async function transcribeAudio(bytes: Uint8Array, mimeType: string) {
  await verifiedSession();
  const provider = voiceProvider();
  const config = aiCapabilities();
  if (mimeType !== "audio/wav")
    throw new AppError("INVALID_AUDIO", "শুধু অ্যাপের রেকর্ড করা WAV অডিও গ্রহণ করা হয়।", 415);
  let metadata;
  try {
    metadata = validateWav(bytes, config.maxAudioSeconds, config.maxAudioBytes);
  } catch (error) {
    throw new AppError(
      "INVALID_AUDIO",
      error instanceof Error && error.message === "AUDIO_SILENCE"
        ? "স্পষ্ট কোনো শব্দ শোনা যায়নি। আবার রেকর্ড করুন অথবা লিখুন।"
        : "অডিওর ফরম্যাট, দৈর্ঘ্য বা আকার সঠিক নয়। আবার রেকর্ড করুন।",
      400,
    );
  }
  await quota("transcribe");
  const output = await provider.transcribe(
    { bytes, mimeType: "audio/wav", durationSeconds: metadata.durationSeconds },
    TRANSCRIBE_PROMPT,
  );
  try {
    return { transcript: editableTranscript(output) };
  } catch (error) {
    throw new AppError(
      "AI_TRANSCRIPTION",
      error instanceof Error && error.message === "NO_SPEECH"
        ? "বোঝার মতো কথা শোনা যায়নি। আবার রেকর্ড করুন বা লিখুন।"
        : "অডিওর উত্তর পড়া যায়নি। আবার চেষ্টা করুন।",
      422,
    );
  }
}
export async function generateSummary(month: string) {
  await verifiedSession();
  const provider = textProvider();
  const report = await getReport(month);
  if (report.current.count === 0) throw new AppError("NO_DATA", "এই মাসে এখনো কোনো লেনদেন নেই।");
  await quota("summary");
  const facts = makeSummaryFacts(
    report.current,
    report.previous,
    report.categories,
    report.periods.label,
  );
  const output = await provider.summarize(facts, SUMMARY_PROMPT);
  try {
    return renderSummary(output, facts, report.version);
  } catch {
    throw new AppError("AI_INVALID_OUTPUT", "AI যাচাইকৃত তথ্য বেছে নিতে পারেনি। আবার চেষ্টা করুন।", 502);
  }
}
