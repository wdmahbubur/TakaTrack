import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { appOrigin } from "@/lib/server/http";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (
    supabaseConfigured() &&
    token_hash &&
    (type === "signup" || type === "recovery" || type === "email_change")
  ) {
    const db = await serverSupabase();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(type === "recovery" ? "/reset-password" : "/dashboard", appOrigin()),
      );
  }
  return NextResponse.redirect(new URL("/auth-error", appOrigin()));
}
