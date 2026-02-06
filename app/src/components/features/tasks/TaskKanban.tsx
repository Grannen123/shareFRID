/**
 * Task Kanban Board Component
 *
 * A drag-and-drop kanban board for managing tasks.
 */

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO, isPast, isToday } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  GripVertical,
} from "lucide-react";
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// Types
type TaskStatus = "pending" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assigneeName?: string;
  caseNumber?: string;
}

// Column configuration
const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "pending", title: "Att göra", color: "bg-gray-100" },
  { id: "in_progress", title: "Pågår", color: "bg-blue-100" },
  { id: "done", title: "Klart", color: "bg-green-100" },
];

const PRIORITY_CONFIG = {
  high: { label: "Hög", className: "bg-red-100 text-red-700" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700" },
  low: { label: "Låg", className: "bg-gray-100 text-gray-600" },
};

// Task Card Component
interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  isDragging?: boolean;
}

function TaskCard({ task, onEdit, onDelete, isDragging }: TaskCardProps) {
  const isOverdue =
    task.dueDate && isPast(parseISO(task.dueDate)) && task.status !== "done";
  const isDueToday = task.dueDate && isToday(parseISO(task.dueDate));
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className={cn(
        "bg-white p-3 rounded-lg border shadow-sm",
        isDragging && "opacity-50",
        isOverdue && "border-red-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>

          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn("text-xs", priorityConfig.className)}
            >
              {priorityConfig.label}
            </Badge>

            {task.caseNumber && (
              <Badge variant="outline" className="text-xs">
                {task.caseNumber}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500",
                  isDueToday && "text-orange-500",
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(parseISO(task.dueDate), "d MMM", { locale: sv })}
                {isOverdue && <AlertCircle className="h-3 w-3" />}
              </span>
            )}

            {task.assigneeName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assigneeName}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(task)}>
              Redigera
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(task.id)}
              className="text-red-600"
            >
              Ta bort
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Sortable Task Card
interface SortableTaskCardProps extends TaskCardProps {
  id: string;
}

function SortableTaskCard({ id, ...props }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="pl-6">
        <TaskCard {...props} isDragging={isDragging} />
      </div>
    </div>
  );
}

// Column Component
interface ColumnProps {
  column: (typeof COLUMNS)[0];
  tasks: Task[];
  onAddTask?: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

function Column({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: ColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div
        className={cn(
          "rounded-t-lg px-3 py-2 flex items-center justify-between",
          column.color,
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAddTask?.(column.id)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-gray-50 rounded-b-lg p-2 min-h-[200px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                id={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            {column.id === "done" ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                Inga avklarade
              </>
            ) : column.id === "in_progress" ? (
              <>
                <Clock className="h-8 w-8 mx-auto mb-2" />
                Inget pågår
              </>
            ) : (
              <>
                <Plus className="h-8 w-8 mx-auto mb-2" />
                Inga uppgifter
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Kanban Board
interface TaskKanbanProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onAddTask?: (status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
  isLoading?: boolean;
}

export function TaskKanban({
  tasks,
  onTaskStatusChange,
  onAddTask,
  onEditTask,
  onDeleteTask,
  isLoading = false,
}: TaskKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      done: [],
    };

    tasks.forEach((task) => {
      grouped[task.status]?.push(task);
    });

    // Sort by priority within each column
    Object.values(grouped).forEach((columnTasks) => {
      columnTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });

    return grouped;
  }, [tasks]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId),
    [tasks, activeId],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Drag over handling - event passed but not used
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);

      if (!over) return;

      const activeTask = tasks.find((t) => t.id === active.id);
      if (!activeTask) return;

      // Determine new status
      let newStatus: TaskStatus | null = null;

      // Check if dropped on a column
      if (COLUMNS.some((col) => col.id === over.id)) {
        newStatus = over.id as TaskStatus;
      } else {
        // Dropped on another task - find its status
        const overTask = tasks.find((t) => t.id === over.id);
        if (overTask) {
          newStatus = overTask.status;
        }
      }

      if (newStatus && newStatus !== activeTask.status) {
        await onTaskStatusChange(activeTask.id, newStatus);
      }
    },
    [tasks, onTaskStatusChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id]}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-[280px]">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
