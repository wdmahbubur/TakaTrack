import { verifiedSession } from "@/lib/server/auth";
import { getCategories, listTransactions } from "@/lib/server/data";
import { assertOrigin, endpoint, readJson, refreshFinancialPages } from "@/lib/server/http";
import { record, transactionInput, uuid, ValidationError } from "@/lib/validation/input";
import { dbError } from "@/lib/server/errors";
import { monthOrCurrent } from "@/lib/domain/dates";
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db } = await verifiedSession();
    const v = record(await readJson(request));
    if (v.confirmed !== true) throw new ValidationError("সংরক্ষণের আগে আপনার নিশ্চয়তা প্রয়োজন।");
    if (!Array.isArray(v.entries) || v.entries.length < 1 || v.entries.length > 20)
      throw new ValidationError("একবারে ১–২০টি লেনদেন নির্বাচন করুন।");
    const categories = await getCategories();
    const entries = v.entries.map((e) => transactionInput(e, categories));
    if (new Set(entries.map((e) => e.client_request_id)).size !== entries.length)
      throw new ValidationError("একই লেনদেন একাধিকবার পাঠানো হয়েছে।");
    const items = entries.map(
      ({
        amount_paisa,
        type,
        title,
        category_id,
        occurred_on,
        note,
        input_method,
        client_request_id,
      }) => ({
        amount_paisa,
        type,
        title,
        category_id,
        occurred_on,
        note,
        input_method,
        client_request_id,
      }),
    );
    const { data, error } = await db.rpc("save_transactions", {
      p_request_id: uuid(v.request_id),
      p_items: items,
    });
    dbError(error);
    refreshFinancialPages();
    return { ids: data };
  });
}
export async function GET(request: Request) {
  return endpoint(async () => {
    await verifiedSession();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    return listTransactions(monthOrCurrent(params.month), params);
  });
}
