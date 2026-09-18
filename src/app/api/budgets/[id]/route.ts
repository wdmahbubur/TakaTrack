import { verifiedSession } from "@/lib/server/auth";
import { getCategories } from "@/lib/server/data";
import { assertOrigin, endpoint, readJson, refreshFinancialPages } from "@/lib/server/http";
import { budgetInput, uuid } from "@/lib/validation/input";
import { AppError, dbError } from "@/lib/server/errors";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db, user } = await verifiedSession();
    const id = uuid((await params).id);
    const value = budgetInput(await readJson(request, 2048), await getCategories());
    const { data, error } = await db
      .from("budgets")
      .update(value)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    dbError(error);
    if (!data) throw new AppError("NOT_FOUND", "বাজেটটি পাওয়া যায়নি।", 404);
    refreshFinancialPages();
    return { id: data.id };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db, user } = await verifiedSession();
    const id = uuid((await params).id);
    const { error } = await db.from("budgets").delete().eq("id", id).eq("user_id", user.id);
    dbError(error);
    refreshFinancialPages();
    return { ok: true };
  });
}
