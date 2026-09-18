import { requirePageUser } from "@/lib/server/auth";
import {
  getCategories,
  getSnapshot,
  listTransactions,
  single,
  type SearchParams,
} from "@/lib/server/data";
import { monthOrCurrent } from "@/lib/domain/dates";
import { DashboardView } from "@/features/dashboard/dashboard-view";
export const metadata = { title: "ড্যাশবোর্ড" };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageUser();
  const params = await searchParams,
    month = monthOrCurrent(single(params, "month"));
  const [snapshot, categories, recent] = await Promise.all([
    getSnapshot(month),
    getCategories(),
    listTransactions(month, {}, 3),
  ]);
  return (
    <DashboardView
      month={month}
      snapshot={snapshot}
      categories={categories}
      recent={recent.transactions}
    />
  );
}
