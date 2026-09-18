import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { appOrigin } from "@/lib/server/http";
import { safeNext } from "@/lib/validation/input";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && supabaseConfigured()) {
    const db = await serverSupabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), appOrigin()));
  }
  return NextResponse.redirect(new URL("/auth-error", appOrigin()));
}
