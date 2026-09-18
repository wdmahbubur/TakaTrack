import { record, text } from "../validation/input.ts";
export const transcriptionSchema = {
  type: "object",
  properties: { transcript: { type: "string" }, no_speech: { type: "boolean" } },
  required: ["transcript", "no_speech"],
  additionalProperties: false,
};
export const extractionSchema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          amount: { type: ["string", "null"] },
          category_id: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          issue: { type: ["string", "null"] },
        },
        required: ["title", "amount", "category_id", "date", "issue"],
        additionalProperties: false,
      },
    },
  },
  required: ["entries"],
  additionalProperties: false,
};
export const summarySchema = {
  type: "object",
  properties: {
    fact_ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
    closing: { type: "string", enum: ["review-categories", "review-overruns", "keep-recording"] },
  },
  required: ["fact_ids", "closing"],
  additionalProperties: false,
};
export type ExtractedEntry = {
  title: string | null;
  amount: string | null;
  category_id: string | null;
  date: string | null;
  issue: string | null;
};
function nullable(value: unknown, max: number): string | null {
  return value === null ? null : text(value, "AI output", max, 0);
}
function onlyKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("Unexpected AI output property");
}
export function validateExtraction(value: unknown): { entries: ExtractedEntry[] } {
  const v = record(value);
  onlyKeys(v, ["entries"]);
  if (!Array.isArray(v.entries) || v.entries.length > 20) throw new Error("Invalid AI entries");
  return {
    entries: v.entries.map((entry: unknown) => {
      const e = record(entry);
      onlyKeys(e, ["title", "amount", "category_id", "date", "issue"]);
      return {
        title: nullable(e.title, 120),
        amount: nullable(e.amount, 24),
        category_id: nullable(e.category_id, 40),
        date: nullable(e.date, 40),
        issue: nullable(e.issue, 200),
      };
    }),
  };
}
export function validateTranscript(value: unknown) {
  const v = record(value);
  onlyKeys(v, ["transcript", "no_speech"]);
  if (typeof v.no_speech !== "boolean") throw new Error("Invalid transcription response");
  return { transcript: text(v.transcript, "transcript", 4000, 0), noSpeech: v.no_speech };
}
export function validateSummary(value: unknown, allowedIds: readonly string[]) {
  const v = record(value);
  onlyKeys(v, ["fact_ids", "closing"]);
  if (
    !Array.isArray(v.fact_ids) ||
    v.fact_ids.length < 1 ||
    v.fact_ids.length > 6 ||
    v.fact_ids.some((id) => typeof id !== "string" || !allowedIds.includes(id))
  )
    throw new Error("Unsupported summary fact");
  if (!["review-categories", "review-overruns", "keep-recording"].includes(String(v.closing)))
    throw new Error("Unsupported conclusion");
  return { factIds: [...new Set(v.fact_ids as string[])], closing: String(v.closing) };
}
