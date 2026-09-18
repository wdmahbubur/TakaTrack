import { requirePageUser } from "@/lib/server/auth";
import { getReport, single, type SearchParams } from "@/lib/server/data";
import { monthOrCurrent } from "@/lib/domain/dates";
import { aiCapabilities } from "@/lib/ai/config";
import { ReportView } from "@/features/reports/report-view";
export const metadata = { title: "মাসিক রিপোর্ট" };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageUser();
  const params = await searchParams,
    month = monthOrCurrent(single(params, "month"));
  const requested = single(params, "tab"),
    tab = ["category", "comparison", "ai"].includes(requested) ? requested : "ai";
  return (
    <ReportView month={month} tab={tab} {...(await getReport(month))} ai={aiCapabilities().text} />
  );
}
