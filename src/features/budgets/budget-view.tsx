"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Budget, Category, Snapshot } from "@/lib/domain/types";
import { money, amountInput } from "@/lib/domain/money";
import { budgetFacts } from "@/lib/domain/calculations";
import { budgetInput } from "@/lib/validation/input";
import { api, notifyMutation } from "@/lib/client-api";
import { PageHeading, Button, CategoryIcon, EmptyState, Footnote, Message } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import { BudgetRing, chartColors } from "@/components/charts";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
function BudgetDialog({
  categories,
  month,
  budget,
  onClose,
}: {
  categories: Category[];
  month: string;
  budget?: Budget;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const flight = useRef(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (flight.current) return;
    const data = new FormData(e.currentTarget),
      value = { category_id: data.get("category_id"), month, limit: data.get("limit") };
    setError("");
    try {
      budgetInput(value, categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "তথ্য যাচাই করুন।");
      return;
    }
    flight.current = true;
    setBusy(true);
    try {
      await api(
        budget ? `/api/budgets/${budget.id}` : "/api/budgets",
        value,
        budget ? "PATCH" : "POST",
      );
      notifyMutation();
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "বাজেট সেভ হয়নি।");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (!budget || flight.current) return;
    flight.current = true;
    setBusy(true);
    try {
      await api(`/api/budgets/${budget.id}`, undefined, "DELETE");
      notifyMutation();
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "মুছে ফেলা যায়নি।");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={confirmDelete ? "বাজেটটি মুছে ফেলবেন?" : budget ? "বাজেট সম্পাদনা করুন" : "নতুন মাসিক বাজেট"}
      onClose={onClose}
      busy={busy}
    >
      {confirmDelete ? (
        <>
          <p>শুধু বাজেটের সীমা মুছবে, লেনদেনগুলো মুছবে না।</p>
          {error && <Message>{error}</Message>}
          <div className="dialog-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>
              ফিরে যান
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              বাজেট মুছুন
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="form-stack">
          <label>
            মাস
            <input value={month} readOnly />
          </label>
          <label>
            বিভাগ
            <select
              name="category_id"
              defaultValue={budget?.category_id ?? ""}
              required
              disabled={busy}
            >
              <option value="">বিভাগ নির্বাচন করুন</option>
              {categories
                .filter((c) => c.type === "expense")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_bn}
                  </option>
                ))}
            </select>
          </label>
          <label>
            বাজেটের সীমা (BDT)
            <input
              name="limit"
              inputMode="decimal"
              defaultValue={budget ? amountInput(budget.limit_paisa) : ""}
              placeholder="7000"
              required
              maxLength={24}
              disabled={busy}
            />
          </label>
          {error && <Message>{error}</Message>}
          <div className="dialog-actions">
            {budget && (
              <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                মুছুন
              </Button>
            )}
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              বাতিল
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "সেভ হচ্ছে…" : "বাজেট সেভ করুন"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
export function BudgetView({
  month,
  snapshot,
  categories,
}: {
  month: string;
  snapshot: Snapshot;
  categories: Category[];
}) {
  const [editing, setEditing] = useState<Budget | true | null>(null),
    facts = budgetFacts(snapshot.budgets, snapshot.categories);
  const sorted = [...facts.rows].sort(
    (a, b) =>
      (categories.find((c) => c.id === a.category_id)?.sort_order ?? 0) -
      (categories.find((c) => c.id === b.category_id)?.sort_order ?? 0),
  );
  return (
    <>
      <PageHeading title="মাসিক বাজেট" subtitle="প্রতিটি বিভাগের খরচের সীমা ঠিক রাখুন।">
        <MonthPicker month={month} />
        <Button icon="plus" onClick={() => setEditing(true)}>
          বাজেট যোগ করুন
        </Button>
      </PageHeading>
      <section className="panel budget-totals">
        <div>
          <p>মোট বাজেট</p>
          <strong>{money(facts.limit)}</strong>
        </div>
        <div>
          <p>
            এই মাসে খরচ <small>(বাজেটের বিভাগগুলো)</small>
          </p>
          <strong>{money(facts.spent)}</strong>
        </div>
        <div>
          <p>বাজেটের অবশিষ্ট</p>
          <strong className={facts.remaining < 0 ? "text-danger" : "text-green"}>
            {money(facts.remaining)}
          </strong>
        </div>
      </section>
      {facts.unbudgeted > 0 && (
        <Message tone="info">
          বাজেটবিহীন বিভাগে খরচ: <strong>{money(facts.unbudgeted)}</strong>। এটি উপরের বাজেট-ব্যবহারের
          হিসাবে অন্তর্ভুক্ত নয়।
        </Message>
      )}
      <div className="wide-aside-grid">
        <section className="panel budget-category-panel">
          <div className="panel-heading">
            <h2>বিভাগভিত্তিক বাজেট</h2>
            <span className="muted">{sorted.length}টি বিভাগ</span>
          </div>
          {sorted.length ? (
            <div className="budget-rows">
              {sorted.map((row) => {
                const c = categories.find((c) => c.id === row.category_id);
                return (
                  <div className="budget-row" key={row.id}>
                    <div className="budget-category">
                      <CategoryIcon icon={c?.icon ?? "more"} color={c?.color ?? "slate"} />
                      <span>{c?.name_bn}</span>
                    </div>
                    <div className="budget-detail">
                      <div className="budget-numbers">
                        <span>
                          {money(row.spent)}{" "}
                          <span className="muted">/ {money(row.limit_paisa)}</span>
                        </span>
                        <span className={row.overspent ? "text-warning" : "muted"}>
                          {Math.round(row.percent)}%
                        </span>
                      </div>
                      <div
                        className="progress-track"
                        role="meter"
                        aria-label={`${c?.name_bn} বাজেট ব্যবহার`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(100, row.percent)}
                        aria-valuetext={`${Math.round(row.percent)}%; অবশিষ্ট ${money(row.remaining)}`}
                      >
                        <span
                          style={{
                            width: `${Math.min(100, row.percent)}%`,
                            background: row.overspent
                              ? "#df8875"
                              : chartColors[c?.color ?? "slate"],
                          }}
                        />
                      </div>
                      {row.overspent > 0 && (
                        <small className="text-warning">
                          {money(row.overspent)} বেশি খরচ হয়েছে
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${c?.name_bn} বাজেট সম্পাদনা`}
                      onClick={() => setEditing(row)}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="আপনার প্রথম বাজেট তৈরি করুন"
              description="খরচের বিভাগ ও মাসিক সীমা নির্ধারণ করে শুরু করুন।"
            />
          )}
          <div className="budget-add-footer">
            <Button variant="soft" icon="plus" onClick={() => setEditing(true)}>
              নতুন বিভাগে বাজেট যোগ করুন
            </Button>
          </div>
        </section>
        <aside className="aside-stack">
          <section className="panel budget-ring-panel">
            <h2>বাজেটের চিত্র</h2>
            <BudgetRing percent={facts.percent} />
            <dl className="budget-status">
              <div>
                <dt>সীমার মধ্যে</dt>
                <dd className="text-green">{facts.within}টি বিভাগ</dd>
              </div>
              <div>
                <dt>সীমার বাইরে</dt>
                <dd className="text-warning">{facts.over}টি বিভাগ</dd>
              </div>
            </dl>
          </section>
          {sorted
            .filter((b) => b.overspent > 0)
            .map((b) => {
              const name = categories.find((c) => c.id === b.category_id)?.name_bn;
              return (
                <section className="budget-warning" key={b.id}>
                  <h3>
                    <Icon name="flag" size={18} />
                    {name} বিভাগের বাজেট ছাড়িয়েছে
                  </h3>
                  <p>
                    নির্ধারিত সীমা ছিল {money(b.limit_paisa)}।<br />
                    এই মাসে খরচ হয়েছে {money(b.spent)}।
                  </p>
                  <button type="button" className="text-link" onClick={() => setEditing(b)}>
                    বাজেট দেখুন <Icon name="arrow" size={16} />
                  </button>
                </section>
              );
            })}
        </aside>
      </div>
      <Footnote>
        খরচ সরাসরি আপনার লেনদেন থেকে গণনা করা হয়। বাজেটের সীমা পরিবর্তন করলে লেনদেন পরিবর্তিত হয় না।
      </Footnote>
      {editing && (
        <BudgetDialog
          categories={categories}
          month={month}
          budget={editing === true ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
