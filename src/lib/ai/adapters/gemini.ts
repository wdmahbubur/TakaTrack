import "server-only";
import type {
  AudioInput,
  ExtractionContext,
  SummaryFact,
  TextProvider,
  VoiceProvider,
} from "../contracts.ts";
import { extractionSchema, summarySchema, transcriptionSchema } from "../schemas.ts";
import { AppError } from "../../server/errors.ts";
type Settings = { apiKey: string; voiceModel: string; textModel: string; timeout: number };
// All Gemini-specific authentication, REST fields, schema dialect, response decoding and retries live HERE.
// REST avoids coupling the domain and browser to a provider SDK.
export class GeminiAdapter implements VoiceProvider, TextProvider {
  private settings: Settings;
  constructor(settings: Settings) {
    this.settings = settings;
  }
  private async generate(
    model: string,
    instruction: string,
    parts: unknown[],
    schema: unknown,
  ): Promise<unknown> {
    if (!/^[a-z0-9.-]+$/.test(model))
      throw new AppError("AI_CONFIG", "Gemini model কনফিগারেশন সঠিক নয়।", 503);
    const signal = AbortSignal.timeout(this.settings.timeout);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            cache: "no-store",
            signal,
            headers: { "Content-Type": "application/json", "x-goog-api-key": this.settings.apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: instruction }] },
              contents: [{ role: "user", parts }],
              generationConfig: {
                temperature: 0,
                responseMimeType: "application/json",
                responseJsonSchema: schema,
                maxOutputTokens: 4096,
              },
            }),
          },
        );
        if (!response.ok) {
          await response.body?.cancel();
          if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
            await new Promise((resolve) => setTimeout(resolve, 700));
            signal.throwIfAborted();
            continue;
          }
          if (response.status === 429)
            throw new AppError(
              "AI_RATE_LIMIT",
              "AI সেবায় অনুরোধের সীমা পূর্ণ হয়েছে। পরে চেষ্টা করুন।",
              429,
            );
          if ([400, 401, 403, 404].includes(response.status))
            throw new AppError(
              "AI_CONFIG",
              "AI key, model বা provider অনুমতি যাচাই করুন। ম্যানুয়াল এন্ট্রি ব্যবহার করতে পারেন।",
              503,
            );
          throw new AppError("AI_PROVIDER", "AI সেবা এখন উত্তর দিচ্ছে না। পরে চেষ্টা করুন।", 502);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("EMPTY_PROVIDER_BODY");
        const decoder = new TextDecoder();
        let raw = "";
        let length = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > 262144) {
              await reader.cancel();
              throw new Error("OVERSIZED_PROVIDER_BODY");
            }
            raw += decoder.decode(value, { stream: true });
          }
          raw += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        const result = JSON.parse(raw) as {
          candidates?: {
            finishReason?: string;
            content?: { parts?: { text?: string; thought?: boolean }[] };
          }[];
        };
        const candidate = result.candidates?.[0];
        if (!candidate || candidate.finishReason !== "STOP")
          throw new AppError(
            "AI_INVALID_OUTPUT",
            "AI পূর্ণাঙ্গ উত্তর দেয়নি। বিবরণ ছোট বা স্পষ্ট করে আবার চেষ্টা করুন।",
            502,
          );
        const output = candidate.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("");
        if (!output) throw new Error("EMPTY_PROVIDER_OUTPUT");
        return JSON.parse(output);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (signal.aborted)
        throw new AppError("AI_TIMEOUT", "AI উত্তর দিতে বেশি সময় নিয়েছে। আবার চেষ্টা করুন।", 504);
      throw new AppError("AI_INVALID_OUTPUT", "AI উত্তর পড়া যায়নি। আবার চেষ্টা করুন।", 502);
    }
    throw new AppError("AI_PROVIDER", "AI সেবা সাময়িকভাবে অনুপলব্ধ।", 502);
  }
  transcribe(audio: AudioInput, instruction: string) {
    return this.generate(
      this.settings.voiceModel,
      instruction,
      [
        {
          inlineData: {
            mimeType: audio.mimeType,
            data: Buffer.from(audio.bytes).toString("base64"),
          },
        },
      ],
      transcriptionSchema,
    );
  }
  extract(text: string, context: ExtractionContext, instruction: string) {
    return this.generate(
      this.settings.textModel,
      instruction,
      [{ text: JSON.stringify({ context, untrusted_expense_text: text }) }],
      extractionSchema,
    );
  }
  summarize(facts: SummaryFact[], instruction: string) {
    return this.generate(
      this.settings.textModel,
      instruction,
      [{ text: JSON.stringify({ calculated_facts: facts }) }],
      summarySchema,
    );
  }
}
