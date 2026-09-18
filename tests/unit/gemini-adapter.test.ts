import test from "node:test";
import assert from "node:assert/strict";
import { GeminiAdapter } from "../../src/lib/ai/adapters/gemini.ts";
import { AppError } from "../../src/lib/server/errors.ts";
const settings = {
  apiKey: "test-only-not-a-real-key",
  voiceModel: "gemini-2.5-flash",
  textModel: "gemini-2.5-flash",
  timeout: 30000,
};
function success(value: unknown) {
  return new Response(
    JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
    { status: 200 },
  );
}
test("Gemini adapter serializes real audio bytes and isolates provider authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: unknown, init: RequestInit) => {
    assert.ok(String(url).includes(":generateContent"));
    assert.equal((init.headers as Record<string, string>)["x-goog-api-key"], settings.apiKey);
    const body = JSON.parse(String(init.body));
    assert.equal(body.contents[0].parts[0].inlineData.mimeType, "audio/wav");
    assert.equal(body.contents[0].parts[0].inlineData.data, "AQID");
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.ok(body.generationConfig.responseJsonSchema);
    assert.equal(body.tools, undefined);
    return success({ transcript: "বাজার ৫০০ টাকা", no_speech: false });
  });
  assert.deepEqual(
    await new GeminiAdapter(settings).transcribe(
      { bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/wav", durationSeconds: 1 },
      "transcribe",
    ),
    { transcript: "বাজার ৫০০ টাকা", no_speech: false },
  );
});
test("provider secrets and raw error bodies are not surfaced", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("sensitive provider error", { status: 403 }),
  );
  await assert.rejects(
    () => new GeminiAdapter(settings).summarize([], "summary"),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AI_CONFIG" &&
      !error.message.includes("sensitive"),
  );
});
test("truncated model output never becomes a successful partial result", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } }],
        }),
      ),
  );
  await assert.rejects(
    () => new GeminiAdapter(settings).summarize([], "summary"),
    (error: unknown) => error instanceof AppError && error.code === "AI_INVALID_OUTPUT",
  );
});
test("transient failures retry only once", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("busy", { status: 503 });
  });
  await assert.rejects(() => new GeminiAdapter(settings).summarize([], "summary"));
  assert.equal(calls, 2);
});
test("non-JSON model output is rejected", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not JSON" }] } }],
        }),
      ),
  );
  await assert.rejects(() => new GeminiAdapter(settings).summarize([], "summary"));
});
