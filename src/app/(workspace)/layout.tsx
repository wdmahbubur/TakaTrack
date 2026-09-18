import { requirePageUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/data";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  const { profile } = await getProfile();
  return <Shell name={profile?.display_name ?? ""}>{children}</Shell>;
}
