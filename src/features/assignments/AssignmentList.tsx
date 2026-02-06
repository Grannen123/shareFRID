import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  CheckCircle,
} from "lucide-react";
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useCloseAssignment,
} from "@/hooks/useAssignments";
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  ASSIGNMENT_CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { AssignmentForm } from "./AssignmentForm";
import type { AssignmentFormData } from "@/lib/schemas";
import type { AssignmentWithCustomer } from "@/types/database";

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

export function AssignmentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: assignments,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useAssignments();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const closeAssignment = useCloseAssignment();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-open create form when navigated with ?action=create
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setShowCreateForm(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [deleteConfirm, setDeleteConfirm] =
    useState<AssignmentWithCustomer | null>(null);
  const [closeConfirm, setCloseConfirm] =
    useState<AssignmentWithCustomer | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Uppdrag"
          description="Hantera dina uppdrag och ärenden"
        />
        <Card>
          <CardContent className="pt-6">
            <SkeletonTable rows={5} columns={7} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Uppdrag"
          description="Hantera dina uppdrag och ärenden"
        />
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Kunde inte hämta uppdrag"
              message={
                error.message ||
                "Ett fel uppstod vid hämtning av uppdragslistan."
              }
              onRetry={() => refetch()}
              isRetrying={isRefetching}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredAssignments =
    assignments?.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.assignment_number.toLowerCase().includes(search.toLowerCase()) ||
        a.customer.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];

  const handleCreateAssignment = async (data: AssignmentFormData) => {
    await createAssignment.mutateAsync(data);
    setShowCreateForm(false);
  };

  const handleDeleteAssignment = async () => {
    if (deleteConfirm) {
      await deleteAssignment.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleCloseAssignment = async () => {
    if (closeConfirm) {
      await closeAssignment.mutateAsync(closeConfirm.id);
      setCloseConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uppdrag"
        description="Hantera dina uppdrag och ärenden"
        actions={
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nytt uppdrag
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <SearchInput
              placeholder="Sök uppdrag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              {["all", "active", "paused", "closed"].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all"
                    ? "Alla"
                    : ASSIGNMENT_STATUS_LABELS[
                        status as keyof typeof ASSIGNMENT_STATUS_LABELS
                      ]}
                </Button>
              ))}
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-12 w-12" />}
              title="Inga uppdrag"
              description={
                search || statusFilter !== "all"
                  ? "Inga uppdrag matchar dina filter"
                  : "Kom igång genom att skapa ditt första uppdrag"
              }
              action={
                !search &&
                statusFilter === "all" && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Skapa uppdrag
                  </Button>
                )
              }
            />
          ) : (
            <Table density="comfortable" hoverable>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Kund</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Prioritet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow
                    key={assignment.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/assignments/${assignment.id}`)}
                  >
                    <TableCell className="font-medium">
                      {assignment.assignment_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{assignment.title}</div>
                        {assignment.category && (
                          <div className="text-xs text-ash">
                            {ASSIGNMENT_CATEGORY_LABELS[assignment.category]}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{assignment.customer.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ASSIGNMENT_TYPE_LABELS[assignment.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariants[assignment.priority]}>
                        {PRIORITY_LABELS[assignment.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[assignment.status]}>
                        {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/assignments/${assignment.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/assignments/${assignment.id}/edit`)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Redigera
                          </DropdownMenuItem>
                          {assignment.status === "active" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCloseConfirm(assignment);
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Avsluta
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(assignment);
                            }}
                            className="text-terracotta focus:text-terracotta"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ta bort
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssignmentForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={handleCreateAssignment}
        isLoading={createAssignment.isPending}
        mode="create"
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort uppdrag"
        description={`Är du säker på att du vill ta bort "${deleteConfirm?.title}"? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDeleteAssignment}
        isLoading={deleteAssignment.isPending}
      />

      <ConfirmDialog
        open={!!closeConfirm}
        onOpenChange={(open) => !open && setCloseConfirm(null)}
        title="Avsluta uppdrag"
        description={`Är du säker på att du vill avsluta "${closeConfirm?.title}"?`}
        confirmLabel="Avsluta"
        onConfirm={handleCloseAssignment}
        isLoading={closeAssignment.isPending}
      />
    </div>
  );
}
