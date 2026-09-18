import Link from "next/link";
import type { Category, Snapshot, Transaction } from "@/lib/domain/types";
import { money } from "@/lib/domain/money";
import { monthLabel, shortDate } from "@/lib/domain/dates";
import { Icon } from "@/components/icons";
import { PageHeading, CategoryIcon, EmptyState, Footnote } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import { CategoryBarChart, DonutChart } from "@/components/charts";
import { AddTransaction } from "../transactions/transaction-dialog";
export function DashboardView({
  month,
  snapshot,
  categories,
  recent,
}: {
  month: string;
  snapshot: Snapshot;
  categories: Category[];
  recent: Transaction[];
}) {
  return (
    <>
      <PageHeading
        title="ড্যাশবোর্ড"
        subtitle={`${monthLabel(month, "bn-BD")} মাসের আয়–খরচের সারসংক্ষেপ`}
      >
        <MonthPicker month={month} />
        <AddTransaction categories={categories} />
      </PageHeading>
      <div className="summary-grid">
        {[
          { label: "মোট আয়", value: snapshot.income, tone: "income", icon: "income" },
          { label: "মোট খরচ", value: snapshot.expense, tone: "expense", icon: "expense" },
          { label: "অবশিষ্ট", value: snapshot.remaining, tone: "remaining", icon: "wallet" },
        ].map((item) => (
          <section className={`summary-card ${item.tone}`} key={item.label}>
            <p>
              <Icon name={item.icon} size={19} />
              {item.label}
            </p>
            <strong>{money(item.value)}</strong>
          </section>
        ))}
      </div>
      {snapshot.count === 0 ? (
        <section className="panel welcome-panel">
          <EmptyState>
            <AddTransaction categories={categories} />
          </EmptyState>
        </section>
      ) : (
        <div className="dashboard-charts">
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>বিভাগ অনুযায়ী খরচ</h2>
                <p>এই মাসে কোন খাতে কত খরচ হয়েছে</p>
              </div>
              <span className="badge">BDT</span>
            </div>
            <CategoryBarChart categories={categories} values={snapshot.categories} />
          </section>
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>খরচের বিভাজন</h2>
                <p>মোট খরচের মধ্যে প্রতিটি বিভাগের অংশ</p>
              </div>
            </div>
            <DonutChart
              categories={categories}
              values={snapshot.categories}
              total={snapshot.expense}
            />
          </section>
        </div>
      )}
      <section className="panel recent-panel">
        <div className="panel-heading">
          <h2>সাম্প্রতিক লেনদেন</h2>
          <Link href={`/transactions?month=${month}`} className="text-link">
            সব দেখুন <Icon name="arrow" size={17} />
          </Link>
        </div>
        {recent.length ? (
          <div className="recent-grid">
            {recent.slice(0, 3).map((t) => {
              const c = categories.find((c) => c.id === t.category_id);
              return (
                <Link
                  href={`/transactions?month=${month}&q=${encodeURIComponent(t.title)}`}
                  className="recent-item"
                  key={t.id}
                >
                  <CategoryIcon icon={c?.icon ?? "more"} color={c?.color ?? "slate"} />
                  <span className="recent-description">
                    <strong>{t.title}</strong>
                    <small>{shortDate(t.occurred_on)}</small>
                  </span>
                  <span className={`recent-amount ${t.type === "income" ? "text-green" : ""}`}>
                    {t.type === "income" ? "+" : "−"} {money(t.amount_paisa)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="muted">আপনার নতুন লেনদেন এখানে দেখা যাবে।</p>
        )}
      </section>
      <Footnote>অবশিষ্ট টাকা = সংরক্ষিত মোট আয় − মোট খরচ। এটি যাচাইকৃত ব্যাংক ব্যালেন্স নয়।</Footnote>
    </>
  );
}
