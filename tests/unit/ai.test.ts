import test from "node:test";
import assert from "node:assert/strict";
import { MockAIAdapter } from "../fixtures/mock-ai.ts";
import { demoCategories, demoSnapshot } from "../../src/lib/domain/demo.ts";
import {
  normalizeDrafts,
  editableTranscript,
  makeSummaryFacts,
  renderSummary,
} from "../../src/lib/ai/core.ts";
import { validateExtraction, validateSummary } from "../../src/lib/ai/schemas.ts";
import { parseMoney, sumPaisa } from "../../src/lib/domain/money.ts";
import { voiceProvider, textProvider } from "../../src/lib/ai/registry.ts";
import { aiCapabilities } from "../../src/lib/ai/config.ts";
const context = {
  today: "2025-04-21",
  timeZone: "Asia/Dhaka" as const,
  categories: demoCategories,
};
let counter = 0;
const id = () => String(++counter);
const provider = new MockAIAdapter();
test("Bengali + English extraction yields drafts totalling 710 by application logic", async () => {
  const drafts = normalizeDrafts(
    await provider.extract("example", context, ""),
    demoCategories,
    context.today,
    "ai_text",
    id,
  );
  assert.equal(drafts.length, 3);
  assert.equal(sumPaisa(drafts.map((d) => parseMoney(d.amount))), 71000);
  assert.equal(drafts[1].date_defaulted, true);
  assert.equal(drafts[0].date_defaulted, false);
  assert.ok(drafts.every((d) => d.selected));
});
test("ambiguous amount remains missing and requires review", async () => {
  const [draft] = normalizeDrafts(
    await provider.extract("ambiguous", context, ""),
    demoCategories,
    context.today,
    "ai_text",
    id,
  );
  assert.equal(draft.amount, "");
  assert.ok(draft.issue);
});
test("invented categories are not mapped to arbitrary real categories", () => {
  const [draft] = normalizeDrafts(
    { entries: [{ title: "X", amount: "50", category_id: "made-up", date: null, issue: null }] },
    demoCategories,
    context.today,
    "ai_text",
    id,
  );
  assert.equal(draft.category_id, "");
  assert.ok(draft.issue);
});
test("malformed AI output fails independent validation", () => {
  assert.throws(() => validateExtraction({ entries: "wrong" }));
  assert.throws(() =>
    validateExtraction({
      entries: [{ title: "X", amount: 500, category_id: "food", date: null, issue: null }],
    }),
  );
  assert.throws(() => validateExtraction({ entries: [], sql: "DROP TABLE transactions" }));
});
test("oversized extraction batches are rejected", () =>
  assert.throws(() =>
    validateExtraction({
      entries: Array.from({ length: 21 }, () => ({
        title: "x",
        amount: "1",
        category_id: "food",
        date: null,
        issue: null,
      })),
    }),
  ));
test("bad dates and negative amounts stay visibly invalid", () => {
  const [draft] = normalizeDrafts(
    {
      entries: [
        { title: "X", amount: "-10", category_id: "food", date: "2025-02-30", issue: null },
      ],
    },
    demoCategories,
    context.today,
    "ai_voice",
    id,
  );
  assert.equal(draft.occurred_on, "");
  assert.equal(draft.amount, "");
  assert.equal(draft.input_method, "ai_voice");
  assert.ok(draft.issue);
});
test("transcription is editable text, not a save operation", () => {
  assert.equal(editableTranscript({ transcript: "বাজারে ৫০০ টাকা", no_speech: false }), "বাজারে ৫০০ টাকা");
  assert.throws(() => editableTranscript({ transcript: "", no_speech: true }));
});
test("summary facts contain real budget overrun and no invented amount", async () => {
  const facts = makeSummaryFacts(
    demoSnapshot(),
    demoSnapshot("2025-03"),
    demoCategories,
    "April versus March",
  );
  assert.ok(facts.find((f) => f.id === "overrun-entertainment")?.body.includes("৳ 340"));
  const summary = renderSummary(await provider.summarize(facts, ""), facts, "version-a");
  assert.equal(summary.version, "version-a");
  assert.ok(summary.sections.every((s) => facts.some((f) => f.id === s.id && f.body === s.body)));
});
test("unknown summary fact and unsupported conclusion rejected", () => {
  assert.throws(() =>
    validateSummary({ fact_ids: ["made-up"], closing: "review-categories" }, ["overview"]),
  );
  assert.throws(() =>
    validateSummary({ fact_ids: ["overview"], closing: "buy stocks" }, ["overview"]),
  );
});
test("mandatory overrun facts cannot be suppressed by AI selection", () => {
  const facts = makeSummaryFacts(demoSnapshot(), demoSnapshot("2025-03"), demoCategories, "test");
  const result = renderSummary({ fact_ids: ["overview"], closing: "keep-recording" }, facts, "a");
  assert.ok(result.sections.some((s) => s.id === "overrun-entertainment"));
  assert.ok(result.sections.some((s) => s.id === "comparison"));
});
test("a fabricated overrun closing is corrected when no overrun exists", () => {
  const current = { ...demoSnapshot(), budgets: [] };
  const facts = makeSummaryFacts(current, demoSnapshot("2025-03"), demoCategories, "test");
  assert.ok(
    !renderSummary(
      { fact_ids: ["overview"], closing: "review-overruns" },
      facts,
      "a",
    ).closing.includes("সীমা ছাড়ানো"),
  );
});
test("voice/text provider selection is independent and unsupported mocks fail closed", () => {
  const old = { ...process.env };
  try {
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    process.env.VOICE_AI_PROVIDER = "disabled";
    process.env.TEXT_AI_PROVIDER = "gemini";
    assert.throws(() => voiceProvider());
    assert.ok(textProvider());
    assert.equal(aiCapabilities().voice.available, false);
    assert.equal(aiCapabilities().text.available, true);
    process.env.VOICE_AI_PROVIDER = "mock";
    assert.throws(() => voiceProvider());
    delete process.env.GEMINI_API_KEY;
    assert.equal(aiCapabilities().text.available, false);
  } finally {
    for (const key of ["GEMINI_API_KEY", "VOICE_AI_PROVIDER", "TEXT_AI_PROVIDER"]) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  }
});
