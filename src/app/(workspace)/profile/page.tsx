import { requirePageUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/data";
import { ProfileForm } from "@/features/profile/profile-form";
export const metadata = { title: "প্রোফাইল" };
export default async function Page() {
  await requirePageUser();
  const { profile, email } = await getProfile();
  return <ProfileForm name={profile?.display_name ?? ""} email={email} />;
}
