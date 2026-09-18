"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Category, Snapshot, SummaryResult } from "@/lib/domain/types";
import { monthLabel, type comparisonPeriods } from "@/lib/domain/dates";
import { money } from "@/lib/domain/money";
import { expenseChange } from "@/lib/domain/calculations";
import { api } from "@/lib/client-api";
import { Button, CategoryIcon, EmptyState, Footnote, Message, PageHeading } from "@/components/ui";
import { Icon } from "@/components/icons";
import { MonthPicker } from "@/components/month-picker";
import { CategoryBarChart, DonutChart, chartColors } from "@/components/charts";
function ComparisonCard({
  current,
  previous,
  month,
  previousMonth,
}: {
  current: Snapshot;
  previous: Snapshot;
  month: string;
  previousMonth: string;
}) {
  const max = Math.max(1, current.expense, previous.expense),
    diff = expenseChange(current, previous);
  return (
    <section className="panel comparison-card">
      <h2>মাসিক তুলনা</h2>
      <p className="muted">মোট খরচের পরিবর্তন</p>
      <div
        className="comparison-bars"
        role="img"
        aria-label={`${monthLabel(previousMonth)}: ${money(previous.expense)}; ${monthLabel(month)}: ${money(current.expense)}`}
      >
        {[
          { m: previousMonth, value: previous.expense },
          { m: month, value: current.expense },
        ].map((item, i) => (
          <div className="comparison-bar-column" key={item.m}>
            <span className="bar-value">{money(item.value)}</span>
            <div
              className={`comparison-bar bar-${i}`}
              style={{ height: `${(item.value / max) * 160}px` }}
            />
            <span className="bar-label">{monthLabel(item.m, "bn-BD").split(" ")[0]}</span>
          </div>
        ))}
      </div>
      <div className={`comparison-note ${diff.difference > 0 ? "increase" : ""}`}>
        <Icon name={diff.difference > 0 ? "income" : "expense"} size={15} />
        {previous.count === 0
          ? "আগের সময়ের তথ্য নেই"
          : previous.expense === 0
            ? "আগের সময়ে খরচ শূন্য"
            : diff.difference === 0
              ? "খরচ অপরিবর্তিত"
              : `${money(Math.abs(diff.difference))} ${diff.difference > 0 ? "বেশি" : "কম"} খরচ`}
      </div>
    </section>
  );
}
export function ReportView({
  month,
  tab,
  current,
  previous,
  categories,
  periods,
  version,
  ai,
}: {
  month: string;
  tab: string;
  current: Snapshot;
  previous: Snapshot;
  categories: Category[];
  periods: ReturnType<typeof comparisonPeriods>;
  version: string;
  ai: { available: boolean; reason: string };
}) {
  const [result, setResult] = useState<SummaryResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false),
    controller = useRef<AbortController | null>(null),
    latestVersion = useRef(version);
  useEffect(() => {
    latestVersion.current = version;
  }, [version]);
  useEffect(() => () => controller.current?.abort(), []);
  const change = expenseChange(current, previous),
    top = [...current.categories].sort((a, b) => b.amount_paisa - a.amount_paisa)[0],
    topCategory = categories.find((c) => c.id === top?.category_id);
  const validResult = result?.version === version ? result : null;
  async function summarize() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const data = await api<SummaryResult>(
        "/api/ai/summary",
        { month },
        "POST",
        controller.current.signal,
      );
      if (data.version !== latestVersion.current) {
        setError("হিসাব পরিবর্তিত হয়েছে। পাতা রিফ্রেশ করে নতুন সারাংশ তৈরি করুন।");
        setResult(null);
      } else setResult(data);
    } catch (e) {
      if (!controller.current?.signal.aborted)
        setError(e instanceof Error ? e.message : "সারাংশ তৈরি হয়নি।");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading title="মাসিক রিপোর্ট" subtitle="আপনার খরচের ধরন ও AI সারাংশ দেখুন।">
        <MonthPicker month={month} />
      </PageHeading>
      <nav className="report-tabs" aria-label="রিপোর্টের ধরন">
        {[
          ["category", "খরচের ধরন"],
          ["comparison", "মাসিক তুলনা"],
          ["ai", "AI সারাংশ"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={`/reports?month=${month}&tab=${id}`}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
          >
            {id === "ai" && <Icon name="sparkles" size={18} />} {label}
          </Link>
        ))}
      </nav>
      <div className="period-label">
        <Icon name="info" size={14} />
        <span>
          {periods.label}
          {periods.partial ? "। চলতি মাস এখনো সম্পূর্ণ হয়নি।" : ""}
        </span>
      </div>
      {current.count === 0 ? (
        <section className="panel">
          <EmptyState
            title="এই মাসের রিপোর্ট এখনো খালি"
            description="কিছু লেনদেন যোগ করুন অথবা অন্য মাস নির্বাচন করুন।"
          />
        </section>
      ) : (
        <div className="wide-aside-grid reports-grid" data-report-version={version}>
          <section className="panel report-main">
            {tab === "ai" && (
              <>
                <div className="report-title">
                  <span className="auth-icon">
                    <Icon name="sparkles" size={27} />
                  </span>
                  <div>
                    <h2>{monthLabel(month, "bn-BD").split(" ")[0]} মাসের সারাংশ</h2>
                    <p>আপনার সংরক্ষিত আয়–খরচের ভিত্তিতে</p>
                  </div>
                  <span className="badge badge-green">AI</span>
                </div>
                <div className="report-metrics">
                  <div>
                    <p>মোট খরচ</p>
                    <strong>{money(current.expense)}</strong>
                  </div>
                  <div>
                    <p>আগের সময়</p>
                    <strong>{money(previous.expense)}</strong>
                  </div>
                  <div>
                    <p>
                      {change.percent === null
                        ? "শতকরা তুলনা"
                        : change.difference > 0
                          ? "খরচ বেড়েছে"
                          : change.difference < 0
                            ? "খরচ কমেছে"
                            : "অপরিবর্তিত"}
                    </p>
                    <strong className={change.difference > 0 ? "text-warning" : "text-green"}>
                      {change.percent === null ? "—" : `${Math.abs(change.percent).toFixed(1)}%`}
                    </strong>
                  </div>
                </div>
                {validResult ? (
                  <div className="summary-sections">
                    {validResult.sections.map((section) => (
                      <section key={section.id}>
                        <h3>{section.heading}</h3>
                        <p>{section.body}</p>
                      </section>
                    ))}
                    <div className="summary-tip">
                      <Icon name="info" size={16} />
                      <span>{validResult.closing}</span>
                    </div>
                  </div>
                ) : (
                  <div className="summary-placeholder">
                    <Icon name="sparkles" size={30} />
                    <h3>আপনার খরচের গল্প, সহজ বাংলায়</h3>
                    <p>
                      {result
                        ? "হিসাব পরিবর্তিত হয়েছে। পুরোনো সারাংশ আর দেখানো হচ্ছে না।"
                        : "নিচের বোতামে চাপলে গণনা করা তথ্য থেকে AI সারাংশ তৈরি হবে।"}
                    </p>
                  </div>
                )}
                {!ai.available && <Message tone="info">{ai.reason}</Message>}
                {error && <Message>{error}</Message>}
                <Button
                  variant="secondary"
                  icon={validResult ? "refresh" : "sparkles"}
                  disabled={busy || !ai.available}
                  onClick={summarize}
                >
                  {busy ? "সারাংশ তৈরি হচ্ছে…" : validResult ? "আবার সারাংশ তৈরি করুন" : "সারাংশ তৈরি করুন"}
                </Button>
              </>
            )}
            {tab === "category" && (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>বিভাগ অনুযায়ী খরচ</h2>
                    <p>মোট খরচের হিসাব ও প্রতিটি বিভাগের অংশ</p>
                  </div>
                  <span className="badge">BDT</span>
                </div>
                <CategoryBarChart categories={categories} values={current.categories} />
                <DonutChart
                  categories={categories}
                  values={current.categories}
                  total={current.expense}
                />
              </>
            )}
            {tab === "comparison" && (
              <>
                <h2>দুই মাসের নথিভুক্ত হিসাব</h2>
                <p className="muted comparison-description">{periods.label}</p>
                <div className="table-scroll">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th scope="col">হিসাব</th>
                        <th scope="col">{monthLabel(periods.previous)}</th>
                        <th scope="col">{monthLabel(month)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["মোট আয়", previous.income, current.income],
                        ["মোট খরচ", previous.expense, current.expense],
                        ["অবশিষ্ট", previous.remaining, current.remaining],
                      ].map(([label, prev, now]) => (
                        <tr key={String(label)}>
                          <td>{label}</td>
                          <td>{money(Number(prev))}</td>
                          <td>{money(Number(now))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Message tone="info">
                  {previous.count === 0
                    ? "আগের সময়ের কোনো রেকর্ড নেই। শতকরা তুলনা প্রযোজ্য নয়।"
                    : previous.expense === 0
                      ? "আগের সময়ে খরচ শূন্য, তাই শতকরা পরিবর্তন নির্ণয় করা যায় না।"
                      : `খরচ ${Math.abs(change.percent ?? 0).toFixed(1)}% ${change.difference > 0 ? "বেড়েছে" : change.difference < 0 ? "কমেছে" : "অপরিবর্তিত রয়েছে"}।`}
                </Message>
                <Footnote>
                  অবশিষ্ট মান ঋণাত্মক হলে নথিভুক্ত আয়ের চেয়ে খরচ বেশি। এটি ব্যাংক ব্যালেন্স নয়।
                </Footnote>
              </>
            )}
          </section>
          <aside className="aside-stack">
            <ComparisonCard
              current={current}
              previous={previous}
              month={month}
              previousMonth={periods.previous}
            />
            {top && topCategory && (
              <section className="panel top-category-panel">
                <h2>খরচের শীর্ষ বিভাগ</h2>
                <div className="top-category-name">
                  <CategoryIcon icon={topCategory.icon} color={topCategory.color} />
                  <div>
                    <strong>{topCategory.name_bn}</strong>
                    <p>
                      মোট খরচের{" "}
                      {Math.round((top.amount_paisa / Math.max(1, current.expense)) * 100)}%
                    </p>
                  </div>
                </div>
                <strong className="top-category-amount">{money(top.amount_paisa)}</strong>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${(top.amount_paisa / Math.max(1, current.expense)) * 100}%`,
                      background: chartColors[topCategory.color],
                    }}
                  />
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
      <Footnote>AI-এর ব্যাখ্যা যাচাই করে নিন। হিসাব পরিবর্তন করলে নতুন সারাংশ তৈরি করুন।</Footnote>
    </>
  );
}
