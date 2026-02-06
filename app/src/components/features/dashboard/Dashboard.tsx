/**
 * Dashboard Component
 *
 * Main dashboard with KPIs, charts, and quick access to important data.
 */

import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Users,
  Briefcase,
  Clock,
  AlertCircle,
  CheckCircle2,
  Timer,
  Receipt,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
} from "@/components/ui";
import { formatMinutes, formatCurrency } from "@/lib/billing-logic";
import { cn } from "@/lib/utils";

// Types
interface DashboardStats {
  customers: {
    total: number;
    active: number;
    prospekt: number;
    change: number;
  };
  cases: {
    total: number;
    active: number;
    closed: number;
    highPriority: number;
    change: number;
  };
  timeLogged: {
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  billing: {
    pending: number;
    approved: number;
    invoiced: number;
    totalAmount: number;
    change: number;
  };
  timbanks: Array<{
    customerId: string;
    customerName: string;
    agreementId: string;
    included: number;
    used: number;
    remaining: number;
    percentUsed: number;
  }>;
  recentCases: Array<{
    id: string;
    caseNumber: string;
    title: string;
    customerName: string;
    status: string;
    priority: string;
    updatedAt: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    caseNumber: string;
    title: string;
    deadline: string;
    daysUntil: number;
  }>;
}

interface DashboardProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

// KPI Card component
function KPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 bg-primary-100 rounded-lg">
            <Icon className="h-5 w-5 text-primary-600" />
          </div>
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1 mt-3 text-sm">
            {trend === "up" ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            ) : null}
            <span
              className={cn(
                trend === "up" && "text-green-600",
                trend === "down" && "text-red-600",
                trend === "neutral" && "text-gray-500",
              )}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            {changeLabel && (
              <span className="text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Timbank status card
function TimbankCard({ timbank }: { timbank: DashboardStats["timbanks"][0] }) {
  const isLow = timbank.percentUsed >= 80;
  const isEmpty = timbank.percentUsed >= 100;

  return (
    <div className="p-3 border rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm truncate">
          {timbank.customerName}
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            isEmpty && "bg-red-100 text-red-700",
            isLow && !isEmpty && "bg-yellow-100 text-yellow-700",
            !isLow && "bg-green-100 text-green-700",
          )}
        >
          {isEmpty ? "Tom" : isLow ? "Låg" : "OK"}
        </Badge>
      </div>
      <Progress
        value={Math.min(100, timbank.percentUsed)}
        className={cn(
          "h-2",
          isEmpty && "[&>div]:bg-red-500",
          isLow && !isEmpty && "[&>div]:bg-yellow-500",
        )}
      />
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{formatMinutes(timbank.remaining)} kvar</span>
        <span>
          {formatMinutes(timbank.used)} / {formatMinutes(timbank.included)}
        </span>
      </div>
    </div>
  );
}

// Priority badge
function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    high: { label: "Hög", className: "bg-red-100 text-red-700" },
    medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700" },
    low: { label: "Låg", className: "bg-gray-100 text-gray-600" },
  };
  const { label, className } =
    config[priority as keyof typeof config] || config.medium;

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      {label}
    </Badge>
  );
}

export function Dashboard({ stats, isLoading = false }: DashboardProps) {
  const currentMonth = format(new Date(), "MMMM yyyy", { locale: sv });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">{currentMonth}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/billing">
              <Receipt className="h-4 w-4 mr-2" />
              Fakturaunderlag
            </Link>
          </Button>
          <Button asChild>
            <Link to="/cases/new">
              <Briefcase className="h-4 w-4 mr-2" />
              Nytt ärende
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Aktiva kunder"
          value={stats.customers.active}
          subtitle={`${stats.customers.total} totalt`}
          change={stats.customers.change}
          changeLabel="från förra månaden"
          icon={Users}
          trend={stats.customers.change >= 0 ? "up" : "down"}
        />
        <KPICard
          title="Aktiva ärenden"
          value={stats.cases.active}
          subtitle={`${stats.cases.highPriority} högt prioriterade`}
          change={stats.cases.change}
          changeLabel="från förra månaden"
          icon={Briefcase}
          trend={stats.cases.change <= 0 ? "up" : "down"}
        />
        <KPICard
          title="Tid loggad"
          value={formatMinutes(stats.timeLogged.thisMonth)}
          subtitle={`${formatMinutes(stats.timeLogged.lastMonth)} förra månaden`}
          change={stats.timeLogged.change}
          changeLabel="jmf förra månaden"
          icon={Clock}
          trend={stats.timeLogged.change >= 0 ? "up" : "down"}
        />
        <KPICard
          title="Att fakturera"
          value={formatCurrency(stats.billing.totalAmount)}
          subtitle={`${stats.billing.approved} godkända rader`}
          change={stats.billing.change}
          changeLabel="jmf förra månaden"
          icon={Receipt}
          trend={stats.billing.change >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timbank status */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Timbank-status
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agreements">
                  Visa alla
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.timbanks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Inga timbanksavtal
              </p>
            ) : (
              stats.timbanks
                .slice(0, 5)
                .map((timbank) => (
                  <TimbankCard key={timbank.agreementId} timbank={timbank} />
                ))
            )}
          </CardContent>
        </Card>

        {/* Recent cases */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Senaste ärenden
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cases">
                  Visa alla
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentCases.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Inga ärenden
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentCases.slice(0, 5).map((caseItem) => (
                  <Link
                    key={caseItem.id}
                    to={`/cases/${caseItem.id}`}
                    className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {caseItem.caseNumber}
                          </span>
                          <PriorityBadge priority={caseItem.priority} />
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {caseItem.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {caseItem.customerName}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Kommande deadlines
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-gray-500">Inga kommande deadlines</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingDeadlines.slice(0, 5).map((deadline) => (
                  <Link
                    key={deadline.id}
                    to={`/cases/${deadline.id}`}
                    className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {deadline.caseNumber}
                          </span>
                          {deadline.daysUntil <= 3 && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {deadline.title}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs flex-shrink-0",
                          deadline.daysUntil <= 1 && "bg-red-100 text-red-700",
                          deadline.daysUntil > 1 &&
                            deadline.daysUntil <= 3 &&
                            "bg-yellow-100 text-yellow-700",
                        )}
                      >
                        {deadline.daysUntil === 0
                          ? "Idag"
                          : deadline.daysUntil === 1
                            ? "Imorgon"
                            : `${deadline.daysUntil} dagar`}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Faktureringsstatus
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/billing">
                Hantera
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">
                {stats.billing.pending}
              </p>
              <p className="text-sm text-yellow-600">Väntar på granskning</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                {stats.billing.approved}
              </p>
              <p className="text-sm text-green-600">Godkända</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {stats.billing.invoiced}
              </p>
              <p className="text-sm text-blue-600">Fakturerade</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
