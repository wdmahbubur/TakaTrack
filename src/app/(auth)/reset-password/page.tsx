import { AuthForm } from "@/features/auth/auth-form";
import { supabaseConfigured } from "@/lib/supabase/config";
import { requirePageUser } from "@/lib/server/auth";
export const metadata = { title: "নতুন পাসওয়ার্ড" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePageUser();
  const params = await searchParams;
  return (
    <AuthForm
      mode="reset"
      configured={supabaseConfigured()}
      googleEnabled={process.env.GOOGLE_OAUTH_ENABLED === "true"}
      notice={params.notice ?? ""}
    />
  );
}
