import { useState } from "react";
import {
  Plus,
  Check,
  Clock,
  MoreHorizontal,
  Calendar,
  StickyNote,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Textarea,
} from "@/components/ui";
import { LABELS } from "@/lib/constants";
import { formatRelativeDate, cn } from "@/lib/utils";
import type { TaskStatus, Priority } from "@/types";

// Mock tasks
const mockTasks = [
  {
    id: "1",
    title: "Ring tillbaka Johansson ang störning",
    caseNumber: "C-26-047",
    status: "pending" as TaskStatus,
    priority: "high" as Priority,
    dueDate: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Skicka varningsbrev till lgh 105",
    caseNumber: "C-26-046",
    status: "pending" as TaskStatus,
    priority: "medium" as Priority,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "3",
    title: "Förbered presentation för styrelsemöte",
    caseNumber: "P-26-008",
    status: "in_progress" as TaskStatus,
    priority: "medium" as Priority,
    dueDate: new Date(Date.now() + 172800000).toISOString(),
  },
  {
    id: "4",
    title: "Granska avtal för BRF Havsutsikten",
    caseNumber: null,
    status: "done" as TaskStatus,
    priority: "low" as Priority,
    dueDate: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Mock notes
const mockNotes = [
  {
    id: "1",
    content:
      "Kontrollera föreningen Solbackens stadgar gällande störningar - §15 kan vara relevant för Lindqvist-ärendet.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    content:
      "Tips från kollega: Hyresrättsutredningen 2023 har ny praxis för andrahandsuthyrning via plattformar.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const priorityColors = {
  low: "default" as const,
  medium: "warning" as const,
  high: "error" as const,
};

function TaskItem({
  task,
  onToggle,
}: {
  task: (typeof mockTasks)[0];
  onToggle: () => void;
}) {
  const isOverdue =
    task.status !== "done" && new Date(task.dueDate) < new Date();

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        task.status === "done"
          ? "border-gray-100 bg-gray-50"
          : "border-gray-200 hover:bg-gray-50",
      )}
    >
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 space-y-1">
        <p
          className={cn(
            "font-medium",
            task.status === "done" && "text-gray-500 line-through",
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-sm">
          {task.caseNumber && (
            <span className="font-mono text-gray-500">{task.caseNumber}</span>
          )}
          <Badge variant={priorityColors[task.priority]}>
            {LABELS.priorities[task.priority]}
          </Badge>
          <span
            className={cn(
              "flex items-center gap-1",
              isOverdue ? "text-red-600" : "text-gray-500",
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatRelativeDate(task.dueDate)}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Redigera</DropdownMenuItem>
          <DropdownMenuItem>Flytta till ärende</DropdownMenuItem>
          <DropdownMenuItem className="text-red-600">Ta bort</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NoteCard({ note }: { note: (typeof mockNotes)[0] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
        <p className="mt-2 text-xs text-gray-400">
          {formatRelativeDate(note.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

export function Workspace() {
  const [tasks, setTasks] = useState(mockTasks);
  const [notes] = useState(mockNotes);
  const [newNote, setNewNote] = useState("");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "done" ? "pending" : "done" }
          : t,
      ),
    );
  };

  const filteredTasks = tasks.filter(
    (t) => filter === "all" || t.status === filter,
  );

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Arbetsyta</h1>
          <p className="text-gray-500">
            {pendingCount} att göra, {inProgressCount} pågående, {doneCount}{" "}
            klara
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ny uppgift
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Uppgifter
                </CardTitle>
                <Tabs
                  value={filter}
                  onValueChange={(v) => setFilter(v as TaskStatus | "all")}
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-2">
                      Alla
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs px-2">
                      <Clock className="mr-1 h-3 w-3" />
                      {pendingCount}
                    </TabsTrigger>
                    <TabsTrigger value="in_progress" className="text-xs px-2">
                      Pågående
                    </TabsTrigger>
                    <TabsTrigger value="done" className="text-xs px-2">
                      <Check className="mr-1 h-3 w-3" />
                      {doneCount}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                  />
                ))}
                {filteredTasks.length === 0 && (
                  <p className="py-8 text-center text-gray-500">
                    {LABELS.emptyStates.noTasks}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Anteckningar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Skriv en anteckning..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    size="sm"
                    disabled={!newNote.trim()}
                    className="w-full"
                  >
                    Spara anteckning
                  </Button>
                </div>

                <div className="space-y-3">
                  {notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
