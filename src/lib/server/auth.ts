import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { serverSupabase } from "../supabase/server";
import { supabaseConfigured } from "../supabase/config";
import { AppError } from "./errors";
// React cache deduplicates ONLY within a single server render/request, not across users.
export const verifiedSession = cache(async () => {
  if (!supabaseConfigured())
    throw new AppError("NOT_CONFIGURED", "Supabase এখনো সংযুক্ত নয়। .env.local সেটআপ করুন।", 503);
  const db = await serverSupabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new AppError("UNAUTHORIZED", "আপনার সেশন শেষ হয়েছে। আবার লগ ইন করুন।", 401);
  return { db, user };
});
export async function requirePageUser() {
  try {
    return await verifiedSession();
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login?notice=session");
    if (error instanceof AppError && error.code === "NOT_CONFIGURED")
      redirect("/login?notice=setup");
    throw error;
  }
}
