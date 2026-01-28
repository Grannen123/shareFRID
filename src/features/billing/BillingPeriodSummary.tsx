import { useState } from "react";
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react";
import { useBillingSummary, useCreateBillingBatch } from "@/hooks/useBilling";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { BILLING_TYPE_LABELS } from "@/lib/constants";

interface BillingPeriodSummaryProps {
  year: number;
  month: number;
}

export function BillingPeriodSummary({
  year,
  month,
}: BillingPeriodSummaryProps) {
  const {
    data: summaries,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBillingSummary(year, month);
  const createBatch = useCreateBillingBatch();

  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-ash">Laddar fakturaunderlag...</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="Kunde inte hämta fakturaunderlag"
        message={
          error.message || "Ett fel uppstod vid hämtning av fakturaunderlag."
        }
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Inga fakturerbara poster"
        description="Det finns inga oexporterade poster för denna period"
      />
    );
  }

  const totalAmount = summaries.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0);

  const handleCreateBatch = async (summary: (typeof summaries)[0]) => {
    await createBatch.mutateAsync({
      customerId: summary.customerId,
      year,
      month,
      entryIds: summary.entries.map((e) => e.id),
      totalAmount: summary.totalAmount,
    });
  };

  return (
    <div className="space-y-4">
      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-charcoal">
                {summaries.length}
              </div>
              <div className="text-sm text-ash">Kunder</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-charcoal">
                {totalHours.toFixed(1)} tim
              </div>
              <div className="text-sm text-ash">Totalt</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sage">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-sm text-ash">Att fakturera</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per customer */}
      <div className="space-y-3">
        {summaries.map((summary) => (
          <Card key={summary.customerId}>
            <CardHeader
              className="cursor-pointer hover:bg-sand/20 transition-colors"
              onClick={() =>
                setExpandedCustomer(
                  expandedCustomer === summary.customerId
                    ? null
                    : summary.customerId,
                )
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-ash" />
                  <div>
                    <CardTitle className="text-base">
                      {summary.customerName}
                    </CardTitle>
                    <p className="text-xs text-ash">{summary.customerNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(summary.totalAmount)}
                    </div>
                    <div className="text-xs text-ash">
                      {summary.totalHours.toFixed(1)} tim
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateBatch(summary);
                    }}
                    disabled={createBatch.isPending}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Skapa batch
                  </Button>
                  {expandedCustomer === summary.customerId ? (
                    <ChevronUp className="h-5 w-5 text-ash" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-ash" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedCustomer === summary.customerId && (
              <CardContent className="pt-0">
                <div className="flex gap-4 mb-4 text-sm">
                  {summary.timebankHours > 0 && (
                    <Badge variant="sage">
                      Timbank: {summary.timebankHours.toFixed(1)} tim
                    </Badge>
                  )}
                  {summary.overtimeHours > 0 && (
                    <Badge variant="terracotta">
                      Övertid: {summary.overtimeHours.toFixed(1)} tim
                    </Badge>
                  )}
                  {summary.hourlyHours > 0 && (
                    <Badge variant="outline">
                      Löpande: {summary.hourlyHours.toFixed(1)} tim
                    </Badge>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Beskrivning</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Timmar</TableHead>
                      <TableHead className="text-right">Pris</TableHead>
                      <TableHead className="text-right">Summa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString("sv-SE")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {BILLING_TYPE_LABELS[entry.billing_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.hours}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.hourly_rate
                            ? formatCurrency(entry.hourly_rate)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            (entry.hourly_rate || 0) * entry.hours,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
