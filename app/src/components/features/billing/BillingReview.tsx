/**
 * Billing Review Component
 *
 * Displays billing lines for review, approval, and export.
 * Supports filtering by period, customer, and status.
 */

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Check,
  X,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  Receipt,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Lock,
  FileText,
  Building2,
} from "lucide-react";
import {
  Button,
  Badge,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import {
  formatMinutes,
  formatCurrency,
  calculateInvoiceSummary,
  type BillingLine,
} from "@/lib/billing-logic";
import { cn } from "@/lib/utils";

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: "Väntar",
    icon: CircleDot,
    color: "bg-gray-100 text-gray-700",
  },
  review: {
    label: "Granskas",
    icon: AlertCircle,
    color: "bg-yellow-100 text-yellow-700",
  },
  approved: {
    label: "Godkänd",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
  },
  invoiced: {
    label: "Fakturerad",
    icon: Lock,
    color: "bg-blue-100 text-blue-700",
  },
};

const TYPE_CONFIG = {
  timebank: { label: "Timbank", color: "bg-purple-100 text-purple-700" },
  overtime: { label: "Övertid", color: "bg-orange-100 text-orange-700" },
  hourly: { label: "Löpande", color: "bg-blue-100 text-blue-700" },
  fixed: { label: "Fast", color: "bg-gray-100 text-gray-700" },
};

interface BillingLineWithDetails extends BillingLine {
  customerName: string;
  customerId: string;
  caseNumber: string;
  caseTitle: string;
  journalDescription: string;
  invoiceText: string | null;
  entryDate: string;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  lines: BillingLineWithDetails[];
  totals: {
    minutes: number;
    amount: number;
  };
}

interface BillingReviewProps {
  lines: BillingLineWithDetails[];
  periods: string[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onApprove: (lineIds: string[]) => Promise<void>;
  onReject: (lineIds: string[]) => Promise<void>;
  onExport: (lineIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

export function BillingReview({
  lines,
  periods,
  selectedPeriod,
  onPeriodChange,
  onApprove,
  onReject,
  onExport,
  isLoading = false,
}: BillingReviewProps) {
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(
    new Set(),
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter lines by status
  const filteredLines = useMemo(() => {
    if (statusFilter === "all") return lines;
    return lines.filter((line) => line.status === statusFilter);
  }, [lines, statusFilter]);

  // Group lines by customer
  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();

    for (const line of filteredLines) {
      let group = groups.get(line.customerId);
      if (!group) {
        group = {
          customerId: line.customerId,
          customerName: line.customerName,
          lines: [],
          totals: { minutes: 0, amount: 0 },
        };
        groups.set(line.customerId, group);
      }
      group.lines.push(line);
      group.totals.minutes += line.minutes;
      group.totals.amount += line.amount || 0;
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.customerName.localeCompare(b.customerName, "sv"),
    );
  }, [filteredLines]);

  // Calculate overall summary
  const summary = useMemo(
    () => calculateInvoiceSummary(filteredLines),
    [filteredLines],
  );

  // Selection handlers
  const toggleLine = (lineId: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const toggleCustomer = (customerId: string) => {
    const customerLines = filteredLines
      .filter((l) => l.customerId === customerId)
      .map((l) => l.id!)
      .filter(Boolean);

    setSelectedLines((prev) => {
      const next = new Set(prev);
      const allSelected = customerLines.every((id) => next.has(id));

      if (allSelected) {
        customerLines.forEach((id) => next.delete(id));
      } else {
        customerLines.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = filteredLines.map((l) => l.id!).filter(Boolean);
    setSelectedLines(new Set(allIds));
  };

  const selectNone = () => {
    setSelectedLines(new Set());
  };

  const toggleCustomerExpanded = (customerId: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  // Action handlers
  const handleApprove = async () => {
    if (selectedLines.size === 0) return;
    setIsProcessing(true);
    try {
      await onApprove(Array.from(selectedLines));
      setSelectedLines(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (selectedLines.size === 0) return;
    setIsProcessing(true);
    try {
      await onReject(Array.from(selectedLines));
      setSelectedLines(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (selectedLines.size === 0) return;
    setIsProcessing(true);
    try {
      await onExport(Array.from(selectedLines));
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    const selected = filteredLines.filter(
      (l) => l.id && selectedLines.has(l.id),
    );
    return {
      count: selected.length,
      minutes: selected.reduce((sum, l) => sum + l.minutes, 0),
      amount: selected.reduce((sum, l) => sum + (l.amount || 0), 0),
    };
  }, [filteredLines, selectedLines]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Fakturaunderlag</h2>

          {/* Period selector */}
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Välj period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  {format(parseISO(`${period}-01`), "MMMM yyyy", {
                    locale: sv,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla</SelectItem>
              <SelectItem value="pending">Väntar</SelectItem>
              <SelectItem value="review">Granskas</SelectItem>
              <SelectItem value="approved">Godkända</SelectItem>
              <SelectItem value="invoiced">Fakturerade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Receipt className="h-4 w-4" />
            {summary.lineCount} rader
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatMinutes(summary.totalMinutes)}
          </span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(summary.totalAmount)}
          </span>
        </div>
      </div>

      {/* Selection actions */}
      {selectedLines.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedTotals.count} rader valda
            </span>
            <span className="text-sm text-gray-500">
              {formatMinutes(selectedTotals.minutes)} •{" "}
              {formatCurrency(selectedTotals.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectNone}
              disabled={isProcessing}
            >
              Avmarkera alla
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Avslå
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Godkänn
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isProcessing}>
              <Download className="h-4 w-4 mr-1" />
              Exportera
            </Button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={selectAll}>
          Markera alla
        </Button>
        <Button variant="ghost" size="sm" onClick={selectNone}>
          Avmarkera alla
        </Button>
      </div>

      {/* Customer groups */}
      {customerGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Inga faktureringsrader för vald period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customerGroups.map((group) => {
            const isExpanded = expandedCustomers.has(group.customerId);
            const customerLineIds = group.lines
              .map((l) => l.id!)
              .filter(Boolean);
            const selectedCount = customerLineIds.filter((id) =>
              selectedLines.has(id),
            ).length;
            const allSelected = selectedCount === customerLineIds.length;
            const someSelected = selectedCount > 0 && !allSelected;

            return (
              <Collapsible
                key={group.customerId}
                open={isExpanded}
                onOpenChange={() => toggleCustomerExpanded(group.customerId)}
              >
                <div className="border rounded-lg overflow-hidden">
                  {/* Customer header */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50">
                    <Checkbox
                      checked={allSelected}
                      // @ts-expect-error - indeterminate is valid but not in types
                      indeterminate={someSelected}
                      onCheckedChange={() => toggleCustomer(group.customerId)}
                    />
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{group.customerName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {group.lines.length} rader
                      </Badge>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        {formatMinutes(group.totals.minutes)}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(group.totals.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Line items */}
                  <CollapsibleContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Ärende</TableHead>
                          <TableHead>Beskrivning</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead className="text-right">Tid</TableHead>
                          <TableHead className="text-right">Belopp</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.lines.map((line) => {
                          const statusConfig = STATUS_CONFIG[line.status];
                          const typeConfig = TYPE_CONFIG[line.type];
                          const StatusIcon = statusConfig.icon;

                          return (
                            <TableRow
                              key={line.id}
                              className={cn(
                                line.locked && "bg-gray-50 opacity-75",
                              )}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={
                                    line.id ? selectedLines.has(line.id) : false
                                  }
                                  onCheckedChange={() =>
                                    line.id && toggleLine(line.id)
                                  }
                                  disabled={line.locked}
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(parseISO(line.entryDate), "d MMM", {
                                  locale: sv,
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {line.caseNumber}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-32">
                                  {line.caseTitle}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div
                                  className="text-sm truncate"
                                  title={
                                    line.invoiceText || line.journalDescription
                                  }
                                >
                                  {line.invoiceText || line.journalDescription}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn("text-xs", typeConfig.color)}
                                >
                                  {typeConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatMinutes(line.minutes)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(line.amount || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs flex items-center gap-1 w-fit",
                                    statusConfig.color,
                                  )}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
