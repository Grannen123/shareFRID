import { useState, useMemo, useCallback, memo } from "react";
import {
  Plus,
  Check,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Pencil,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import {
  useTasks,
  useCreateTask,
  useToggleTaskStatus,
  useDeleteTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { TaskForm } from "./TaskForm";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";
import type { TaskWithRelations, TaskStatus } from "@/types/database";
import type { UpdateTaskData } from "@/hooks/useTasks";

type FilterStatus = "all" | "pending" | "in_progress" | "done";

export function TaskList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(
    null,
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading, error, refetch, isRefetching } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const toggleStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();

  // Memoize filtered tasks to avoid recalculation on every render
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (filterStatus === "all") return tasks;
    return tasks.filter((task) => task.status === filterStatus);
  }, [tasks, filterStatus]);

  // Memoize grouped tasks
  const groupedTasks = useMemo(
    () => ({
      pending: filteredTasks.filter((t) => t.status === "pending"),
      in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
      done: filteredTasks.filter((t) => t.status === "done"),
    }),
    [filteredTasks],
  );

  // Memoize callbacks to prevent unnecessary re-renders
  const handleCreate = useCallback(
    (data: Parameters<typeof createTask.mutate>[0]) => {
      createTask.mutate(data, {
        onSuccess: () => setIsFormOpen(false),
      });
    },
    [createTask],
  );

  const handleUpdate = useCallback(
    (data: UpdateTaskData) => {
      updateTask.mutate(data, {
        onSuccess: () => setEditingTask(null),
      });
    },
    [updateTask],
  );

  const handleEdit = useCallback((task: TaskWithRelations) => {
    setEditingTask(task);
  }, []);

  const handleStatusChange = useCallback(
    (task: TaskWithRelations, newStatus: TaskStatus) => {
      toggleStatus.mutate({ id: task.id, status: newStatus });
    },
    [toggleStatus],
  );

  const handleMarkDone = useCallback(
    (task: TaskWithRelations) => {
      const newStatus = task.status === "done" ? "pending" : "done";
      toggleStatus.mutate({ id: task.id, status: newStatus });
    },
    [toggleStatus],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingTaskId(id);
      deleteTask.mutate(id, {
        onSettled: () => setDeletingTaskId(null),
      });
    },
    [deleteTask],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Uppgifter"
          description="Hantera dina uppgifter och att-göra-lista"
        />
        <Card>
          <CardContent className="pt-6">
            <SkeletonList items={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Uppgifter"
          description="Hantera dina uppgifter och att-göra-lista"
        />
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uppgifter"
        description="Hantera dina uppgifter och att-göra-lista"
        actions={
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny uppgift
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <Button
          variant={filterStatus === "all" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          Alla
        </Button>
        <Button
          variant={filterStatus === "pending" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("pending")}
        >
          Väntande
        </Button>
        <Button
          variant={filterStatus === "in_progress" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("in_progress")}
        >
          Pågående
        </Button>
        <Button
          variant={filterStatus === "done" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("done")}
        >
          Klara
        </Button>
      </div>

      {filteredTasks?.length === 0 ? (
        <EmptyState
          icon={<Check className="h-12 w-12" />}
          title="Inga uppgifter"
          description={
            filterStatus === "all"
              ? "Du har inga uppgifter ännu. Skapa din första uppgift för att komma igång."
              : `Inga ${TASK_STATUS_LABELS[filterStatus].toLowerCase()} uppgifter.`
          }
          action={
            filterStatus === "all" && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Skapa uppgift
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {filterStatus === "all" ? (
            <>
              {groupedTasks.pending.length > 0 && (
                <TaskGroup
                  title="Väntande"
                  tasks={groupedTasks.pending}
                  onStatusChange={handleStatusChange}
                  onMarkDone={handleMarkDone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletingTaskId={deletingTaskId}
                />
              )}
              {groupedTasks.in_progress.length > 0 && (
                <TaskGroup
                  title="Pågående"
                  tasks={groupedTasks.in_progress}
                  onStatusChange={handleStatusChange}
                  onMarkDone={handleMarkDone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletingTaskId={deletingTaskId}
                />
              )}
              {groupedTasks.done.length > 0 && (
                <TaskGroup
                  title="Klara"
                  tasks={groupedTasks.done}
                  onStatusChange={handleStatusChange}
                  onMarkDone={handleMarkDone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletingTaskId={deletingTaskId}
                />
              )}
            </>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onMarkDone={handleMarkDone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deletingTaskId === task.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isLoading={createTask.isPending}
        mode="create"
      />

      {/* Edit form */}
      <TaskForm
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onSubmit={(data) =>
          editingTask && handleUpdate({ id: editingTask.id, ...data })
        }
        isLoading={updateTask.isPending}
        mode="edit"
        defaultValues={editingTask || undefined}
      />
    </div>
  );
}

interface TaskGroupProps {
  title: string;
  tasks: TaskWithRelations[];
  onStatusChange: (task: TaskWithRelations, status: TaskStatus) => void;
  onMarkDone: (task: TaskWithRelations) => void;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (id: string) => void;
  deletingTaskId: string | null;
}

function TaskGroup({
  title,
  tasks,
  onStatusChange,
  onMarkDone,
  onEdit,
  onDelete,
  deletingTaskId,
}: TaskGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ash">
        {title} ({tasks.length})
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onStatusChange={onStatusChange}
            onMarkDone={onMarkDone}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={deletingTaskId === task.id}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithRelations;
  onStatusChange: (task: TaskWithRelations, status: TaskStatus) => void;
  onMarkDone: (task: TaskWithRelations) => void;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

// Memoized TaskCard to prevent unnecessary re-renders
const TaskCard = memo(function TaskCard({
  task,
  onStatusChange,
  onMarkDone,
  onEdit,
  onDelete,
  isDeleting = false,
}: TaskCardProps) {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";

  const isDone = task.status === "done";

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-ash" />,
    in_progress: <AlertCircle className="h-4 w-4 text-gold" />,
    done: <Check className="h-4 w-4 text-sage" />,
  };

  const priorityColor = {
    low: "bg-ash/10 text-ash",
    medium: "bg-gold/10 text-gold",
    high: "bg-terracotta/10 text-terracotta",
  };

  const nextStatus: Record<TaskStatus, TaskStatus> = {
    pending: "in_progress",
    in_progress: "done",
    done: "pending",
  };

  return (
    <Card className={cn(isDone && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Klarmarkering checkbox */}
          <button
            onClick={() => onMarkDone(task)}
            className={cn(
              "mt-1 p-0.5 rounded-full transition-colors",
              isDone
                ? "text-sage hover:text-sage/70"
                : "text-ash/40 hover:text-sage",
            )}
            title={isDone ? "Markera som ej klar" : "Markera som klar"}
            aria-label={isDone ? "Markera som ej klar" : "Markera som klar"}
          >
            {isDone ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>

          {/* Statusikon (klickbar för att cykla status) */}
          <button
            onClick={() => onStatusChange(task, nextStatus[task.status])}
            className="mt-1 p-1 rounded hover:bg-sand transition-colors"
            title={`Ändra status till ${TASK_STATUS_LABELS[nextStatus[task.status]]}`}
          >
            {statusIcon[task.status]}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  "font-medium text-charcoal",
                  isDone && "line-through text-ash",
                )}
              >
                {task.title}
              </h4>
              <Badge className={priorityColor[task.priority]}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>

            {task.description && (
              <p className="text-sm text-ash mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-ash">
              {task.due_date && (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-terracotta font-medium",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString("sv-SE")}
                  {isOverdue && " (försenad)"}
                </span>
              )}

              {task.customer && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.customer.name}
                </span>
              )}

              {task.assignment && (
                <span className="truncate">
                  {task.assignment.assignment_number}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="text-ash hover:text-charcoal"
              title="Redigera uppgift"
              disabled={isDeleting}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="text-ash hover:text-terracotta"
              title="Ta bort uppgift"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ta bort"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

TaskCard.displayName = "TaskCard";
