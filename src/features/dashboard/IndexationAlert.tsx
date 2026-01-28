import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useIndexationAlerts } from "@/hooks/useDashboard";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";

export function IndexationAlert() {
  const {
    data: alerts,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useIndexationAlerts();

  if (isLoading) {
    return (
      <Card className="border-terracotta/30 bg-terracotta/5">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-terracotta/20" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-terracotta/20 rounded w-1/3" />
              <div className="h-3 bg-terracotta/20 rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-terracotta/30 bg-terracotta/5">
        <CardContent className="p-4">
          <ErrorState
            variant="inline"
            title="Kunde inte hämta indexeringar"
            message={
              error.message ||
              "Ett fel uppstod vid hämtning av indexeringsvarningar."
            }
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-terracotta/30 bg-terracotta/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-terracotta">
          <AlertTriangle className="h-5 w-5" />
          Indexeringsvarning
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-ash mb-3">
          {alerts.length === 1
            ? "Ett avtal behöver indexeras inom 7 dagar:"
            : `${alerts.length} avtal behöver indexeras inom 7 dagar:`}
        </p>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              to={`/customers/${alert.customerId}`}
              className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-sand transition-colors group"
            >
              <div>
                <p className="font-medium text-charcoal group-hover:text-sage transition-colors">
                  {alert.customerName}
                </p>
                <p className="text-xs text-ash">
                  Indexering:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      alert.daysUntil <= 0 && "text-terracotta",
                      alert.daysUntil > 0 &&
                        alert.daysUntil <= 3 &&
                        "text-gold",
                    )}
                  >
                    {new Date(alert.nextIndexation).toLocaleDateString("sv-SE")}
                    {alert.daysUntil <= 0 && " (försenad)"}
                    {alert.daysUntil === 1 && " (imorgon)"}
                    {alert.daysUntil > 1 && ` (om ${alert.daysUntil} dagar)`}
                  </span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-ash group-hover:text-sage transition-colors" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
