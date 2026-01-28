import { Link } from "react-router-dom";
import {
  Check,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useMyTasks, useToggleTaskStatus } from "@/hooks/useTasks";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";
import type { TaskWithRelations, TaskStatus } from "@/types/database";

export function MyTasksWidget() {
  const { data: tasks, isLoading, error, refetch, isRefetching } = useMyTasks();
  const toggleStatus = useToggleTaskStatus();

  const handleStatusChange = (
    task: TaskWithRelations,
    newStatus: TaskStatus,
  ) => {
    toggleStatus.mutate({ id: task.id, status: newStatus });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-charcoal">Mina uppgifter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-sand" />
                <div className="flex-1 h-4 bg-sand rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-charcoal">Mina uppgifter</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Kunde inte hämta uppgifter"
            message={
              error.message || "Ett fel uppstod vid hämtning av uppgifter."
            }
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  const displayTasks = tasks?.slice(0, 8) || [];
  const hasMore = (tasks?.length || 0) > 8;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-charcoal">Mina uppgifter</CardTitle>
        <Link to="/tasks">
          <Button variant="ghost" size="sm">
            Visa alla
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {displayTasks.length === 0 ? (
          <p className="text-sm text-ash text-center py-4">
            Du har inga öppna uppgifter.
          </p>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => {
              const isOverdue =
                task.due_date &&
                new Date(task.due_date) < new Date() &&
                task.status !== "done";

              const statusIcon = {
                pending: <Clock className="h-4 w-4 text-ash" />,
                in_progress: <AlertCircle className="h-4 w-4 text-gold" />,
                done: <Check className="h-4 w-4 text-sage" />,
              };

              const nextStatus: Record<TaskStatus, TaskStatus> = {
                pending: "in_progress",
                in_progress: "done",
                done: "pending",
              };

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-sand transition-colors"
                >
                  <button
                    onClick={() =>
                      handleStatusChange(task, nextStatus[task.status])
                    }
                    className="p-1 rounded hover:bg-white transition-colors"
                  >
                    {statusIcon[task.status]}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p
                        className={cn(
                          "text-xs flex items-center gap-1",
                          isOverdue ? "text-terracotta" : "text-ash",
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString("sv-SE")}
                        {isOverdue && " (försenad)"}
                      </p>
                    )}
                  </div>
                  {task.customer && (
                    <span className="text-xs text-ash truncate max-w-[100px]">
                      {task.customer.name}
                    </span>
                  )}
                </div>
              );
            })}
            {hasMore && (
              <p className="text-xs text-ash text-center pt-2">
                +{(tasks?.length || 0) - 5} fler uppgifter
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
