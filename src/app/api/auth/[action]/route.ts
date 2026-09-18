import { cookies } from "next/headers";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { verifiedSession } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import { appOrigin, assertOrigin, endpoint, readJson } from "@/lib/server/http";
import { email, password, record, safeNext, text } from "@/lib/validation/input";
function authError(error: { code?: string } | null) {
  if (!error) return;
  const messages: Record<string, string> = {
    invalid_credentials: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
    email_not_confirmed: "ইমেইল যাচাই করুন। ইনবক্সে যাচাইকরণ লিংক দেখুন।",
    over_request_rate_limit: "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    over_email_send_rate_limit: "অনেকবার ইমেইল পাঠানো হয়েছে। কিছুক্ষণ অপেক্ষা করুন।",
    weak_password: "আরও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।",
    same_password: "আগের পাসওয়ার্ড থেকে আলাদা পাসওয়ার্ড দিন।",
  };
  throw new AppError(
    "AUTH_ERROR",
    messages[error.code ?? ""] ?? "অনুরোধটি সম্পন্ন হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।",
    400,
  );
}
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  return endpoint(async () => {
    assertOrigin(request);
    if (!supabaseConfigured())
      throw new AppError(
        "NOT_CONFIGURED",
        "Supabase এখনো সংযুক্ত নয়। সেটআপ সম্পন্ন হলে লগ ইন করা যাবে।",
        503,
      );
    const { action } = await params;
    const v = record(await readJson(request, 4096));
    if (action === "login") {
      const store = await cookies();
      const remember = v.remember !== false;
      store.set("tt-remember", remember ? "yes" : "no", {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        ...(remember ? { maxAge: 60 * 60 * 24 * 365 } : {}),
      });
      const db = await serverSupabase();
      const { error } = await db.auth.signInWithPassword({
        email: email(v.email),
        password: password(v.password, false),
      });
      authError(error);
      return { redirect: safeNext(v.next) };
    }
    const db = await serverSupabase();
    if (action === "register") {
      const { data, error } = await db.auth.signUp({
        email: email(v.email),
        password: password(v.password),
        options: {
          data: { display_name: text(v.name, "নাম", 80) },
          emailRedirectTo: `${appOrigin()}/auth/callback`,
        },
      });
      authError(error);
      return { redirect: data.session ? "/dashboard" : "/verify-email" };
    }
    if (action === "google") {
      if (process.env.GOOGLE_OAUTH_ENABLED !== "true")
        throw new AppError(
          "OAUTH_UNAVAILABLE",
          "Google লগ ইন এখনো সেটআপ করা হয়নি। ইমেইল দিয়ে লগ ইন করুন।",
          503,
        );
      const { data, error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${appOrigin()}/auth/callback`, skipBrowserRedirect: true },
      });
      authError(error);
      if (!data.url) throw new AppError("OAUTH_UNAVAILABLE", "Google লগ ইন শুরু করা যায়নি।", 503);
      return { redirect: data.url };
    }
    if (action === "forgot") {
      const { error } = await db.auth.resetPasswordForEmail(email(v.email), {
        redirectTo: `${appOrigin()}/auth/callback?next=/reset-password`,
      });
      authError(error);
      return { message: "এই ইমেইলে অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।" };
    }
    if (action === "resend") {
      const { error } = await db.auth.resend({
        type: "signup",
        email: email(v.email),
        options: { emailRedirectTo: `${appOrigin()}/auth/callback` },
      });
      authError(error);
      return { message: "প্রযোজ্য হলে নতুন যাচাইকরণ ইমেইল পাঠানো হয়েছে।" };
    }
    if (action === "reset") {
      await verifiedSession();
      const { error } = await db.auth.updateUser({ password: password(v.password) });
      authError(error);
      const signedOut = await db.auth.signOut({ scope: "local" });
      authError(signedOut.error);
      return { redirect: "/login?notice=password-reset" };
    }
    if (action === "logout") {
      const { error } = await db.auth.signOut({ scope: "local" });
      authError(error);
      (await cookies()).delete("tt-remember");
      return { ok: true };
    }
    throw new AppError("NOT_FOUND", "অনুরোধটি পাওয়া যায়নি।", 404);
  });
}
