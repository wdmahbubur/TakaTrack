import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ValidationError } from "../validation/input";
import { AppError } from "./errors";
export function appOrigin(): string {
  const vercelHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  const value =
    process.env.APP_ORIGIN ||
    (vercelHost ? `https://${vercelHost}` : "") ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (!value) throw new AppError("NOT_CONFIGURED", "APP_ORIGIN সেটআপ প্রয়োজন।", 503);
  return new URL(value).origin;
}
export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    throw new AppError("ORIGIN_REJECTED", "অনুরোধের উৎস অনুমোদিত নয়।", 403);
}
export async function boundedBytes(
  request: Request,
  max: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const length = Number(request.headers.get("content-length"));
  if (length > max) throw new AppError("TOO_LARGE", "অনুরোধটি আকারে বেশি বড়।", 413);
  if (!request.body) throw new AppError("EMPTY_BODY", "কোনো তথ্য পাঠানো হয়নি।");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new AppError("TOO_LARGE", "অনুরোধটি আকারে বেশি বড়।", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function readJson(request: Request, max = 32768): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("CONTENT_TYPE", "JSON অনুরোধ প্রয়োজন।", 415);
  const bytes = await boundedBytes(request, max);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AppError("INVALID_JSON", "অনুরোধ সঠিক নয়।");
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function endpoint(fn: () => Promise<unknown>) {
  try {
    return json(await fn());
  } catch (error) {
    if (error instanceof ValidationError)
      return json(
        { error: { code: "VALIDATION", message: error.message, fields: error.fields } },
        400,
      );
    if (error instanceof AppError)
      return json({ error: { code: error.code, message: error.message } }, error.status);
    // No raw bodies, descriptions, tokens, or provider response text in application logs.
    return json({ error: { code: "INTERNAL", message: "সাময়িক সমস্যা হয়েছে। আবার চেষ্টা করুন।" } }, 500);
  }
}
export function refreshFinancialPages() {
  for (const path of ["/dashboard", "/transactions", "/budgets", "/reports"]) revalidatePath(path);
}
