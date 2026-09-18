import { AuthForm } from "@/features/auth/auth-form";
import { supabaseConfigured } from "@/lib/supabase/config";
export const metadata = { title: "লগ ইন" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="login"
      configured={supabaseConfigured()}
      googleEnabled={process.env.GOOGLE_OAUTH_ENABLED === "true"}
      notice={params.notice ?? ""}
    />
  );
}
