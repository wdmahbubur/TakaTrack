import { AuthForm } from "@/features/auth/auth-form";
import { supabaseConfigured } from "@/lib/supabase/config";
export const metadata = { title: "অ্যাকাউন্ট তৈরি" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="register"
      configured={supabaseConfigured()}
      googleEnabled={process.env.GOOGLE_OAUTH_ENABLED === "true"}
      notice={params.notice ?? ""}
    />
  );
}
