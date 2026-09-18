import { assertOrigin, endpoint, readJson } from "@/lib/server/http";
import { verifiedSession } from "@/lib/server/auth";
import { record, text } from "@/lib/validation/input";
import { extractExpenses } from "@/lib/ai/service";
export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    await verifiedSession();
    const v = record(await readJson(request, 20000));
    return extractExpenses(
      text(v.text, "বিবরণ", 4000),
      v.method === "ai_voice" ? "ai_voice" : "ai_text",
    );
  });
}
