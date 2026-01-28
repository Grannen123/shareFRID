import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useBillingBatchDetail } from "@/hooks/useBilling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BILLING_TYPE_LABELS, BATCH_STATUS_LABELS } from "@/lib/constants";

interface BillingDetailProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(";") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function BillingDetail({
  batchId,
  open,
  onOpenChange,
}: BillingDetailProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading, error, refetch, isRefetching } =
    useBillingBatchDetail(batchId, open);

  const totals = useMemo(() => {
    if (!data) return { hours: 0, amount: 0 };
    const hours = data.entries.reduce((sum, entry) => sum + entry.hours, 0);
    const amount = data.entries.reduce(
      (sum, entry) => sum + (entry.hourly_rate || 0) * entry.hours,
      0,
    );
    return { hours, amount };
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    setIsExporting(true);

    try {
      const header = [
        "Datum",
        "Kundnr",
        "Kund",
        "Uppdrag",
        "Beskrivning",
        "Timmar",
        "Timpris",
        "Summa",
        "Typ",
      ];

      const rows = data.entries.map((entry) => {
        const assignmentLabel = entry.assignment
          ? `${entry.assignment.assignment_number} ${entry.assignment.title}`
          : "-";

        return [
          formatDate(entry.date),
          data.batch.customer.customer_number,
          data.batch.customer.name,
          assignmentLabel,
          entry.description || "",
          entry.hours,
          entry.hourly_rate || "",
          (entry.hourly_rate || 0) * entry.hours,
          BILLING_TYPE_LABELS[entry.billing_type] || entry.billing_type,
        ];
      });

      const csvContent = [header, ...rows]
        .map((row) => row.map(escapeCsvValue).join(";"))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fakturaunderlag-${data.batch.batch_id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Fakturaunderlag</DialogTitle>
          <DialogDescription>
            Detaljer för batchen och exporterbar CSV.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <div className="text-ash">Laddar underlag...</div>}

        {error && (
          <Card>
            <CardContent className="pt-6">
              <ErrorState
                title="Kunde inte hämta underlag"
                message={
                  error.message ||
                  "Ett fel uppstod vid hämtning av fakturadetaljer."
                }
                onRetry={() => refetch()}
                isRetrying={isRefetching}
              />
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-ash">Batch</div>
                    <div className="text-base font-medium text-charcoal">
                      {data.batch.batch_id}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-ash">Kund</div>
                    <div className="text-base font-medium text-charcoal">
                      {data.batch.customer.customer_number} ·{" "}
                      {data.batch.customer.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-ash">Period</div>
                    <div className="text-base font-medium text-charcoal">
                      {data.batch.period_year}-
                      {String(data.batch.period_month).padStart(2, "0")}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-ash">Status</div>
                    <Badge variant="outline">
                      {BATCH_STATUS_LABELS[data.batch.status]}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-ash">Totalt</div>
                    <div className="text-base font-medium text-charcoal">
                      {formatCurrency(totals.amount)} ·{" "}
                      {totals.hours.toFixed(1)} h
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? "Exporterar..." : "Exportera CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Uppdrag</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Timmar</TableHead>
                  <TableHead className="text-right">Timpris</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      {entry.assignment
                        ? `${entry.assignment.assignment_number} ${entry.assignment.title}`
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {BILLING_TYPE_LABELS[entry.billing_type] ||
                          entry.billing_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{entry.hours}</TableCell>
                    <TableCell className="text-right">
                      {entry.hourly_rate
                        ? formatCurrency(entry.hourly_rate)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency((entry.hourly_rate || 0) * entry.hours)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
