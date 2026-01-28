import { Briefcase, MessageSquare, CheckSquare, Paperclip } from "lucide-react";
import { useCustomerTimeline } from "@/hooks/useCustomerTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDateTime } from "@/lib/utils";
import { ASSIGNMENT_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";

interface CustomerTimelineProps {
  customerId: string;
}

const typeConfig = {
  assignment: { icon: Briefcase, label: "Uppdrag" },
  note: { icon: MessageSquare, label: "Anteckning" },
  task: { icon: CheckSquare, label: "Uppgift" },
  file: { icon: Paperclip, label: "Fil" },
} as const;

export function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const { data, isLoading, error, refetch, isRefetching } =
    useCustomerTimeline(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-ash">Laddar aktivitet...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Kunde inte hämta aktivitet"
            message={
              error.message || "Ett fel uppstod vid hämtning av aktivitet."
            }
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-12 w-12" />}
        title="Ingen aktivitet"
        description="Det finns ingen aktivitet kopplad till kunden ännu."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Senaste aktivitet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;
            const statusLabel =
              item.type === "assignment"
                ? ASSIGNMENT_STATUS_LABELS[item.status || "active"]
                : item.type === "task"
                  ? TASK_STATUS_LABELS[item.status || "pending"]
                  : null;

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-3"
              >
                <div className="h-9 w-9 rounded-full bg-sand/60 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-charcoal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-charcoal">
                      {item.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                    {statusLabel && (
                      <Badge variant="outline" className="text-xs">
                        {statusLabel}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-ash mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="text-xs text-ash mt-1">
                    {formatDateTime(item.date)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
