import { Clock, FileText, Briefcase, Users, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRecentActivity } from "@/hooks/useDashboard";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";

const entityIcons: Record<string, typeof FileText> = {
  customer: Users,
  assignment: Briefcase,
  journal_entry: FileText,
  task: CheckSquare,
  agreement: FileText,
  time_entry: Clock,
};

const actionLabels: Record<string, string> = {
  created: "skapade",
  updated: "uppdaterade",
  deleted: "tog bort",
  archived: "arkiverade",
  completed: "slutförde",
};

const entityLabels: Record<string, string> = {
  customer: "kund",
  assignment: "uppdrag",
  journal_entry: "journalanteckning",
  task: "uppgift",
  agreement: "avtal",
  time_entry: "tidsregistrering",
};

export function ActivityFeed() {
  const {
    data: activities,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useRecentActivity(10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-charcoal">Senaste aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-sand" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sand rounded w-3/4" />
                  <div className="h-3 bg-sand rounded w-1/4" />
                </div>
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
          <CardTitle className="text-charcoal">Senaste aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
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

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-charcoal">Senaste aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ash text-center py-8">
            Ingen aktivitet registrerad ännu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-charcoal">Senaste aktivitet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = entityIcons[activity.entityType] || FileText;
            const actionLabel =
              actionLabels[activity.action] || activity.action;
            const entityLabel =
              entityLabels[activity.entityType] || activity.entityType;

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "p-2 rounded-full",
                    activity.action === "created" && "bg-sage/10",
                    activity.action === "updated" && "bg-lavender/10",
                    activity.action === "deleted" && "bg-terracotta/10",
                    activity.action === "archived" && "bg-ash/10",
                    activity.action === "completed" && "bg-gold/10",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      activity.action === "created" && "text-sage",
                      activity.action === "updated" && "text-lavender",
                      activity.action === "deleted" && "text-terracotta",
                      activity.action === "archived" && "text-ash",
                      activity.action === "completed" && "text-gold",
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal">
                    <span className="font-medium">
                      {activity.performer?.full_name || "Okänd användare"}
                    </span>{" "}
                    {actionLabel} en {entityLabel}
                  </p>
                  <p className="text-xs text-ash flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(activity.performedAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just nu";
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  if (diffDays === 1) return "igår";
  if (diffDays < 7) return `${diffDays} dagar sedan`;

  return date.toLocaleDateString("sv-SE");
}
