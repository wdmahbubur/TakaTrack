import { requirePageUser } from "@/lib/server/auth";
import { getCategories, listTransactions, single, type SearchParams } from "@/lib/server/data";
import { monthOrCurrent } from "@/lib/domain/dates";
import { PageHeading, ActionLink, Footnote } from "@/components/ui";
import { AddTransaction } from "@/features/transactions/transaction-dialog";
import { TransactionFilters, Pagination } from "@/features/transactions/filters";
import { TransactionTable } from "@/features/transactions/transaction-table";
export const metadata = { title: "লেনদেনের তালিকা" };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageUser();
  const params = await searchParams,
    month = monthOrCurrent(single(params, "month"));
  const [categories, list] = await Promise.all([getCategories(), listTransactions(month, params)]);
  return (
    <>
      <PageHeading title="লেনদেনের তালিকা" subtitle="সব আয় ও খরচ এক জায়গায় খুঁজুন ও সম্পাদনা করুন।">
        <ActionLink href="/transactions/ai" variant="secondary" icon="sparkles">
          AI দিয়ে যোগ করুন
        </ActionLink>
        <AddTransaction categories={categories} />
      </PageHeading>
      <section className="panel transactions-panel">
        <TransactionFilters key={JSON.stringify(params)} categories={categories} month={month} />
        <TransactionTable transactions={list.transactions} categories={categories} />
        <Pagination {...list} />
      </section>
      <Footnote>কোনো রেকর্ড মুছে ফেলার আগে আপনার নিশ্চিতকরণ চাওয়া হবে।</Footnote>
    </>
  );
}
