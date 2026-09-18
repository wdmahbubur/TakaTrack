export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "23505")
    throw new AppError("CONFLICT", "এই বিভাগে বাজেট বা অনুরোধ ইতিমধ্যে আছে। পাতা রিফ্রেশ করুন।", 409);
  if (error.code === "22023")
    throw new AppError("INVALID_REQUEST", "একই অনুরোধ পরিবর্তন করে পাঠানো হয়েছে অথবা তথ্য সঠিক নয়।", 409);
  if (error.code === "42501") throw new AppError("FORBIDDEN", "এই তথ্য ব্যবহারের অনুমতি নেই।", 403);
  if (error.code?.startsWith("23"))
    throw new AppError("INVALID_DATA", "পরিমাণ, বিভাগ ও তারিখ যাচাই করুন।");
  throw new AppError("DATABASE_ERROR", "তথ্য লোড বা সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।", 503);
}
