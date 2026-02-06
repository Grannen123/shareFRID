import {
  Building2,
  FileText,
  CheckSquare,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";

// Mock data - replace with React Query hooks
const mockKPIs = {
  activeCustomers: 24,
  activeCases: 47,
  pendingTasks: 12,
  monthlyRevenue: 156000,
  timebankUtilization: 78,
  overdueItems: 3,
};

const mockRecentCases = [
  {
    id: "1",
    caseNumber: "C-26-047",
    title: "Störning Lindqvist",
    customer: "BRF Solbacken",
    status: "active",
    priority: "high",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    caseNumber: "C-26-046",
    title: "Otillåten andrahandsuthyrning",
    customer: "BRF Havsutsikten",
    status: "active",
    priority: "medium",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    caseNumber: "P-26-008",
    title: "Trivselregler revision",
    customer: "HSB Kungsbacka",
    status: "active",
    priority: "low",
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const mockTasks = [
  {
    id: "1",
    title: "Ring tillbaka Johansson",
    caseNumber: "C-26-047",
    dueDate: new Date().toISOString(),
    priority: "high",
  },
  {
    id: "2",
    title: "Skicka varningsbrev",
    caseNumber: "C-26-045",
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    priority: "medium",
  },
  {
    id: "3",
    title: "Förbered styrelsemöte",
    caseNumber: "P-26-008",
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    priority: "low",
  },
];

const priorityColors = {
  low: "default" as const,
  medium: "warning" as const,
  high: "error" as const,
};

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Aktiva kunder
            </CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKPIs.activeCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pågående ärenden
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKPIs.activeCases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Väntande uppgifter
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKPIs.pendingTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Månadsintäkt
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockKPIs.monthlyRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Timbankutnyttjande
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockKPIs.timebankUtilization}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Försenade
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockKPIs.overdueItems}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases and Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Senaste ärenden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">
                        {caseItem.caseNumber}
                      </span>
                      <Badge
                        variant={
                          priorityColors[
                            caseItem.priority as keyof typeof priorityColors
                          ]
                        }
                      >
                        {caseItem.priority === "high"
                          ? "Hög"
                          : caseItem.priority === "medium"
                            ? "Medium"
                            : "Låg"}
                      </Badge>
                    </div>
                    <p className="font-medium text-gray-900">
                      {caseItem.title}
                    </p>
                    <p className="text-sm text-gray-500">{caseItem.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatRelativeDate(caseItem.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Uppgifter att göra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          priorityColors[
                            task.priority as keyof typeof priorityColors
                          ]
                        }
                      >
                        {task.priority === "high"
                          ? "Hög"
                          : task.priority === "medium"
                            ? "Medium"
                            : "Låg"}
                      </Badge>
                      <span className="font-mono text-sm text-gray-500">
                        {task.caseNumber}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatRelativeDate(task.dueDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
