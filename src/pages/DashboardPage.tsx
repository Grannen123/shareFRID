import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/features/dashboard/DashboardView";

export function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <DashboardView />
    </AppShell>
  );
}
