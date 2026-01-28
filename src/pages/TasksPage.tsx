import { AppShell } from "@/components/layout/AppShell";
import { TaskList } from "@/features/tasks/TaskList";

export function TasksPage() {
  return (
    <AppShell title="Uppgifter">
      <TaskList />
    </AppShell>
  );
}
