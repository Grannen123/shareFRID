import { useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { useAssignmentsByCustomer } from "@/hooks/useAssignments";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  ASSIGNMENT_CATEGORY_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import type { Assignment, AssignmentStatus, Priority } from "@/types/database";

interface CustomerAssignmentsTabProps {
  customerId: string;
}

const statusVariants: Record<
  AssignmentStatus,
  "sage" | "outline" | "terracotta"
> = {
  active: "sage",
  paused: "outline",
  closed: "terracotta",
};

const priorityVariants: Record<Priority, "terracotta" | "outline" | "sage"> = {
  high: "terracotta",
  medium: "outline",
  low: "sage",
};

export function CustomerAssignmentsTab({
  customerId,
}: CustomerAssignmentsTabProps) {
  const navigate = useNavigate();
  const { data: assignments, isLoading } = useAssignmentsByCustomer(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-ash">Laddar uppdrag...</div>
        </CardContent>
      </Card>
    );
  }

  const activeAssignments =
    assignments?.filter((a) => a.status === "active") || [];
  const closedAssignments =
    assignments?.filter((a) => a.status !== "active") || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Uppdrag</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/assignments/new?customerId=${customerId}`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nytt uppdrag
        </Button>
      </CardHeader>
      <CardContent>
        {assignments?.length === 0 ? (
          <EmptyState
            title="Inga uppdrag"
            description="Skapa ett nytt uppdrag för denna kund"
          />
        ) : (
          <div className="space-y-6">
            {/* Aktiva uppdrag */}
            {activeAssignments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-ash">
                  Aktiva ({activeAssignments.length})
                </h4>
                {activeAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onClick={() => navigate(`/assignments/${assignment.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Avslutade uppdrag */}
            {closedAssignments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-ash">
                  Avslutade ({closedAssignments.length})
                </h4>
                {closedAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onClick={() => navigate(`/assignments/${assignment.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentCard({
  assignment,
  onClick,
}: {
  assignment: Assignment;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-sand bg-warm-white hover:bg-cream cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-ash font-mono">
              {assignment.assignment_number}
            </span>
            <Badge
              variant={statusVariants[assignment.status]}
              className="text-xs"
            >
              {ASSIGNMENT_STATUS_LABELS[assignment.status]}
            </Badge>
            {assignment.priority === "high" && (
              <Badge
                variant={priorityVariants[assignment.priority]}
                className="text-xs"
              >
                {PRIORITY_LABELS[assignment.priority]}
              </Badge>
            )}
          </div>
          <p className="font-medium text-charcoal truncate">
            {assignment.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-ash">
            <span>{ASSIGNMENT_TYPE_LABELS[assignment.type]}</span>
            {assignment.category && (
              <>
                <span>•</span>
                <span>{ASSIGNMENT_CATEGORY_LABELS[assignment.category]}</span>
              </>
            )}
          </div>
        </div>
        <FileText className="h-5 w-5 text-ash flex-shrink-0" />
      </div>
    </div>
  );
}
