"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/dialog";
import { Button, Message } from "@/components/ui";
import { Icon } from "@/components/icons";
import { api, notifyMutation } from "@/lib/client-api";
import type { Category, Transaction, TransactionInput } from "@/lib/domain/types";
import { amountInput } from "@/lib/domain/money";
import { todayDhaka } from "@/lib/domain/dates";
import { transactionInput } from "@/lib/validation/input";
export function TransactionDialog({
  categories,
  transaction,
  onClose,
}: {
  categories: Category[];
  transaction?: Transaction;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">(transaction?.type ?? "expense");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [locked, setLocked] = useState(false);
  const inFlight = useRef(false);
  const [requestId] = useState(() => crypto.randomUUID()),
    [clientId] = useState(() => transaction?.client_request_id ?? crypto.randomUUID());
  const pending = useRef<unknown>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (!pending.current) {
      const data = new FormData(e.currentTarget);
      try {
        const input: TransactionInput = {
          type,
          title: String(data.get("title") ?? ""),
          amount: String(data.get("amount") ?? ""),
          category_id: String(data.get("category_id") ?? ""),
          occurred_on: String(data.get("occurred_on") ?? ""),
          note: String(data.get("note") ?? ""),
          input_method: transaction?.input_method ?? "manual",
          client_request_id: clientId,
        };
        transactionInput(input, categories);
        pending.current = transaction
          ? { ...input, expected_updated_at: transaction.updated_at }
          : { request_id: requestId, entries: [input], confirmed: true };
      } catch (e) {
        setError(e instanceof Error ? e.message : "তথ্য যাচাই করুন।");
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    setLocked(true);
    try {
      await api(
        transaction ? `/api/transactions/${transaction.id}` : "/api/transactions",
        pending.current,
        transaction ? "PATCH" : "POST",
      );
      notifyMutation();
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "সংরক্ষণ হয়নি। আবার চেষ্টা করুন।");
      if (transaction) {
        pending.current = null;
        setLocked(false);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog title={transaction ? "লেনদেন সম্পাদনা করুন" : "নতুন লেনদেন"} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="form-stack">
        <fieldset disabled={busy || locked} className="form-fields form-stack">
          <div className="segmented">
            <button
              type="button"
              className={type === "expense" ? "selected" : ""}
              onClick={() => setType("expense")}
              aria-pressed={type === "expense"}
            >
              খরচ
            </button>
            <button
              type="button"
              className={type === "income" ? "selected" : ""}
              onClick={() => setType("income")}
              aria-pressed={type === "income"}
            >
              আয়
            </button>
          </div>
          <label>
            বিবরণ
            <input
              name="title"
              defaultValue={transaction?.title}
              placeholder="যেমন: দুপুরের খাবার"
              required
              maxLength={120}
            />
          </label>
          <div className="form-row">
            <label>
              পরিমাণ (BDT)
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={transaction ? amountInput(transaction.amount_paisa) : ""}
                placeholder="500"
                required
                maxLength={24}
              />
            </label>
            <label>
              তারিখ
              <input
                type="date"
                name="occurred_on"
                defaultValue={transaction?.occurred_on ?? todayDhaka()}
                required
                min="1900-01-01"
                max="2100-12-31"
              />
            </label>
          </div>
          <label>
            বিভাগ
            <select
              name="category_id"
              key={type}
              defaultValue={transaction?.type === type ? transaction.category_id : ""}
              required
            >
              <option value="">বিভাগ নির্বাচন করুন</option>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_bn}
                  </option>
                ))}
            </select>
          </label>
          <label>
            নোট (ঐচ্ছিক)
            <textarea name="note" defaultValue={transaction?.note ?? ""} maxLength={500} rows={2} />
          </label>
        </fieldset>
        {error && (
          <Message>
            {error}
            {locked && !transaction && (
              <p>একই তথ্য আবার পাঠাতে নিচের বোতাম ব্যবহার করুন। তথ্য বদলাতে আগে বন্ধ করে তালিকা যাচাই করুন।</p>
            )}
          </Message>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            বাতিল
          </Button>
          <Button type="submit" icon="check" disabled={busy}>
            {busy ? "সেভ হচ্ছে…" : locked ? "একই অনুরোধ আবার পাঠান" : "সেভ করুন"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
export function AddTransaction({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon="plus" onClick={() => setOpen(true)}>
        নতুন লেনদেন
      </Button>
      {open && <TransactionDialog categories={categories} onClose={() => setOpen(false)} />}
    </>
  );
}
export function TransactionActions({
  transaction,
  categories,
}: {
  transaction: Transaction;
  categories: Category[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inFlight = useRef(false);
  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/api/transactions/${transaction.id}`, undefined, "DELETE");
      notifyMutation();
      router.refresh();
      setMode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "মুছে ফেলা যায়নি।");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <div className="row-actions">
      <button
        type="button"
        className="icon-button"
        aria-label={`${transaction.title} সম্পাদনা`}
        onClick={() => setMode("edit")}
      >
        <Icon name="edit" size={17} />
      </button>
      <button
        type="button"
        className="icon-button danger"
        aria-label={`${transaction.title} মুছুন`}
        onClick={() => {
          setError("");
          setMode("delete");
        }}
      >
        <Icon name="trash" size={17} />
      </button>
      {mode === "edit" && (
        <TransactionDialog
          categories={categories}
          transaction={transaction}
          onClose={() => setMode(null)}
        />
      )}
      {mode === "delete" && (
        <Dialog title="লেনদেনটি মুছে ফেলবেন?" onClose={() => setMode(null)} busy={busy}>
          <p>“{transaction.title}” স্থায়ীভাবে মুছে যাবে। এই কাজ ফিরিয়ে নেওয়া যাবে না।</p>
          {error && <Message>{error}</Message>}
          <div className="dialog-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setMode(null)}>
              বাতিল
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              {busy ? "মুছে ফেলা হচ্ছে…" : "হ্যাঁ, মুছে ফেলুন"}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
