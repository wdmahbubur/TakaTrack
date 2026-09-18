import { verifiedSession } from "@/lib/server/auth";
import { getCategories } from "@/lib/server/data";
import { assertOrigin, endpoint, readJson, refreshFinancialPages } from "@/lib/server/http";
import { budgetInput } from "@/lib/validation/input";
import { dbError } from "@/lib/server/errors";
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db, user } = await verifiedSession();
    const value = budgetInput(await readJson(request, 2048), await getCategories());
    const { data, error } = await db
      .from("budgets")
      .insert({ ...value, user_id: user.id })
      .select("id")
      .single();
    dbError(error);
    refreshFinancialPages();
    return { id: data?.id };
  });
}
