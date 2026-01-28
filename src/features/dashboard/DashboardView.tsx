import { KPICards } from "./KPICards";
import { IndexationAlert } from "./IndexationAlert";
import { MyTasksWidget } from "./MyTasksWidget";
import { ActivityFeed } from "./ActivityFeed";
import { QuickActions } from "./QuickActions";

export function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <QuickActions />

      {/* KPI Cards */}
      <KPICards />

      {/* Indexation Alert - only shows if there are alerts */}
      <IndexationAlert />

      {/* Two-column layout for widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyTasksWidget />
        <ActivityFeed />
      </div>
    </div>
  );
}
