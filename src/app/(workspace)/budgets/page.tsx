import { requirePageUser } from "@/lib/server/auth";
import { getCategories, getSnapshot, single, type SearchParams } from "@/lib/server/data";
import { monthOrCurrent } from "@/lib/domain/dates";
import { BudgetView } from "@/features/budgets/budget-view";
export const metadata = { title: "মাসিক বাজেট" };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageUser();
  const params = await searchParams,
    month = monthOrCurrent(single(params, "month"));
  const [snapshot, categories] = await Promise.all([getSnapshot(month), getCategories()]);
  return <BudgetView key={month} month={month} snapshot={snapshot} categories={categories} />;
}
