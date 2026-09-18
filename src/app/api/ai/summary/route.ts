import { assertOrigin, endpoint, readJson } from "@/lib/server/http";
import { verifiedSession } from "@/lib/server/auth";
import { generateSummary } from "@/lib/ai/service";
import { record, ValidationError } from "@/lib/validation/input";
import { validMonth } from "@/lib/domain/dates";
export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    await verifiedSession();
    const v = record(await readJson(request, 1024));
    if (typeof v.month !== "string" || !validMonth(v.month))
      throw new ValidationError("সঠিক মাস নির্বাচন করুন।");
    return generateSummary(v.month); // Never accept a user ID or financial facts from the browser.
  });
}
