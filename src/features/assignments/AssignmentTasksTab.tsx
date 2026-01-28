import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  CheckCircle,
  Circle,
  Clock,
  User,
} from "lucide-react";
import {
  useTasksByAssignment,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskStatus,
} from "@/hooks/useTasks";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { TaskForm } from "@/features/tasks/TaskForm";
import { PRIORITY_LABELS } from "@/lib/constants";
import { format, isPast, isToday } from "date-fns";
import { sv } from "date-fns/locale";
import type { Task, TaskStatus } from "@/types/database";

interface AssignmentTasksTabProps {
  assignmentId: string;
  customerId: string;
}

const priorityVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  low: "outline",
  medium: "sage",
  high: "terracotta",
};

const statusIcons: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  done: CheckCircle,
};

export function AssignmentTasksTab({
  assignmentId,
  customerId,
}: AssignmentTasksTabProps) {
  const {
    data: tasks,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useTasksByAssignment(assignmentId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);

  const handleOpenForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
    } else {
      setEditingTask(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const handleSubmit = async (
    data: Parameters<typeof createTask.mutateAsync>[0],
  ) => {
    if (editingTask) {
      await updateTask.mutateAsync({ id: editingTask.id, ...data });
    } else {
      await createTask.mutateAsync({
        ...data,
        customer_id: customerId,
        assignment_id: assignmentId,
      });
    }
    handleCloseForm();
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteTask.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === "done" ? "pending" : "done";
    await toggleStatus.mutateAsync({ id: task.id, status: nextStatus });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-ash">Laddar uppgifter...</div>
        </CardContent>
      </Card>
    );
  }

  // Gruppera uppgifter
  const pendingTasks = tasks?.filter((t) => t.status !== "done") || [];
  const completedTasks = tasks?.filter((t) => t.status === "done") || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Uppgifter för uppdraget</CardTitle>
          <Button variant="outline" size="sm" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Ny uppgift
          </Button>
        </CardHeader>
        <CardContent>
          {tasks?.length === 0 ? (
            <EmptyState
              title="Inga uppgifter"
              description="Skapa uppgifter kopplade till detta uppdrag"
            />
          ) : (
            <div className="space-y-6">
              {/* Aktiva uppgifter */}
              {pendingTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-ash">
                    Att göra ({pendingTasks.length})
                  </h3>
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggleStatus(task)}
                      onEdit={() => handleOpenForm(task)}
                      onDelete={() => setDeleteConfirm(task)}
                    />
                  ))}
                </div>
              )}

              {/* Klara uppgifter */}
              {completedTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-ash">
                    Klara ({completedTasks.length})
                  </h3>
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggleStatus(task)}
                      onEdit={() => handleOpenForm(task)}
                      onDelete={() => setDeleteConfirm(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleSubmit}
        isLoading={createTask.isPending || updateTask.isPending}
        defaultValues={editingTask || undefined}
        mode={editingTask ? "edit" : "create"}
        presetCustomerId={customerId}
        presetAssignmentId={assignmentId}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort uppgift"
        description={`Är du säker på att du vill ta bort "${deleteConfirm?.title}"? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDelete}
        isLoading={deleteTask.isPending}
      />
    </>
  );
}

interface TaskItemProps {
  task: Task & { assignee?: { id: string; name: string } | null };
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const StatusIcon = statusIcons[task.status];
  const isDone = task.status === "done";
  const isOverdue =
    task.due_date &&
    isPast(new Date(task.due_date)) &&
    !isDone &&
    !isToday(new Date(task.due_date));

  return (
    <div
      className={`p-4 rounded-lg border ${isDone ? "border-sand/50 bg-sand/30" : "border-sand bg-warm-white"}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex-shrink-0 ${isDone ? "text-sage" : "text-ash hover:text-sage"}`}
        >
          <StatusIcon className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p
                className={`font-medium ${isDone ? "text-ash line-through" : "text-charcoal"}`}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-ash mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={priorityVariants[task.priority]}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Redigera
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-terracotta focus:text-terracotta"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            {task.due_date && (
              <span
                className={`flex items-center gap-1 ${isOverdue ? "text-terracotta" : "text-ash"}`}
              >
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(task.due_date), "d MMM yyyy", { locale: sv })}
                {isOverdue && " (försenad)"}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1 text-ash">
                <User className="h-3.5 w-3.5" />
                {task.assignee.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
