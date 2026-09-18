"use client";
import { useRef, useState } from "react";
import type { Category, Draft } from "@/lib/domain/types";
import type { ProviderCapabilities } from "@/lib/ai/contracts";
import { todayDhaka, shortDate, validDate } from "@/lib/domain/dates";
import { money, parseMoney, sumPaisa } from "@/lib/domain/money";
import { api, notifyMutation } from "@/lib/client-api";
import { Button, ActionLink, CategoryIcon, Footnote, Message, PageHeading } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Dialog } from "@/components/dialog";
import { VoiceInput } from "./voice-input";
import { useRouter } from "next/navigation";
function amountOrNull(amount: string) {
  try {
    return parseMoney(amount);
  } catch {
    return null;
  }
}
function validDraft(d: Draft, categories: Category[]) {
  return Boolean(
    d.title.trim() &&
      d.title.length <= 120 &&
      amountOrNull(d.amount) !== null &&
      validDate(d.occurred_on) &&
      categories.some((c) => c.id === d.category_id && c.type === "expense") &&
      !d.issue,
  );
}
function DraftDialog({
  draft,
  categories,
  onClose,
  onSave,
}: {
  draft: Draft;
  categories: Category[];
  onClose: () => void;
  onSave: (draft: Draft) => void;
}) {
  const [error, setError] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updated = {
      ...draft,
      title: String(fd.get("title") ?? "").trim(),
      amount: String(fd.get("amount") ?? ""),
      category_id: String(fd.get("category_id") ?? ""),
      occurred_on: String(fd.get("date") ?? ""),
      issue: null,
      date_defaulted: false,
    };
    if (!validDraft(updated, categories)) {
      setError("বিবরণ, পরিমাণ, বিভাগ ও তারিখ যাচাই করুন।");
      return;
    }
    onSave(updated);
    onClose();
  }
  return (
    <Dialog title="খসড়া যাচাই করুন" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        {draft.issue && <Message tone="info">{draft.issue}</Message>}
        <label>
          বিবরণ
          <input name="title" defaultValue={draft.title} required maxLength={120} />
        </label>
        <div className="form-row">
          <label>
            পরিমাণ (BDT)
            <input
              name="amount"
              defaultValue={draft.amount}
              inputMode="decimal"
              required
              maxLength={24}
            />
          </label>
          <label>
            তারিখ
            <input
              type="date"
              name="date"
              defaultValue={draft.occurred_on}
              min="1900-01-01"
              max="2100-12-31"
              required
            />
          </label>
        </div>
        <label>
          বিভাগ
          <select name="category_id" defaultValue={draft.category_id} required>
            <option value="">বিভাগ নির্বাচন করুন</option>
            {categories
              .filter((c) => c.type === "expense")
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name_bn}
                </option>
              ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" required /> আমি তথ্যগুলো যাচাই করেছি
        </label>
        {error && <Message>{error}</Message>}
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            বাতিল
          </Button>
          <Button type="submit" icon="check">
            খসড়া আপডেট করুন
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
export function AIEntry({
  categories,
  capabilities,
}: {
  categories: Category[];
  capabilities: ProviderCapabilities;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [method, setMethod] = useState<"ai_text" | "ai_voice">("ai_text");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<"extract" | "save" | null>(null);
  const flight = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const pending = useRef<unknown>(null);
  const selected = drafts.filter((d) => d.selected);
  const total = sumPaisa(selected.map((d) => amountOrNull(d.amount) ?? 0));
  const allValid = selected.length > 0 && selected.every((d) => validDraft(d, categories));
  async function extract() {
    if (flight.current || !text.trim()) return;
    flight.current = true;
    setBusy("extract");
    setReplaceConfirm(false);
    setError("");
    setNotice("");
    try {
      const data = await api<{ drafts: Draft[] }>("/api/ai/extract", { text, method });
      setDrafts(data.drafts);
      setSaved(false);
      setRequestId(crypto.randomUUID());
      pending.current = null;
      setLocked(false);
      if (!data.drafts.length)
        setNotice("কোনো স্পষ্ট খরচ পাওয়া যায়নি। বিবরণ ঠিক করুন অথবা একটি খসড়া যোগ করুন।");
    } catch (e) {
      setError(e instanceof Error ? e.message : "বিশ্লেষণ করা যায়নি।");
    } finally {
      flight.current = false;
      setBusy(null);
    }
  }
  function add() {
    setEditing({
      key: crypto.randomUUID(),
      title: "",
      amount: "",
      category_id: "",
      occurred_on: todayDhaka(),
      selected: true,
      date_defaulted: true,
      issue: null,
      input_method: "manual",
    });
  }
  async function save() {
    if (flight.current || !allValid) return;
    flight.current = true;
    setBusy("save");
    setError("");
    setLocked(true);
    if (!pending.current)
      pending.current = {
        request_id: requestId,
        confirmed: true,
        entries: selected.map((d) => ({
          type: "expense",
          title: d.title,
          amount: d.amount,
          category_id: d.category_id,
          occurred_on: d.occurred_on,
          note: "",
          input_method: d.input_method,
          client_request_id: d.key,
        })),
      };
    try {
      await api("/api/transactions", pending.current);
      notifyMutation();
      router.refresh();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "লেনদেন সেভ করা যায়নি।");
    } finally {
      flight.current = false;
      setBusy(null);
    }
  }
  function transcript(value: string) {
    setText(value);
    setMethod("ai_voice");
    setNotice(
      "অডিওর লেখা নিচে এসেছে। পড়ে ঠিক করুন, তারপর “বিশ্লেষণ করুন” চাপুন। এখনো কোনো লেনদেন সেভ হয়নি।",
    );
  }
  const step = saved ? 3 : drafts.length ? 2 : 1;
  return (
    <>
      <PageHeading
        title="AI দিয়ে খরচ যোগ করুন"
        subtitle="সাধারণ বাংলায় লিখুন। সেভ করার আগে সব তথ্য যাচাই করুন।"
      >
        <ActionLink href="/transactions" variant="secondary" icon="back">
          লেনদেনে ফিরুন
        </ActionLink>
      </PageHeading>
      <ol className="entry-steps">
        {["খরচ লিখুন", "তথ্য যাচাই করুন", "সেভ করুন"].map((label, i) => (
          <li key={label} className={step === i + 1 ? "active" : ""}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {saved ? (
        <section className="panel saved-panel">
          <span className="auth-icon">
            <Icon name="check" size={28} />
          </span>
          <h2>{selected.length}টি খরচ সেভ হয়েছে</h2>
          <p>মোট {money(total)} আপনার হিসাবের সঙ্গে যুক্ত হয়েছে।</p>
          <ActionLink
            href={`/transactions?month=${selected[0]?.occurred_on.slice(0, 7) ?? todayDhaka().slice(0, 7)}`}
          >
            লেনদেন দেখুন
          </ActionLink>
          <Button
            variant="secondary"
            onClick={() => {
              setDrafts([]);
              setText("");
              setSaved(false);
              setLocked(false);
              pending.current = null;
              setRequestId(crypto.randomUUID());
              setNotice("");
              setMethod("ai_text");
            }}
          >
            আরও খরচ যোগ করুন
          </Button>
        </section>
      ) : (
        <>
          <section className="panel ai-input-panel">
            <label htmlFor="expense-text">আপনার খরচের বিবরণ লিখুন</label>
            <textarea
              id="expense-text"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              disabled={Boolean(busy) || locked}
              placeholder="আজ বাজারে ৫০০ টাকা, রিকশায় ৬০ টাকা আর দুপুরের খাবারে ১৫০ টাকা খরচ হয়েছে।"
            />
            <div className="ai-input-footer">
              <p>বাংলা বা ইংরেজিতে একসঙ্গে একাধিক খরচ লিখতে পারেন</p>
              <Button
                icon="sparkles"
                disabled={!text.trim() || Boolean(busy) || locked || !capabilities.text.available}
                onClick={() => (drafts.length ? setReplaceConfirm(true) : void extract())}
              >
                {busy === "extract" ? "বিশ্লেষণ হচ্ছে…" : "বিশ্লেষণ করুন"}
              </Button>
            </div>
            <VoiceInput
              capabilities={capabilities}
              onTranscript={transcript}
              disabled={Boolean(busy) || locked}
            />
            {!capabilities.text.available && (
              <Message tone="info">{capabilities.text.reason}</Message>
            )}
          </section>
          {notice && <Message tone="info">{notice}</Message>}
          {error && (
            <Message>
              {error}
              {locked && <p>আবার সেভ করলে একই অনুরোধ পাঠানো হবে; নতুন লেনদেনের অনুলিপি তৈরি হবে না।</p>}
            </Message>
          )}
          {drafts.length > 0 && (
            <section className="panel draft-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    <Icon name="check" size={20} />
                    {drafts.length}টি খরচ পাওয়া গেছে
                  </h2>
                  <p>এগুলো এখনো সেভ হয়নি। প্রয়োজনে সংশোধন করুন।</p>
                </div>
                <span className="badge badge-green">যাচাইয়ের অপেক্ষায়</span>
              </div>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="যাচাই করার জন্য AI খসড়া"
              >
                <table className="draft-table">
                  <thead>
                    <tr>
                      <th>
                        <span className="sr-only">নির্বাচন</span>
                      </th>
                      <th>বিবরণ</th>
                      <th>বিভাগ</th>
                      <th>তারিখ</th>
                      <th className="amount-cell">পরিমাণ</th>
                      <th className="actions-cell">পরিবর্তন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((draft) => {
                      const c = categories.find((c) => c.id === draft.category_id);
                      const amount = amountOrNull(draft.amount);
                      return (
                        <tr key={draft.key} className={draft.issue ? "needs-review" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`${draft.title || "খসড়া"} নির্বাচন`}
                              checked={draft.selected}
                              disabled={locked || Boolean(busy)}
                              onChange={() =>
                                setDrafts(
                                  drafts.map((d) =>
                                    d.key === draft.key ? { ...d, selected: !d.selected } : d,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td>
                            <div className="transaction-title">
                              <CategoryIcon icon={c?.icon ?? "more"} color={c?.color ?? "slate"} />
                              <span>
                                {draft.title || "বিবরণ দিন"}
                                {draft.issue && (
                                  <small className="text-warning">সংশোধন প্রয়োজন</small>
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge">{c?.name_bn ?? "বিভাগ দিন"}</span>
                          </td>
                          <td className="date-cell">
                            {validDate(draft.occurred_on)
                              ? shortDate(draft.occurred_on)
                              : "তারিখ দিন"}
                            {draft.date_defaulted && <small>ঢাকার আজকের তারিখ (ডিফল্ট)</small>}
                          </td>
                          <td className="amount-cell">{amount === null ? "—" : money(amount)}</td>
                          <td className="actions-cell">
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`${draft.title} খসড়া সম্পাদনা`}
                                disabled={locked || Boolean(busy)}
                                onClick={() => setEditing(draft)}
                              >
                                <Icon name="edit" size={17} />
                              </button>
                              <button
                                type="button"
                                className="icon-button danger"
                                aria-label={`${draft.title} খসড়া মুছুন`}
                                disabled={locked || Boolean(busy)}
                                onClick={() => setDrafts(drafts.filter((d) => d.key !== draft.key))}
                              >
                                <Icon name="trash" size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="draft-total">
                <span>{selected.length}টি নির্বাচিত খরচ</span>
                <strong>
                  মোট <span>{money(total)}</span>
                </strong>
              </div>
            </section>
          )}
          <div className="ai-save-actions">
            <Button
              variant="secondary"
              icon="plus"
              onClick={add}
              disabled={Boolean(busy) || locked || drafts.length >= 20}
            >
              আরেকটি যোগ করুন
            </Button>
            <Button icon="check" onClick={save} disabled={Boolean(busy) || !allValid}>
              {busy === "save"
                ? "সেভ হচ্ছে…"
                : locked
                  ? "একই অনুরোধ আবার সেভ করুন"
                  : "নিশ্চিত করে সেভ করুন"}
            </Button>
          </div>
          {selected.length > 0 && !allValid && (
            <Message tone="info">
              নির্বাচিত খসড়ার অসম্পূর্ণ তথ্য ঠিক করুন ও যাচাই করুন, অথবা সেটি বাদ দিন।
            </Message>
          )}
          <Footnote>
            AI ভুল করতে পারে। পরিমাণ, বিভাগ ও তারিখ মিলিয়ে নিন। তারিখ না বললে Asia/Dhaka অনুযায়ী আজকের তারিখ
            ব্যবহার করা হয় এবং খসড়ায় দেখানো হয়।
          </Footnote>
        </>
      )}
      {editing && (
        <DraftDialog
          draft={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(draft) =>
            setDrafts(
              drafts.some((d) => d.key === draft.key)
                ? drafts.map((d) => (d.key === draft.key ? draft : d))
                : [...drafts, draft],
            )
          }
        />
      )}
      {replaceConfirm && (
        <Dialog title="বর্তমান খসড়া বদলাবেন?" onClose={() => setReplaceConfirm(false)}>
          <p>আবার বিশ্লেষণ করলে বর্তমান অসংরক্ষিত খসড়াগুলো নতুন ফলাফল দিয়ে বদলে যাবে।</p>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setReplaceConfirm(false)}>
              বাতিল
            </Button>
            <Button onClick={extract}>আবার বিশ্লেষণ করুন</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
