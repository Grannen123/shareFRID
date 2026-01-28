import {
  Users,
  Briefcase,
  CheckSquare,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useDashboardStats } from "@/hooks/useDashboard";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subtitle?: string;
  loading?: boolean;
  compact?: boolean;
  highlight?: boolean;
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
  loading,
  compact = false,
  highlight = false,
}: KPICardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 bg-warm-white rounded-[var(--radius-md)] border",
          highlight
            ? "border-terracotta/30 bg-terracotta-50"
            : "border-sand/50",
        )}
      >
        <div className={cn("p-1.5 rounded-md", bgColor)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ash truncate">{title}</p>
          <p
            className={cn(
              "text-lg font-semibold leading-tight",
              loading ? "animate-pulse bg-sand rounded w-8 h-5" : color,
            )}
          >
            {loading ? "" : value}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("p-2 rounded-lg shrink-0", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
        <div className="mt-3">
          <p
            className={cn(
              "text-2xl font-display font-bold leading-none",
              loading ? "animate-pulse bg-sand rounded w-12 h-7" : color,
            )}
          >
            {loading ? "" : value}
          </p>
          <p className="text-xs text-ash mt-1">{title}</p>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICards() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDashboardStats();

  if (error) {
    return (
      <ErrorState
        title="Kunde inte hämta KPI:er"
        message={error.message || "Ett fel uppstod vid hämtning av KPI-data."}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  // Primary KPIs - displayed as larger cards
  const primaryKPIs = [
    {
      title: "Aktiva kunder",
      value: stats?.activeCustomers ?? 0,
      icon: Users,
      color: "text-sage",
      bgColor: "bg-sage/10",
    },
    {
      title: "Pågående uppdrag",
      value: stats?.activeAssignments ?? 0,
      icon: Briefcase,
      color: "text-lavender",
      bgColor: "bg-lavender/10",
    },
    {
      title: "Öppna uppgifter",
      value: stats?.pendingTasks ?? 0,
      icon: CheckSquare,
      color: "text-gold",
      bgColor: "bg-gold/10",
      highlight: (stats?.pendingTasks ?? 0) > 5,
    },
    {
      title: "Timmar denna månad",
      value: `${stats?.hoursThisMonth?.toFixed(1) ?? "0"}h`,
      icon: Clock,
      color: "text-charcoal",
      bgColor: "bg-sand",
    },
  ];

  // Secondary KPIs - displayed as compact cards in a row
  const secondaryKPIs = [
    {
      title: "Oexporterade timmar",
      value: `${stats?.unbilledHours?.toFixed(1) ?? "0"}h`,
      icon: FileText,
      color: "text-terracotta",
      bgColor: "bg-terracotta/10",
      highlight: (stats?.unbilledHours ?? 0) > 0,
    },
    {
      title: "Kommande indexeringar",
      value: stats?.upcomingIndexations ?? 0,
      icon: AlertTriangle,
      color: stats?.upcomingIndexations ? "text-terracotta" : "text-ash",
      bgColor: stats?.upcomingIndexations ? "bg-terracotta/10" : "bg-sand",
      highlight: (stats?.upcomingIndexations ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary KPIs - 4 columns on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKPIs.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} loading={isLoading} />
        ))}
      </div>

      {/* Secondary KPIs - compact row */}
      <div className="flex flex-wrap gap-3">
        {secondaryKPIs.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} loading={isLoading} compact />
        ))}
      </div>
    </div>
  );
}
