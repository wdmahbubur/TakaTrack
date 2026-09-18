import { assertOrigin, boundedBytes, endpoint } from "@/lib/server/http";
import { verifiedSession } from "@/lib/server/auth";
import { transcribeAudio } from "@/lib/ai/service";
import { aiCapabilities } from "@/lib/ai/config";
import { AppError } from "@/lib/server/errors";
export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    await verifiedSession();
    const type = request.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data"))
      throw new AppError("CONTENT_TYPE", "অডিও আপলোড প্রয়োজন।", 415);
    // Bound actual bytes before parsing multipart; do not trust Content-Length.
    const bytes = await boundedBytes(request, aiCapabilities().maxAudioBytes + 16384);
    let form: FormData;
    try {
      form = await new Response(bytes, { headers: { "Content-Type": type } }).formData();
    } catch {
      throw new AppError("INVALID_AUDIO", "অডিও আপলোডটি সঠিক নয়।");
    }
    const file = form.get("audio");
    if (!(file instanceof File)) throw new AppError("INVALID_AUDIO", "অডিও ফাইল পাওয়া যায়নি।");
    return transcribeAudio(new Uint8Array(await file.arrayBuffer()), file.type);
  });
}
