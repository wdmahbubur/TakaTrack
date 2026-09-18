import { requirePageUser } from "@/lib/server/auth";
import { getCategories } from "@/lib/server/data";
import { aiCapabilities } from "@/lib/ai/config";
import { AIEntry } from "@/features/ai/ai-entry";
export const metadata = { title: "AI দিয়ে খরচ যোগ করুন" };
export default async function Page() {
  await requirePageUser();
  return <AIEntry categories={await getCategories()} capabilities={aiCapabilities()} />;
}
