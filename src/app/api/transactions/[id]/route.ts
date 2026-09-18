import { verifiedSession } from "@/lib/server/auth";
import { getCategories } from "@/lib/server/data";
import { assertOrigin, endpoint, readJson, refreshFinancialPages } from "@/lib/server/http";
import { record, transactionInput, uuid, text } from "@/lib/validation/input";
import { AppError, dbError } from "@/lib/server/errors";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db, user } = await verifiedSession();
    const id = uuid((await params).id);
    const v = record(await readJson(request, 4096));
    const input = transactionInput(v, await getCategories());
    const { data, error } = await db
      .from("transactions")
      .update({
        type: input.type,
        title: input.title,
        amount_paisa: input.amount_paisa,
        category_id: input.category_id,
        occurred_on: input.occurred_on,
        note: input.note || null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("updated_at", text(v.expected_updated_at, "সংস্করণ", 40))
      .select("id")
      .maybeSingle();
    dbError(error);
    if (!data)
      throw new AppError("CONFLICT", "লেনদেনটি অন্য কোথাও পরিবর্তিত বা মুছে গেছে। পাতা রিফ্রেশ করুন।", 409);
    refreshFinancialPages();
    return { id: data.id };
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db, user } = await verifiedSession();
    const id = uuid((await params).id);
    const { error } = await db.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    dbError(error);
    refreshFinancialPages();
    return { ok: true };
  });
}
