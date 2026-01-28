import { AppShell } from "@/components/layout/AppShell";
import { ProfileForm } from "@/features/profile/ProfileForm";

export function ProfilePage() {
  return (
    <AppShell title="Min profil">
      <ProfileForm />
    </AppShell>
  );
}
