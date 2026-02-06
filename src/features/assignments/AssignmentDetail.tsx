import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  CheckCircle,
  Building2,
  FileText,
  Users,
  CheckSquare,
  Trash2,
  Paperclip,
} from "lucide-react";
import {
  useAssignment,
  useUpdateAssignment,
  useCloseAssignment,
  useDeleteAssignment,
} from "@/hooks/useAssignments";
import { useCustomerAgreement } from "@/hooks/useAgreements";
import { useTimebankStatus } from "@/hooks/useTimebank";
import { useCreateJournalEntry } from "@/hooks/useJournal";
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  ASSIGNMENT_CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  Skeleton,
  SkeletonText,
  SkeletonButton,
} from "@/components/ui/Skeleton";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AssignmentForm } from "./AssignmentForm";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalTimeline } from "./JournalTimeline";
import { AssignmentContactsTab } from "./AssignmentContactsTab";
import { AssignmentTasksTab } from "./AssignmentTasksTab";
import { FilesTab } from "@/features/files/FilesTab";
import type { AssignmentFormData, JournalFormData } from "@/lib/schemas";

const statusVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  active: "sage",
  paused: "outline",
  closed: "terracotta",
};

const priorityVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  low: "outline",
  medium: "sage",
  high: "terracotta",
};

export function AssignmentDetail() {
  const { assignmentId, "*": splat } = useParams<{
    assignmentId: string;
    "*": string;
  }>();
  const navigate = useNavigate();
  const {
    data: assignment,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useAssignment(assignmentId);

  const breadcrumbs = [
    { label: "Uppdrag", href: "/assignments" },
    { label: assignment?.title || "Laddar..." },
  ];
  const { data: agreement } = useCustomerAgreement(assignment?.customer_id);
  const { data: timebankStatus } = useTimebankStatus(agreement?.id);
  const updateAssignment = useUpdateAssignment();
  const closeAssignment = useCloseAssignment();
  const deleteAssignment = useDeleteAssignment();
  const createJournalEntry = useCreateJournalEntry();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "journal" | "tasks" | "contacts" | "files"
  >("journal");

  // Auto-open edit form when navigated to /assignments/:id/edit
  useEffect(() => {
    if (splat === "edit" && assignment) {
      setShowEditForm(true);
      navigate(`/assignments/${assignmentId}`, { replace: true });
    }
  }, [splat, assignment, assignmentId, navigate]);

  if (isLoading) {
    return (
      <AppShell title="Uppdrag">
        <div className="space-y-6">
          <Breadcrumbs items={breadcrumbs} />
          {/* Header skeleton */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <SkeletonButton />
                <SkeletonButton />
                <SkeletonButton />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <SkeletonText lines={3} />
                </div>
                <div>
                  <Skeleton className="h-4 w-12 mb-2" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs skeleton */}
          <div className="flex gap-2 border-b border-sand pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <SkeletonText lines={3} />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <SkeletonButton size="lg" className="w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Uppdrag">
        <ErrorState
          title="Kunde inte hämta uppdrag"
          message={
            error.message || "Ett fel uppstod vid hämtning av uppdraget."
          }
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </AppShell>
    );
  }
  if (!assignment) {
    return (
      <AppShell title="Uppdrag hittades inte">
        <div className="text-center py-12">
          <p className="text-terracotta mb-4">Kunde inte hitta uppdraget</p>
          <Button onClick={() => navigate("/assignments")}>
            Tillbaka till uppdrag
          </Button>
        </div>
      </AppShell>
    );
  }

  const handleUpdateAssignment = async (data: AssignmentFormData) => {
    await updateAssignment.mutateAsync({ id: assignment.id, ...data });
    setShowEditForm(false);
  };

  const handleCloseAssignment = async () => {
    await closeAssignment.mutateAsync(assignment.id);
    setShowCloseConfirm(false);
  };

  const handleDeleteAssignment = async () => {
    await deleteAssignment.mutateAsync(assignment);
    setShowDeleteConfirm(false);
    navigate("/assignments");
  };

  const handleCreateJournalEntry = async (data: JournalFormData) => {
    await createJournalEntry.mutateAsync({
      assignmentId: assignment.id,
      data,
      agreement: agreement || null,
      timebankStatus: timebankStatus || null,
      customerId: assignment.customer_id,
    });
  };

  const hasTimebank = agreement?.type === "timebank";
  const remainingHours = timebankStatus?.hoursRemaining || 0;

  return (
    <AppShell
      title={assignment.title}
      backButton={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/assignments")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>
      }
    >
      <div className="space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                <Badge variant={statusVariants[assignment.status]}>
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </Badge>
                <Badge variant={priorityVariants[assignment.priority]}>
                  {PRIORITY_LABELS[assignment.priority]}
                </Badge>
              </div>
              <CardDescription className="space-y-1">
                <div>{assignment.assignment_number}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {ASSIGNMENT_TYPE_LABELS[assignment.type]}
                  </Badge>
                  {assignment.category && (
                    <Badge variant="outline">
                      {ASSIGNMENT_CATEGORY_LABELS[assignment.category]}
                    </Badge>
                  )}
                </div>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditForm(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Redigera
              </Button>
              {assignment.status === "active" && (
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirm(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Avsluta
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Ta bort
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-ash mb-2">
                  Beskrivning
                </h3>
                <p className="text-sm whitespace-pre-wrap">
                  {assignment.description || "Ingen beskrivning"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ash mb-2">Kund</h3>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-normal hover:bg-transparent hover:underline"
                  onClick={() =>
                    navigate(`/customers/${assignment.customer.id}`)
                  }
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {assignment.customer.name}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs navigation */}
        <div className="flex gap-2 border-b border-sand pb-2">
          <button
            onClick={() => setActiveTab("journal")}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === "journal"
                  ? "bg-sage text-white"
                  : "text-ash hover:bg-sand hover:text-charcoal"
              }
            `}
          >
            <FileText className="h-4 w-4" />
            Journal
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === "tasks"
                  ? "bg-sage text-white"
                  : "text-ash hover:bg-sand hover:text-charcoal"
              }
            `}
          >
            <CheckSquare className="h-4 w-4" />
            Uppgifter
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === "contacts"
                  ? "bg-sage text-white"
                  : "text-ash hover:bg-sand hover:text-charcoal"
              }
            `}
          >
            <Users className="h-4 w-4" />
            Kontakter
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeTab === "files"
                  ? "bg-sage text-white"
                  : "text-ash hover:bg-sand hover:text-charcoal"
              }
            `}
          >
            <Paperclip className="h-4 w-4" />
            Filer
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "journal" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <JournalTimeline
                assignmentId={assignment.id}
                customerId={assignment.customer_id}
                agreement={agreement}
                timebankStatus={timebankStatus}
              />
            </div>
            <div>
              <JournalEntryForm
                onSubmit={handleCreateJournalEntry}
                isLoading={createJournalEntry.isPending}
                hasTimebank={hasTimebank}
                remainingHours={remainingHours}
              />
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <AssignmentTasksTab
            assignmentId={assignment.id}
            customerId={assignment.customer_id}
          />
        )}

        {activeTab === "contacts" && (
          <AssignmentContactsTab
            assignmentId={assignment.id}
            customerId={assignment.customer_id}
          />
        )}

        {activeTab === "files" && (
          <FilesTab
            assignmentId={assignment.id}
            customerId={assignment.customer_id}
          />
        )}
      </div>

      <AssignmentForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        onSubmit={handleUpdateAssignment}
        isLoading={updateAssignment.isPending}
        defaultValues={assignment}
        mode="edit"
      />

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Avsluta uppdrag"
        description={`Är du säker på att du vill avsluta "${assignment.title}"?`}
        confirmLabel="Avsluta"
        onConfirm={handleCloseAssignment}
        isLoading={closeAssignment.isPending}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Ta bort uppdrag"
        description={`Är du säker på att du vill ta bort "${assignment.title}"? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDeleteAssignment}
        isLoading={deleteAssignment.isPending}
      />
    </AppShell>
  );
}
