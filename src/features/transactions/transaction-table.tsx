import type { Category, Transaction } from "@/lib/domain/types";
import { money } from "@/lib/domain/money";
import { shortDate } from "@/lib/domain/dates";
import { CategoryIcon, EmptyState } from "@/components/ui";
import { TransactionActions } from "./transaction-dialog";
export function TransactionTable({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  if (!transactions.length)
    return (
      <EmptyState
        title="কোনো লেনদেন পাওয়া যায়নি"
        description="নতুন লেনদেন যোগ করুন অথবা খোঁজের ফিল্টার পরিবর্তন করুন।"
      />
    );
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="লেনদেনের তালিকা; ছোট পর্দায় পাশে স্ক্রল করুন"
    >
      <table className="transaction-table">
        <thead>
          <tr>
            <th scope="col">তারিখ</th>
            <th scope="col">বিবরণ</th>
            <th scope="col">বিভাগ</th>
            <th scope="col">ধরন</th>
            <th scope="col" className="amount-cell">
              পরিমাণ
            </th>
            <th scope="col" className="actions-cell">
              পরিবর্তন
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const c = categories.find((c) => c.id === t.category_id);
            return (
              <tr key={t.id}>
                <td className="date-cell">{shortDate(t.occurred_on)}</td>
                <td>
                  <div className="transaction-title">
                    <CategoryIcon icon={c?.icon ?? "more"} color={c?.color ?? "slate"} />
                    <span>
                      {t.title}
                      {t.note && <small className="transaction-note">{t.note}</small>}
                    </span>
                  </div>
                </td>
                <td className="muted">{c?.name_bn}</td>
                <td>
                  <span className={`badge ${t.type === "income" ? "badge-green" : ""}`}>
                    {t.type === "income" ? "আয়" : "খরচ"}
                  </span>
                </td>
                <td className={`amount-cell ${t.type === "income" ? "text-green" : ""}`}>
                  {t.type === "income" ? "+" : "−"} {money(t.amount_paisa)}
                </td>
                <td className="actions-cell">
                  <TransactionActions transaction={t} categories={categories} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
