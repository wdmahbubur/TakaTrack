import { revalidatePath } from "next/cache";
import { verifiedSession } from "@/lib/server/auth";
import { assertOrigin, endpoint, readJson } from "@/lib/server/http";
import { record, text } from "@/lib/validation/input";
import { dbError } from "@/lib/server/errors";
export async function PATCH(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    const { db, user } = await verifiedSession();
    const v = record(await readJson(request, 1024));
    const { error } = await db
      .from("profiles")
      .update({ display_name: text(v.display_name, "নাম", 80) })
      .eq("id", user.id);
    dbError(error);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
