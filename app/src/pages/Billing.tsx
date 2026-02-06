import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  Checkbox,
} from "@/components/ui";
import { formatCurrency, formatDuration, getCurrentPeriod } from "@/lib/utils";
import type { BillingLineStatus } from "@/types";

// Mock billing data
interface BillingGroup {
  customerId: string;
  customerName: string;
  billingContactName: string;
  period: string;
  lines: {
    id: string;
    caseNumber: string;
    description: string;
    minutes: number;
    type: "timebank" | "overtime" | "hourly";
    rate: number;
    amount: number;
    status: BillingLineStatus;
  }[];
  totalAmount: number;
}

const mockBillingGroups: BillingGroup[] = [
  {
    customerId: "1",
    customerName: "BRF Solbacken",
    billingContactName: "Anders Karlsson (Styrelseordförande)",
    period: "2026-01",
    lines: [
      {
        id: "1",
        caseNumber: "C-26-047",
        description: "Störning Lindqvist - telefonsamtal, utredning",
        minutes: 120,
        type: "timebank",
        rate: 0,
        amount: 0,
        status: "pending",
      },
      {
        id: "2",
        caseNumber: "C-26-047",
        description: "Störning Lindqvist - extraarbete utöver timbank",
        minutes: 60,
        type: "overtime",
        rate: 1200,
        amount: 1200,
        status: "pending",
      },
      {
        id: "3",
        caseNumber: "C-26-040",
        description: "Vattenläcka - försäkringsärende",
        minutes: 180,
        type: "timebank",
        rate: 0,
        amount: 0,
        status: "approved",
      },
    ],
    totalAmount: 1200,
  },
  {
    customerId: "2",
    customerName: "BRF Havsutsikten",
    billingContactName: "Maria Eriksson (Styrelseledamot)",
    period: "2026-01",
    lines: [
      {
        id: "4",
        caseNumber: "C-26-046",
        description: "Andrahandsuthyrning - utredning",
        minutes: 90,
        type: "hourly",
        rate: 1100,
        amount: 1650,
        status: "review",
      },
    ],
    totalAmount: 1650,
  },
  {
    customerId: "3",
    customerName: "HSB Kungsbacka",
    billingContactName: "Erik Svensson (Förvaltare)",
    period: "2026-01",
    lines: [
      {
        id: "5",
        caseNumber: "P-26-008",
        description: "Trivselregler - revision fas 1",
        minutes: 240,
        type: "timebank",
        rate: 0,
        amount: 0,
        status: "approved",
      },
    ],
    totalAmount: 0,
  },
];

const statusConfig = {
  pending: { label: "Väntar", color: "default", icon: Clock },
  review: { label: "Granskas", color: "warning", icon: AlertCircle },
  approved: { label: "Godkänd", color: "success", icon: CheckCircle },
  invoiced: { label: "Fakturerad", color: "info", icon: FileText },
};

function BillingCard({
  group,
  isSelected,
  onSelect,
}: {
  group: BillingGroup;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const pendingCount = group.lines.filter((l) => l.status === "pending").length;
  const approvedCount = group.lines.filter(
    (l) => l.status === "approved",
  ).length;

  return (
    <Card className={isSelected ? "ring-2 ring-primary-500" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox checked={isSelected} onCheckedChange={onSelect} />
            <div>
              <CardTitle className="text-base">{group.customerName}</CardTitle>
              <p className="text-sm text-gray-500">
                {group.billingContactName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">
              {formatCurrency(group.totalAmount)}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {pendingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingCount}
                </span>
              )}
              {approvedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  {approvedCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{group.lines.length} rader</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </Button>

        {isExpanded && (
          <div className="mt-4 space-y-2">
            {group.lines.map((line) => {
              const status = statusConfig[line.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={line.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-500">
                        {line.caseNumber}
                      </span>
                      <Badge
                        variant={
                          line.type === "overtime"
                            ? "warning"
                            : line.type === "hourly"
                              ? "info"
                              : "default"
                        }
                      >
                        {line.type === "timebank"
                          ? "Timbank"
                          : line.type === "overtime"
                            ? "Övertid"
                            : "Löpande"}
                      </Badge>
                    </div>
                    <p className="text-gray-600">{line.description}</p>
                    <p className="text-gray-500">
                      {formatDuration(line.minutes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {formatCurrency(line.amount)}
                    </span>
                    <Badge
                      variant={
                        status.color as
                          | "default"
                          | "warning"
                          | "success"
                          | "info"
                      }
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Billing() {
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<BillingLineStatus | "all">(
    "all",
  );

  const toggleGroup = (customerId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedGroups(newSelected);
  };

  const selectAll = () => {
    if (selectedGroups.size === mockBillingGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(mockBillingGroups.map((g) => g.customerId)));
    }
  };

  const totalSelected = mockBillingGroups
    .filter((g) => selectedGroups.has(g.customerId))
    .reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fakturering</h1>
          <p className="text-gray-500">Granska och godkänn faktureringsrader</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-01">Januari 2026</SelectItem>
              <SelectItem value="2025-12">December 2025</SelectItem>
              <SelectItem value="2025-11">November 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => toast.info("Export kommer snart!")}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportera
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Totalt att fakturera</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                mockBillingGroups.reduce((sum, g) => sum + g.totalAmount, 0),
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Väntar på granskning</p>
            <p className="text-2xl font-bold">
              {
                mockBillingGroups
                  .flatMap((g) => g.lines)
                  .filter((l) => l.status === "pending").length
              }{" "}
              rader
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Godkända</p>
            <p className="text-2xl font-bold text-green-600">
              {
                mockBillingGroups
                  .flatMap((g) => g.lines)
                  .filter((l) => l.status === "approved").length
              }{" "}
              rader
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Kunder</p>
            <p className="text-2xl font-bold">{mockBillingGroups.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as BillingLineStatus | "all")}
        >
          <TabsList>
            <TabsTrigger value="all">Alla</TabsTrigger>
            <TabsTrigger value="pending">Väntar</TabsTrigger>
            <TabsTrigger value="review">Granskas</TabsTrigger>
            <TabsTrigger value="approved">Godkända</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4">
          {selectedGroups.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedGroups.size} valda ({formatCurrency(totalSelected)})
            </span>
          )}
          <Button variant="outline" onClick={selectAll}>
            {selectedGroups.size === mockBillingGroups.length
              ? "Avmarkera alla"
              : "Markera alla"}
          </Button>
          <Button
            disabled={selectedGroups.size === 0}
            onClick={() =>
              toast.success(`${selectedGroups.size} kunder godkända!`)
            }
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Godkänn valda
          </Button>
        </div>
      </div>

      {/* Billing Groups */}
      <div className="space-y-4">
        {mockBillingGroups.map((group) => (
          <BillingCard
            key={group.customerId}
            group={group}
            isSelected={selectedGroups.has(group.customerId)}
            onSelect={() => toggleGroup(group.customerId)}
          />
        ))}
      </div>
    </div>
  );
}
