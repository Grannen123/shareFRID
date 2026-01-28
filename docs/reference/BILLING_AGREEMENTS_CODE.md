# Fakturering & Avtal – Kod och avtalsunderlag

Detta dokument samlar **all relevant kod** för fakturerings-/avtalslogik och faktureringsmodul, samt **textutdrag** från avtalsexemplen i `exempel våra avtal/`.

> Obs: Avtalstexterna är automatiskt extraherade och kan innehålla formateringsavvikelser. Originalfilerna är källan för exakta formuleringar.

---

## Kod – Fakturering & Avtal

### `src/lib/billing-logic.ts`

```ts
import type {
  Agreement,
  BillingType,
  TimebankCurrentStatus,
} from "@/types/database";

// ============================================================================
// TIMBANK STATUS
// ============================================================================

export interface TimebankStatus {
  includedHours: number;
  hoursUsed: number;
  hoursRemaining: number;
  overtimeHours: number;
  percentUsed: number;
  isOvertime: boolean;
}

export function calculateTimebankStatus(
  agreement: Agreement,
  hoursThisPeriod: number,
): TimebankStatus {
  const includedHours = agreement.included_hours || 0;
  const hoursRemaining = Math.max(0, includedHours - hoursThisPeriod);
  const overtimeHours = Math.max(0, hoursThisPeriod - includedHours);
  const percentUsed =
    includedHours > 0 ? (hoursThisPeriod / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed: hoursThisPeriod,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursThisPeriod > includedHours,
  };
}

export function timebankStatusFromView(
  view: TimebankCurrentStatus,
): TimebankStatus {
  const includedHours = view.included_hours;
  const hoursUsed = view.hours_used_this_period;
  const hoursRemaining = Math.max(0, view.hours_remaining);
  const overtimeHours = Math.max(0, hoursUsed - includedHours);
  const percentUsed = includedHours > 0 ? (hoursUsed / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursUsed > includedHours,
  };
}

// ============================================================================
// BILLING CALCULATION MED SPLIT-SUPPORT
// ============================================================================

export interface TimeEntrySplit {
  hours: number;
  billingType: BillingType;
  hourlyRate: number;
  amount: number;
}

export interface BillingResult {
  entries: TimeEntrySplit[];
  totalAmount: number;
}

/**
 * Beräknar hur nya timmar ska delas upp mellan timebank och overtime.
 * Returnerar en eller två time_entry "splits" beroende på om gränsen passeras.
 */
export function calculateBillingWithSplit(
  agreement: Agreement,
  timebankStatus: TimebankStatus | null,
  newHours: number,
  isExtraBillable: boolean = false,
): BillingResult {
  // Löpande timpris - enkel beräkning
  if (agreement.type === "hourly") {
    const amount = newHours * agreement.hourly_rate;
    return {
      entries: [
        {
          hours: newHours,
          billingType: "hourly",
          hourlyRate: agreement.hourly_rate,
          amount,
        },
      ],
      totalAmount: amount,
    };
  }

  // Fastpris - timmar loggas för statistik
  if (agreement.type === "fixed") {
    if (isExtraBillable) {
      // Explicit extraarbete debiteras som hourly
      const amount = newHours * agreement.hourly_rate;
      return {
        entries: [
          {
            hours: newHours,
            billingType: "hourly",
            hourlyRate: agreement.hourly_rate,
            amount,
          },
        ],
        totalAmount: amount,
      };
    }
    return {
      entries: [
        {
          hours: newHours,
          billingType: "fixed",
          hourlyRate: 0,
          amount: 0,
        },
      ],
      totalAmount: 0,
    };
  }

  // Timbank - komplex logik med split
  if (agreement.type === "timebank") {
    // Explicit extraarbete = alltid overtime
    if (isExtraBillable) {
      const rate = agreement.overtime_rate || agreement.hourly_rate;
      const amount = newHours * rate;
      return {
        entries: [
          {
            hours: newHours,
            billingType: "overtime",
            hourlyRate: rate,
            amount,
          },
        ],
        totalAmount: amount,
      };
    }

    const remaining =
      timebankStatus?.hoursRemaining ?? agreement.included_hours ?? 0;
    const overtimeRate = agreement.overtime_rate || agreement.hourly_rate;

    // Allt ryms inom timbanken
    if (remaining >= newHours) {
      return {
        entries: [
          {
            hours: newHours,
            billingType: "timebank",
            hourlyRate: 0,
            amount: 0,
          },
        ],
        totalAmount: 0,
      };
    }

    // Split: en del timebank, en del overtime
    if (remaining > 0) {
      const overtimeHours = newHours - remaining;
      const overtimeAmount = overtimeHours * overtimeRate;

      return {
        entries: [
          {
            hours: remaining,
            billingType: "timebank",
            hourlyRate: 0,
            amount: 0,
          },
          {
            hours: overtimeHours,
            billingType: "overtime",
            hourlyRate: overtimeRate,
            amount: overtimeAmount,
          },
        ],
        totalAmount: overtimeAmount,
      };
    }

    // Allt är övertid
    const amount = newHours * overtimeRate;
    return {
      entries: [
        {
          hours: newHours,
          billingType: "overtime",
          hourlyRate: overtimeRate,
          amount,
        },
      ],
      totalAmount: amount,
    };
  }

  // Fallback
  return {
    entries: [
      {
        hours: newHours,
        billingType: "internal",
        hourlyRate: 0,
        amount: 0,
      },
    ],
    totalAmount: 0,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

export function getPeriodStartDate(period: "monthly" | "yearly"): Date {
  const now = new Date();
  if (period === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(now.getFullYear(), 0, 1);
}

export function isIndexationWarningNeeded(
  nextIndexation: string | null,
  daysThreshold: number = 7,
): boolean {
  if (!nextIndexation) return false;
  const indexDate = new Date(nextIndexation);
  const now = new Date();
  const diffTime = indexDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= daysThreshold;
}
```

### `src/hooks/useBilling.ts`

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { BillingBatch, TimeEntry } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BillingBatchWithRelations extends BillingBatch {
  customer: { name: string; customer_number: string };
}

interface BillingSummary {
  customerId: string;
  customerName: string;
  customerNumber: string;
  totalHours: number;
  timebankHours: number;
  overtimeHours: number;
  hourlyHours: number;
  totalAmount: number;
  entries: TimeEntry[];
}

interface BillingBatchDetailEntry extends TimeEntry {
  assignment?: { title: string; assignment_number: string };
}

interface BillingBatchDetail {
  batch: BillingBatchWithRelations;
  entries: BillingBatchDetailEntry[];
}

export function useBillingBatches(year?: number, month?: number) {
  return useQuery({
    queryKey:
      year && month
        ? queryKeys.billingBatches.byPeriod(year, month)
        : queryKeys.billingBatches.all,
    queryFn: async () => {
      let query = supabase
        .from("billing_batches")
        .select(
          `
          *,
          customer:customers(name, customer_number)
        `,
        )
        .order("created_at", { ascending: false });

      if (year && month) {
        query = query.eq("period_year", year).eq("period_month", month);
      }

      const { data, error } = await withTimeout(query);
      if (error) throw error;
      return data as BillingBatchWithRelations[];
    },
  });
}

export function useBillingSummary(year: number, month: number) {
  return useQuery({
    queryKey: [...queryKeys.billingBatches.byPeriod(year, month), "summary"],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      const { data: timeEntries, error } = await withTimeout(
        supabase
          .from("time_entries")
          .select(
            `
          *,
          customer:customers(id, name, customer_number)
        `,
          )
          .eq("is_billable", true)
          .eq("is_exported", false)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("customer_id"),
      );

      if (error) throw error;

      // Gruppera per kund
      const summaries: Record<string, BillingSummary> = {};

      timeEntries?.forEach((entry: any) => {
        const customerId = entry.customer_id;
        if (!summaries[customerId]) {
          summaries[customerId] = {
            customerId,
            customerName: entry.customer?.name || "Okänd",
            customerNumber: entry.customer?.customer_number || "",
            totalHours: 0,
            timebankHours: 0,
            overtimeHours: 0,
            hourlyHours: 0,
            totalAmount: 0,
            entries: [],
          };
        }

        summaries[customerId].totalHours += entry.hours;
        summaries[customerId].totalAmount +=
          (entry.hourly_rate || 0) * entry.hours;
        summaries[customerId].entries.push(entry);

        switch (entry.billing_type) {
          case "timebank":
            summaries[customerId].timebankHours += entry.hours;
            break;
          case "overtime":
            summaries[customerId].overtimeHours += entry.hours;
            break;
          case "hourly":
            summaries[customerId].hourlyHours += entry.hours;
            break;
        }
      });

      return Object.values(summaries);
    },
  });
}

export function useCreateBillingBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      year,
      month,
      entryIds,
      totalAmount,
    }: {
      customerId: string;
      year: number;
      month: number;
      entryIds: string[];
      totalAmount: number;
    }) => {
      // Skapa batch ID
      const batchId = `B-${year}${String(month).padStart(2, "0")}-${Date.now()}`;

      // Skapa batch
      const { data: batch, error: batchError } = await supabase
        .from("billing_batches")
        .insert({
          batch_id: batchId,
          customer_id: customerId,
          period_year: year,
          period_month: month,
          status: "draft",
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Uppdatera time entries med batch ID
      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ export_batch_id: batch.id })
        .in("id", entryIds);

      if (updateError) throw updateError;

      return batch as BillingBatch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billingBatches.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.billingBatches.byPeriod(
          variables.year,
          variables.month,
        ),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast.success("Fakturaunderlag skapat!");
    },
    onError: (error) => {
      console.error("Create billing batch error:", error);
      toast.error("Kunde inte skapa fakturaunderlag: " + error.message);
    },
  });
}

export function useUpdateBillingBatchStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "review" | "exported" | "locked";
    }) => {
      const updates: any = { status };

      if (status === "exported") {
        updates.exported_at = new Date().toISOString();
        updates.exported_by = user?.id;
      }

      const { data: batch, error } = await supabase
        .from("billing_batches")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Om exported, markera alla time entries
      if (status === "exported") {
        const { error: updateError } = await supabase
          .from("time_entries")
          .update({ is_exported: true })
          .eq("export_batch_id", id);

        if (updateError)
          console.error("Update time entries error:", updateError);
      }

      return batch as BillingBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billingBatches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast.success("Status uppdaterad!");
    },
    onError: (error) => {
      console.error("Update billing batch status error:", error);
      toast.error("Kunde inte uppdatera status: " + error.message);
    },
  });
}

export function useBillingBatchDetail(
  batchId: string | null,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: batchId
      ? queryKeys.billingBatches.detail(batchId)
      : ["billingBatches", "detail", "none"],
    queryFn: async (): Promise<BillingBatchDetail | null> => {
      if (!batchId) return null;

      // Kör båda queries parallellt
      const [batchResult, entriesResult] = await Promise.all([
        withTimeout(
          supabase
            .from("billing_batches")
            .select(
              `
              *,
              customer:customers(name, customer_number)
            `,
            )
            .eq("id", batchId)
            .single(),
        ),
        withTimeout(
          supabase
            .from("time_entries")
            .select(
              `
              *,
              assignment:assignments(title, assignment_number)
            `,
            )
            .eq("export_batch_id", batchId)
            .order("date", { ascending: true }),
        ),
      ]);

      if (batchResult.error) throw batchResult.error;
      if (entriesResult.error) throw entriesResult.error;

      return {
        batch: batchResult.data as BillingBatchWithRelations,
        entries: (entriesResult.data || []) as BillingBatchDetailEntry[],
      };
    },
    enabled: enabled && !!batchId,
  });
}
```

### `src/features/billing/BillingBatchList.tsx`

```tsx
import { useState } from "react";
import {
  FileText,
  CheckCircle,
  Download,
  Lock,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  useBillingBatches,
  useUpdateBillingBatchStatus,
} from "@/hooks/useBilling";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { BATCH_STATUS_LABELS } from "@/lib/constants";
import { BillingDetail } from "./BillingDetail";

interface BillingBatchListProps {
  year?: number;
  month?: number;
}

const statusVariants: Record<string, "sage" | "terracotta" | "outline"> = {
  draft: "outline",
  review: "sage",
  exported: "terracotta",
  locked: "outline",
};

export function BillingBatchList({ year, month }: BillingBatchListProps) {
  const {
    data: batches,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useBillingBatches(year, month);
  const updateStatus = useUpdateBillingBatchStatus();

  const [exportConfirm, setExportConfirm] = useState<string | null>(null);
  const [lockConfirm, setLockConfirm] = useState<string | null>(null);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-ash">Laddar batches...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Kunde inte hämta fakturabatcher"
            message={
              error.message || "Ett fel uppstod vid hämtning av fakturabatcher."
            }
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Inga fakturaunderlag"
        description="Skapa fakturaunderlag från periodoversikten ovan"
      />
    );
  }

  const handleExport = async () => {
    if (exportConfirm) {
      await updateStatus.mutateAsync({ id: exportConfirm, status: "exported" });
      setExportConfirm(null);
    }
  };

  const handleLock = async () => {
    if (lockConfirm) {
      await updateStatus.mutateAsync({ id: lockConfirm, status: "locked" });
      setLockConfirm(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fakturaunderlag</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Kund</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">
                    {batch.batch_id}
                  </TableCell>
                  <TableCell>{batch.customer.name}</TableCell>
                  <TableCell>
                    {batch.period_year}-
                    {String(batch.period_month).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(batch.total_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[batch.status]}>
                      {BATCH_STATUS_LABELS[batch.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDetailBatchId(batch.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visa underlag
                        </DropdownMenuItem>
                        {batch.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus.mutate({
                                id: batch.id,
                                status: "review",
                              })
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Markera för granskning
                          </DropdownMenuItem>
                        )}
                        {batch.status === "review" && (
                          <DropdownMenuItem
                            onClick={() => setExportConfirm(batch.id)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Markera som exporterad
                          </DropdownMenuItem>
                        )}
                        {batch.status === "exported" && (
                          <DropdownMenuItem
                            onClick={() => setLockConfirm(batch.id)}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Lås batch
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!exportConfirm}
        onOpenChange={(open) => !open && setExportConfirm(null)}
        title="Markera som exporterad"
        description="Är du säker på att du vill markera denna batch som exporterad? Tidposterna kommer låsas."
        confirmLabel="Exportera"
        onConfirm={handleExport}
        isLoading={updateStatus.isPending}
      />

      <ConfirmDialog
        open={!!lockConfirm}
        onOpenChange={(open) => !open && setLockConfirm(null)}
        title="Lås batch"
        description="Är du säker på att du vill låsa denna batch? Detta kan inte ångras."
        variant="danger"
        confirmLabel="Lås"
        onConfirm={handleLock}
        isLoading={updateStatus.isPending}
      />

      <BillingDetail
        batchId={detailBatchId}
        open={!!detailBatchId}
        onOpenChange={(open) => !open && setDetailBatchId(null)}
      />
    </>
  );
}
```

### `src/features/billing/BillingDetail.tsx`

```tsx
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
```

### `src/features/billing/BillingPeriodSummary.tsx`

```tsx
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
```

### `src/pages/BillingPage.tsx`

```tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { BillingPeriodSummary } from "@/features/billing/BillingPeriodSummary";
import { BillingBatchList } from "@/features/billing/BillingBatchList";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

export function BillingPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <AppShell title="Fakturering">
      <div className="space-y-6">
        {/* Period selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-2xl font-display font-bold text-charcoal">
                  {MONTH_NAMES[month - 1]} {year}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main content tabs */}
        <Tabs defaultValue="unbilled">
          <TabsList>
            <TabsTrigger value="unbilled">Oexporterade</TabsTrigger>
            <TabsTrigger value="batches">Fakturaunderlag</TabsTrigger>
          </TabsList>

          <TabsContent value="unbilled" className="mt-4">
            <BillingPeriodSummary year={year} month={month} />
          </TabsContent>

          <TabsContent value="batches" className="mt-4">
            <BillingBatchList year={year} month={month} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
```

### `src/hooks/useAgreements.ts`

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Agreement, AgreementWithCustomer } from "@/types/database";
import type { AgreementFormData } from "@/lib/schemas";
import { toast } from "sonner";

export function useAgreements() {
  return useQuery({
    queryKey: queryKeys.agreements.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as AgreementWithCustomer[];
    },
  });
}

export function useAgreementsByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.agreements.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select("*")
          .eq("customer_id", customerId)
          .order("valid_from", { ascending: false }),
      );

      if (error) throw error;
      return data as Agreement[];
    },
    enabled: !!customerId,
  });
}

// Hämta aktivt avtal för en kund
export function useCustomerAgreement(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.agreements.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select("*")
          .eq("customer_id", customerId)
          .eq("status", "active")
          .order("valid_from", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );

      if (error) throw error;
      return data as Agreement | null;
    },
    enabled: !!customerId,
  });
}

export function useAgreementsWithUpcomingIndexation(daysAhead: number = 30) {
  return useQuery({
    queryKey: queryKeys.agreements.withIndexation,
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .not("next_indexation", "is", null)
          .lte("next_indexation", futureDate.toISOString().split("T")[0])
          .eq("status", "active")
          .order("next_indexation"),
      );

      if (error) throw error;
      return data as AgreementWithCustomer[];
    },
  });
}

export function useCreateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AgreementFormData) => {
      const { data: agreement, error } = await supabase
        .from("agreements")
        .insert({
          ...data,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return agreement as Agreement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.byCustomer(variables.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customer_id),
      });
      toast.success("Avtal skapat!");
    },
    onError: (error) => {
      console.error("Create agreement error:", error);
      toast.error("Kunde inte skapa avtal: " + error.message);
    },
  });
}

export function useUpdateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & Partial<AgreementFormData & { status?: string }>) => {
      const { data: agreement, error } = await supabase
        .from("agreements")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return agreement as Agreement;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.byCustomer(result.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(result.customer_id),
      });
      toast.success("Avtal uppdaterat!");
    },
    onError: (error) => {
      console.error("Update agreement error:", error);
      toast.error("Kunde inte uppdatera avtal: " + error.message);
    },
  });
}

export function useDeleteAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreement: Agreement) => {
      const { error } = await supabase
        .from("agreements")
        .delete()
        .eq("id", agreement.id);
      if (error) throw error;
      return agreement;
    },
    onSuccess: (agreement) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.byCustomer(agreement.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("Avtal borttaget!");
    },
    onError: (error) => {
      console.error("Delete agreement error:", error);
      toast.error("Kunde inte ta bort avtal: " + error.message);
    },
  });
}
```

### `src/features/customers/AgreementForm.tsx`

```tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  agreementSchema,
  AgreementFormInput,
  AgreementFormData,
} from "@/lib/schemas";
import { useCreateAgreement, useUpdateAgreement } from "@/hooks/useAgreements";
import {
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_PERIOD_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import type { Agreement } from "@/types/database";

interface AgreementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  existingAgreement?: Agreement;
}

export function AgreementForm({
  open,
  onOpenChange,
  customerId,
  existingAgreement,
}: AgreementFormProps) {
  const createAgreement = useCreateAgreement();
  const updateAgreement = useUpdateAgreement();
  const isEdit = !!existingAgreement;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AgreementFormInput, unknown, AgreementFormData>({
    resolver: zodResolver(agreementSchema),
  });

  const agreementType = watch("type");
  const billingAdvance = watch("billing_advance");

  useEffect(() => {
    if (open) {
      reset({
        customer_id: customerId,
        type: existingAgreement?.type || "hourly",
        hourly_rate: existingAgreement?.hourly_rate || 850,
        overtime_rate: existingAgreement?.overtime_rate || undefined,
        included_hours: existingAgreement?.included_hours || undefined,
        period: existingAgreement?.period || undefined,
        billing_advance: existingAgreement?.billing_advance || false,
        fixed_amount: existingAgreement?.fixed_amount || undefined,
        billing_month: existingAgreement?.billing_month || undefined,
        valid_from:
          existingAgreement?.valid_from ||
          new Date().toISOString().split("T")[0],
        valid_to: existingAgreement?.valid_to || undefined,
        next_indexation: existingAgreement?.next_indexation || undefined,
      });
    }
  }, [open, existingAgreement, customerId, reset]);

  const onSubmit = async (data: AgreementFormData) => {
    if (isEdit && existingAgreement) {
      await updateAgreement.mutateAsync({ id: existingAgreement.id, ...data });
    } else {
      await createAgreement.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const isLoading = createAgreement.isPending || updateAgreement.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Redigera avtal" : "Skapa nytt avtal"}
          </DialogTitle>
          <DialogDescription>
            Konfigurera avtalsvillkor för kunden.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("customer_id")} />

          <div className="space-y-2">
            <Label htmlFor="type">Avtalstyp *</Label>
            <Select
              value={agreementType}
              onValueChange={(value) =>
                setValue("type", value as AgreementFormData["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj avtalstyp" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGREEMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate" error={!!errors.hourly_rate}>
              Timpris (kr) *
            </Label>
            <Input
              id="hourly_rate"
              type="number"
              error={!!errors.hourly_rate}
              {...register("hourly_rate", { valueAsNumber: true })}
            />
            {errors.hourly_rate && (
              <p className="text-sm text-terracotta">
                {errors.hourly_rate.message}
              </p>
            )}
          </div>

          {/* Timbank-specifika fält */}
          {agreementType === "timebank" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="included_hours">Inkluderade timmar *</Label>
                  <Input
                    id="included_hours"
                    type="number"
                    {...register("included_hours", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Select
                    value={watch("period") || ""}
                    onValueChange={(value) =>
                      setValue("period", value as "monthly" | "yearly")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj period" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGREEMENT_PERIOD_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtime_rate">Övertidspris (kr) *</Label>
                <Input
                  id="overtime_rate"
                  type="number"
                  {...register("overtime_rate", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          {/* Fastpris-specifika fält */}
          {agreementType === "fixed" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixed_amount">Fast belopp (kr) *</Label>
                  <Input
                    id="fixed_amount"
                    type="number"
                    {...register("fixed_amount", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Select
                    value={watch("period") || ""}
                    onValueChange={(value) =>
                      setValue("period", value as "monthly" | "yearly")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj period" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGREEMENT_PERIOD_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_month">Faktureringsmånad (1-12)</Label>
                <Input
                  id="billing_month"
                  type="number"
                  min={1}
                  max={12}
                  {...register("billing_month", { valueAsNumber: true })}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Giltigt från *</Label>
              <Input id="valid_from" type="date" {...register("valid_from")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_to">Giltigt till</Label>
              <Input id="valid_to" type="date" {...register("valid_to")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_indexation">Nästa indexering</Label>
            <Input
              id="next_indexation"
              type="date"
              {...register("next_indexation")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billing_advance"
              checked={billingAdvance || false}
              onCheckedChange={(checked) =>
                setValue("billing_advance", !!checked)
              }
            />
            <Label
              htmlFor="billing_advance"
              className="font-normal cursor-pointer"
            >
              Fakturera i förskott
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Sparar..."
                : isEdit
                  ? "Spara ändringar"
                  : "Skapa avtal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### `src/features/customers/TimebankWidget.tsx`

```tsx
import { Clock, AlertTriangle } from "lucide-react";
import { useTimebankStatus } from "@/hooks/useTimebank";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface TimebankWidgetProps {
  agreementId: string;
  customerId: string;
}

export function TimebankWidget({ agreementId }: TimebankWidgetProps) {
  const { data: status, isLoading } = useTimebankStatus(agreementId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timbank
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-ash">Laddar...</div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const progressVariant =
    status.percentUsed >= 90
      ? "terracotta"
      : status.percentUsed >= 75
        ? "warning"
        : "default";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timbank
          {status.isOvertime && (
            <span className="ml-auto text-sm font-normal text-terracotta flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Övertid
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ash">Förbrukat denna period</span>
            <span className="font-medium">
              {status.hoursUsed} / {status.includedHours} tim
            </span>
          </div>
          <ProgressBar
            value={Math.min(status.percentUsed, 100)}
            variant={progressVariant}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-ash block">Kvar</span>
            <span className="font-medium text-lg">
              {status.hoursRemaining} tim
            </span>
          </div>
          {status.overtimeHours > 0 && (
            <div>
              <span className="text-ash block">Övertid</span>
              <span className="font-medium text-lg text-terracotta">
                {status.overtimeHours} tim
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-sand text-xs text-ash">
          {Math.round(status.percentUsed)}% av inkluderade timmar förbrukade
        </div>
      </CardContent>
    </Card>
  );
}
```

### `src/hooks/useTimeEntries.ts`

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { TimeEntry } from "@/types/database";
import { toast } from "sonner";

interface TimeEntryWithRelations extends TimeEntry {
  customer?: { name: string; customer_number: string };
  assignment?: { title: string; assignment_number: string };
}

export function useTimeEntries(customerId?: string) {
  return useQuery({
    queryKey: customerId
      ? queryKeys.timeEntries.byCustomer(customerId)
      : queryKeys.timeEntries.all,
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select(
          `
          *,
          customer:customers(name, customer_number),
          assignment:assignments(title, assignment_number)
        `,
        )
        .order("date", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await withTimeout(query);
      if (error) throw error;
      return data as TimeEntryWithRelations[];
    },
  });
}

export function useUnbilledTimeEntries() {
  return useQuery({
    queryKey: [...queryKeys.timeEntries.all, "unbilled"],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("time_entries")
          .select(
            `
          *,
          customer:customers(name, customer_number),
          assignment:assignments(title, assignment_number)
        `,
          )
          .eq("is_billable", true)
          .eq("is_exported", false)
          .order("customer_id")
          .order("date", { ascending: false }),
      );

      if (error) throw error;
      return data as TimeEntryWithRelations[];
    },
  });
}

export function useTimeEntriesByPeriod(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.timeEntries.byPeriod(year, month),
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      const { data, error } = await withTimeout(
        supabase
          .from("time_entries")
          .select(
            `
          *,
          customer:customers(name, customer_number),
          assignment:assignments(title, assignment_number)
        `,
          )
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
      );

      if (error) throw error;
      return data as TimeEntryWithRelations[];
    },
  });
}

export function useMarkTimeEntriesExported() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { error } = await supabase
        .from("time_entries")
        .update({ is_exported: true })
        .in("id", entryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast.success("Tidposter markerade som exporterade");
    },
    onError: (error) => {
      console.error("Mark exported error:", error);
      toast.error("Kunde inte markera tidposter: " + error.message);
    },
  });
}
```

### `src/hooks/useTimebank.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  timebankStatusFromView,
  type TimebankStatus,
} from "@/lib/billing-logic";
import type { TimebankCurrentStatus } from "@/types/database";

export function useTimebankStatus(agreementId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timebank.status(agreementId || ""),
    queryFn: async (): Promise<TimebankStatus | null> => {
      if (!agreementId) return null;

      // Försök hämta från view först
      const { data, error } = await withTimeout(
        supabase
          .from("timebank_current_status")
          .select("*")
          .eq("agreement_id", agreementId)
          .maybeSingle(),
      );

      if (error) {
        console.error("Timebank status error:", error);
        // Om view inte finns, beräkna manuellt
        return await calculateTimebankManually(agreementId);
      }

      if (!data) {
        return await calculateTimebankManually(agreementId);
      }

      return timebankStatusFromView(data as TimebankCurrentStatus);
    },
    enabled: !!agreementId,
  });
}

async function calculateTimebankManually(
  agreementId: string,
): Promise<TimebankStatus | null> {
  // Hämta avtal
  const { data: agreement, error: agreementError } = await withTimeout(
    supabase.from("agreements").select("*").eq("id", agreementId).single(),
  );

  if (agreementError || !agreement || agreement.type !== "timebank") {
    return null;
  }

  // Beräkna periodens start
  const now = new Date();
  let periodStart: Date;
  if (agreement.period === "monthly") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    periodStart = new Date(now.getFullYear(), 0, 1);
  }

  // Hämta timebank-timmar för perioden
  const { data: timeEntries, error: entriesError } = await withTimeout(
    supabase
      .from("time_entries")
      .select("hours")
      .eq("agreement_id", agreementId)
      .eq("billing_type", "timebank")
      .gte("date", periodStart.toISOString().split("T")[0]),
  );

  if (entriesError) {
    console.error("Time entries error:", entriesError);
    return null;
  }

  const hoursUsed =
    timeEntries?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0;
  const includedHours = agreement.included_hours || 0;
  const hoursRemaining = Math.max(0, includedHours - hoursUsed);
  const overtimeHours = Math.max(0, hoursUsed - includedHours);
  const percentUsed = includedHours > 0 ? (hoursUsed / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursUsed > includedHours,
  };
}
```

### `src/lib/schemas.ts`

```ts
import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  org_number: z.string().optional(),
  email: z.string().email("Ogiltig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  antal_lagenheter: z.number().int().positive().optional(),
  customer_type: z
    .enum([
      "brf",
      "kommunalt_fastighetsbolag",
      "privat_fastighetsbolag",
      "forvaltningsbolag",
      "stiftelse",
      "samfallighet",
      "ovrig",
    ])
    .optional(),
  status: z.enum(["active", "prospekt", "vilande"]).default("active"),
});

export const agreementSchema = z
  .object({
    customer_id: z.string().uuid(),
    type: z.enum(["hourly", "timebank", "fixed"]),
    hourly_rate: z.number().positive("Timpris måste vara positivt"),
    overtime_rate: z.number().positive().optional(),
    included_hours: z.number().int().positive().optional(),
    period: z.enum(["monthly", "yearly"]).optional(),
    billing_advance: z.boolean().default(false),
    fixed_amount: z.number().positive().optional(),
    billing_month: z.number().int().min(1).max(12).optional(),
    valid_from: z.string(),
    valid_to: z.string().optional(),
    next_indexation: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "timebank") {
        return data.included_hours && data.period && data.overtime_rate;
      }
      return true;
    },
    { message: "Timbank kräver inkluderade timmar, period och övertidspris" },
  )
  .refine(
    (data) => {
      if (data.type === "fixed") {
        return data.fixed_amount && data.period;
      }
      return true;
    },
    { message: "Fastpris kräver belopp och period" },
  );

export const assignmentSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1, "Titel krävs"),
  description: z.string().optional(),
  type: z.enum(["case", "project"]),
  category: z
    .enum([
      "disturbance",
      "illegal_sublet",
      "screening",
      "renovation_coordination",
      "investigation",
      "other",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const journalSchema = z.object({
  content: z.string().min(1, "Innehåll krävs"),
  hours: z.number().min(0).optional(),
  billing_comment: z.string().optional(),
  is_extra_billable: z.boolean().default(false),
  entry_type: z
    .enum(["call", "email", "meeting", "site_visit", "note"])
    .default("note"),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Titel krävs"),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contact_type: z
    .enum(["customer", "assignment", "standalone"])
    .default("customer"),
  is_invoice_recipient: z.boolean().default(false),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
});

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1, "Titel krävs"),
  content: z.string().min(1, "Innehåll krävs"),
  category: z.enum(["knowledge", "policy", "routine"]),
  tags: z.array(z.string()).optional(),
  is_published: z.boolean().default(true),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  phone: z.string().optional(),
  title: z.string().optional(),
  default_hourly_rate: z.number().positive().optional(),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
});

export const quickNoteSchema = z.object({
  content: z.string().min(1, "Innehåll krävs"),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
});

export const customerNoteSchema = z.object({
  content: z.string().min(1, "Innehåll krävs"),
  is_pinned: z.boolean().default(false),
});

// Input types (för formulär - med defaults som optional)
export type CustomerFormInput = z.input<typeof customerSchema>;
export type AgreementFormInput = z.input<typeof agreementSchema>;
export type AssignmentFormInput = z.input<typeof assignmentSchema>;
export type JournalFormInput = z.input<typeof journalSchema>;
export type TaskFormInput = z.input<typeof taskSchema>;
export type ContactFormInput = z.input<typeof contactSchema>;
export type KnowledgeArticleFormInput = z.input<typeof knowledgeArticleSchema>;
export type ProfileFormInput = z.input<typeof profileSchema>;
export type QuickNoteFormInput = z.input<typeof quickNoteSchema>;
export type CustomerNoteFormInput = z.input<typeof customerNoteSchema>;

// Output types (efter validering - med defaults applicerade)
export type CustomerFormData = z.output<typeof customerSchema>;
export type AgreementFormData = z.output<typeof agreementSchema>;
export type AssignmentFormData = z.output<typeof assignmentSchema>;
export type JournalFormData = z.output<typeof journalSchema>;
export type TaskFormData = z.output<typeof taskSchema>;
export type ContactFormData = z.output<typeof contactSchema>;
export type KnowledgeArticleFormData = z.output<typeof knowledgeArticleSchema>;
export type ProfileFormData = z.output<typeof profileSchema>;
export type QuickNoteFormData = z.output<typeof quickNoteSchema>;
export type CustomerNoteFormData = z.output<typeof customerNoteSchema>;
```

### `src/lib/constants.ts`

```ts
// Svenska labels för UI

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  brf: "Bostadsrättsförening",
  kommunalt_fastighetsbolag: "Kommunalt fastighetsbolag",
  privat_fastighetsbolag: "Privat fastighetsbolag",
  forvaltningsbolag: "Förvaltningsbolag",
  stiftelse: "Stiftelse",
  samfallighet: "Samfällighet",
  ovrig: "Övrig",
};

export const FILES_BUCKET = "files";

// Filuppladdningsbegränsningar
export const FILE_UPLOAD_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
export const FILE_UPLOAD_MAX_SIZE_LABEL = "25 MB";

export const FILE_UPLOAD_ALLOWED_TYPES = [
  // Dokument
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Bilder
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Video (begränsat)
  "video/mp4",
  "video/webm",
  // Arkiv
  "application/zip",
  "application/x-zip-compressed",
];

export const FILE_UPLOAD_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".mp4",
  ".webm",
  ".zip",
];

// Farliga filtillägg som ALDRIG ska tillåtas
export const FILE_UPLOAD_BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".mjs",
  ".dll",
  ".so",
  ".dylib",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".cgi",
  ".htaccess",
  ".htpasswd",
  ".pif",
  ".scr",
  ".com",
];

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  prospekt: "Prospekt",
  vilande: "Vilande",
};

export const AGREEMENT_TYPE_LABELS: Record<string, string> = {
  hourly: "Löpande",
  timebank: "Timbank",
  fixed: "Fastpris",
};

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  active: "Aktivt",
  expired: "Utgånget",
  terminated: "Uppsagt",
};

export const AGREEMENT_PERIOD_LABELS: Record<string, string> = {
  monthly: "Månadsvis",
  yearly: "Årsvis",
};

export const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  case: "Ärende",
  project: "Projekt",
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  active: "Aktivt",
  paused: "Pausat",
  closed: "Avslutat",
};

export const ASSIGNMENT_CATEGORY_LABELS: Record<string, string> = {
  disturbance: "Störning",
  illegal_sublet: "Olovlig andrahand",
  screening: "Granskning",
  renovation_coordination: "Renoveringssamordning",
  investigation: "Utredning",
  other: "Övrigt",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Låg",
  medium: "Medium",
  high: "Hög",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Att göra",
  in_progress: "Pågående",
  done: "Klar",
};

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  call: "Samtal",
  email: "E-post",
  meeting: "Möte",
  site_visit: "Platsbesök",
  note: "Anteckning",
};

export const BILLING_TYPE_LABELS: Record<string, string> = {
  timebank: "Timbank",
  overtime: "Övertid",
  hourly: "Löpande",
  fixed: "Fastpris",
  internal: "Intern",
};

export const BATCH_STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  review: "Granskning",
  exported: "Exporterad",
  locked: "Låst",
};

export const KNOWLEDGE_CATEGORY_LABELS: Record<string, string> = {
  knowledge: "Kunskap",
  policy: "Policy",
  routine: "Rutin",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  consultant: "Konsult",
  readonly: "Läsbehörighet",
};

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];
```

### `src/lib/queryKeys.ts`

```ts
export const queryKeys = {
  customers: {
    all: ["customers"] as const,
    detail: (id: string) => ["customers", id] as const,
    byWorkspace: (wsId: string) => ["customers", "workspace", wsId] as const,
    paged: (page: number, pageSize: number, search: string) =>
      ["customers", "page", page, pageSize, search] as const,
    timeline: (customerId: string) =>
      ["customers", customerId, "timeline"] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    detail: (id: string) => ["assignments", id] as const,
    byCustomer: (customerId: string) =>
      ["assignments", "customer", customerId] as const,
  },
  journal: {
    byAssignment: (assignmentId: string) => ["journal", assignmentId] as const,
  },
  timeEntries: {
    all: ["timeEntries"] as const,
    byCustomer: (customerId: string) =>
      ["timeEntries", "customer", customerId] as const,
    byPeriod: (year: number, month: number) =>
      ["timeEntries", "period", year, month] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    byAssignee: (userId: string) => ["tasks", "assignee", userId] as const,
    byCustomer: (customerId: string) =>
      ["tasks", "customer", customerId] as const,
    byAssignment: (assignmentId: string) =>
      ["tasks", "assignment", assignmentId] as const,
  },
  agreements: {
    all: ["agreements"] as const,
    byCustomer: (customerId: string) =>
      ["agreements", "customer", customerId] as const,
    withIndexation: ["agreements", "indexation"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    byCustomer: (customerId: string) =>
      ["contacts", "customer", customerId] as const,
    byAssignment: (assignmentId: string) =>
      ["contacts", "assignment", assignmentId] as const,
  },
  knowledge: {
    all: ["knowledge"] as const,
    byCategory: (category: string) =>
      ["knowledge", "category", category] as const,
  },
  profile: {
    current: ["profile", "current"] as const,
  },
  customerNotes: {
    byCustomer: (customerId: string) => ["customerNotes", customerId] as const,
  },
  notes: {
    all: ["notes"] as const,
  },
  quickNotes: {
    all: ["quickNotes"] as const,
  },
  files: {
    byCustomer: (customerId: string) =>
      ["files", "customer", customerId] as const,
    byAssignment: (assignmentId: string) =>
      ["files", "assignment", assignmentId] as const,
  },
  billingBatches: {
    all: ["billingBatches"] as const,
    detail: (id: string) => ["billingBatches", id] as const,
    byCustomer: (customerId: string) => ["billingBatches", customerId] as const,
    byPeriod: (year: number, month: number) =>
      ["billingBatches", "period", year, month] as const,
  },
  timebankStatus: {
    byAgreement: (agreementId: string) =>
      ["timebankStatus", agreementId] as const,
    byCustomer: (customerId: string) =>
      ["timebankStatus", "customer", customerId] as const,
  },
  timebank: {
    status: (agreementId: string) =>
      ["timebank", "status", agreementId] as const,
  },
} as const;
```

---

## Avtalsexempel (extraherad text)

### `exempel timbanksavtal.pdf`

```text
Grannfrid AB - 031-70 70 333 – www.grannfrid.se - info@grannfrid.se    1/3
GRANNFRID TRYGGHET  -Avtal för bosociala tjänster Mellan HSB Bostadsrättsförening Björkekärr i Göteborg med organisationsnummer 757200-9053 (nedan kallat Beställaren) och Grannfrid AB med organisationsnummer 559329-7988 (nedan kallat Leverantören), och gemensamt benämnda Parterna, har följande avtal träffats. 1 Avtalets omfattning 1.1 Detta avtal reglerar Leverantörens tillhandahållande av bosociala konsulttjänster till Beställaren enligt konceptet Grannfrid Trygghet. 1.2 Tjänsten omfattar en förköpt timbank som ger Beställaren tillgång till Leverantörens konsulttjänster för bosociala ärenden enligt specifikation i punkt 1.3 nedan. 1.3 Detta avtal avser en timbank om totalt 60 timmar per år, att nyttjas enligt villkoren i detta avtal. 2 Avtalsperiod 2.1 Avtalet gäller från och med 2026-028-01, till och med 2027-017-31 2.2 Om avtalet inte sägs upp av någon part senast 3 månader före avtalstidens utgång förlängs avtalet automatiskt med 12 månader i taget. 2.3 Uppsägning ska ske skriftligen. 3 Tjänstespecifikation 3.1 Tjänsten Grannfrid Trygghet inkluderar följande: - Hantering av störningsärenden och klagomål - Medling i grannkonflikter - Utredning av olovlig andrahandsuthyrning,  - Kontroll av föreningens adresser mot folkbokföringen för upptäckt av avvikelser - Hantering av boendeproblem relaterade till missbruk och psykisk ohälsa - Hantering av problematik med sanitära olägenheter - Rådgivning till styrelsen i bosociala frågor 3.2 Leverantören åtar sig att påbörja hanteringen av inkomna ärenden skyndsamt, dock senast tre (3) arbetsdagar från att ärendet anmälts av Beställaren. 4 Timbank och nyttjande 4.1 Outnyttjade timmar i timbanken förfaller vid avtalstidens utgång och kan inte överföras till nästa avtalsperiod. 4.2 För att säkerställa god arbetsfördelning och hög kvalitet i leveransen av tjänster, bör planeringsbara uppdrag – såsom utredningar av misstänkt olovlig andrahandsuthyrning –


Grannfrid AB - 031-70 70 333 – www.grannfrid.se - info@grannfrid.se    2/3
beställas med minst en månads framförhållning. Detta gäller dock inte akuta bosociala ärenden som kräver omedelbar hantering – dessa prioriteras alltid oavsett tidpunkt. 4.3 Tid avräknas per påbörjad kvart (15 minuter). 5 Pris och betalningsvillkor 5.1 Den avtalade årliga avgiften för tjänsten uppgår till 36 000 kr exkl. moms. 5.2 Fakturering sker årsvis i förskott med betalningsvillkor 30 dagar netto. 5.3 Vid överskriden timbank debiteras: 1 100 kr/timme exkl. moms. 5.4 Priser justeras vid varje avtalsförlängning enligt SCB Tjänsteprisindex (TPI). 6 Beställarens åtaganden 6.1 Beställaren ska utse en kontaktperson som Leverantören kan kommunicera med i ärenden. 6.2 Beställaren förbinder sig att förse Leverantören med nödvändig information för uppdragets genomförande. 6.3 Beställaren ansvarar för att informera berörda boende om samarbetet med Leverantören i den utsträckning som behövs. 7 Leverantörens åtaganden 7.1 Leverantören ska tillhandahålla kvalificerad personal med relevant utbildning och erfarenhet för uppdragen. 7.2 Leverantören åtar sig att dokumentera genomförda insatser och vid behov tillhandahålla beslutsunderlag till Beställaren. 7.3 Leverantören åtar sig att behandla all information med sekretess och i enlighet med tillämplig dataskyddslagstiftning. 7.4 Leverantören ska utse en kontaktperson för uppdraget som Beställaren kan vända sig till i alla frågor som rör avtalet och utförandet av tjänsterna. 8 Rapportering och uppföljning 8.1 Leverantören ska på Beställarens begäran tillhandahålla en sammanställning över förbrukad tid och utförda tjänster. 8.2 Uppföljningsmöte mellan Beställarens och Leverantörens kontaktpersoner kan hållas vid behov, på begäran av endera parten. 9 Ansvar och ansvarsbegränsning 9.1 Leverantören ansvarar för skada som orsakas Beställaren genom vårdslöshet från Leverantörens sida.


Grannfrid AB - 031-70 70 333 – www.grannfrid.se - info@grannfrid.se    3/3
9.2 Leverantörens ansvar är begränsat till ett belopp motsvarande ett års avtalsvärde. 9.3 Leverantören ansvarar inte för indirekta skador eller följdskador, såsom utebliven vinst eller intäkt. 10 Sekretess 10.1 Parterna förbinder sig att inte till tredje part lämna ut konfidentiell information som erhållits från den andra parten. 10.2 Med konfidentiell information avses all information som rör enskilda boende, ekonomiska förhållanden eller annan information som kan anses känslig. 10.3 Sekretesskyldigheten gäller även efter avtalets upphörande. 11 Behandling av personuppgifter 11.1 Leverantören kommer att behandla personuppgifter för Beställarens räkning. Ett separat personuppgiftsbiträdesavtal ska upprättas. 12 Force majeure 12.1 Part befrias från sina förpliktelser om dessa förhindras av omständigheter utanför partens kontroll. 12.2 Part som åberopar sådan omständighet ska utan dröjsmål skriftligen informera den andra parten. 13 Tvist 13.1 Tvist med anledning av detta avtal ska i första hand lösas genom förhandling mellan parterna. 13.2 Om parterna inte kan nå en överenskommelse ska tvisten avgöras i svensk allmän domstol med tillämpning av svensk rätt. 14 Övrigt 14.1 Detta avtal är elektroniskt signerat och anses vara lika bindande som en fysisk originalunderskrift.
```

### `exempel timavtal.pdf`

```text

```

### `exempel fastprisavtal.docx`

```text
GRANNFRID HELHET				Datum:
Avtal om tjänster för bosociala ärenden		2025-01-15



Mellan HSB Bostadsrättsförening Vintergatan i Göteborg med organisationsnummer 757200-9475, hädanefter under benämningen ”Uppdragsgivaren” och Grannfrid AB med organisationsnummer 559329-7988 hädanefter under benämningen ”Entreprenören” och gemensamt benämnda ”Parterna” har följande Avtal träffats.
DEFINITIONER
I Avtalet skall nedan angivna termer ha följande betydelse:
Med Avtalet avses detta huvuddokument och vid tiden gällande bilagor.
Med Fast pris avses det arvode som skall erläggas med grund i detta avtal.
Med Löpande räkning avses det arvode som skall erläggas baserat på Entreprenörens faktiska nedlagda tidsåtgång för uppdragets utförande.
OM GRANNFRID AB
Grannfrid AB är ett Göteborgsbaserat bolag som bedriver bosocialt arbete på uppdrag av bostadsrättsföreningar och hyresvärdar. Bolaget startades i juli 2021 av Sandra Mellgård Davis och Jonas Halvarsson.
Vision
Vi på Grannfrid har en vision om att göra det enkelt och prisvärt för bostadsrättsföreningar och hyresvärdar att satsa på social hållbarhet. Genom vår professionella och personliga hjälp med störningsärenden, konflikthantering och andra boendeproblem vill vi skapa förutsättningar för ett bättre och tryggare boende för alla. Vi är övertygade om att en god grannsämja inte bara gynnar boende och fastighetsägare utan också samhället i stort.


MÅLSÄTTNING
Entreprenörens målsättning är att bidra till ökad trivsel och trygghet för beställarens medlemmar. Entreprenörens arbete skall vidare avlasta beställaren i arbetet med bosociala frågor. Entreprenören skall utreda och bedöma behov samt medverka till att rätt hjälp erbjuds till medlemmar och hyresgäster.

Entreprenören avser att uppfylla det krav som ligger på beställaren gällande att utreda och om behov finns agera på inkomna störningsanmälningar.







OM TJÄNSTEN
Avtalet avser Grannfrid Helhet, ett helhetskoncept där Entreprenören åtar sig att aktivt hantera samtliga ärenden av boendesocial karaktär, såsom störningsärenden, grannkonflikter och problem relaterade till missbruk, minnesproblematik samt psykisk ohälsa. Avtalet innehåller också tjänster som är av begränsad art: Screening (1 st per år), Fördjupad utredning av misstänkt olovlig andrahandsuthyrning (3 st per år) och Kontrollbesök kvällstid (6 st, dvs 2 besök per lägenhet vi utreder). 

Tjänsten Grannfrid Helhet innefattar:

Kontakt med involverade parter i ärenden

Medling och konflikthantering mellan medlemmar

Genomförande av fysiska möten eller hembesök hos medlemmar

Utredning av störningsärenden och framtagande av åtgärdsförslag

Förslag på åtgärder och förmedling av stöd vid avgiftsrestantier

Förmedling av relevanta kontakter och förslag på stödresurser

Kontakt med anhöriga samt samverkan med sjukvård, socialtjänst och andra myndigheter vid behov

Utformning av underlag till eventuella rättelseanmaningar

Medverkan vid eventuella förhandlingar eller rättegång i ärenden som hanterats av Grannfrid

En årlig screening av föreningens lägenheter för att hitta avvikelser i folkbokföringen och därmed upptäcka oriktiga hyresförhållanden

3 st fördjupade utredningar av misstänkt olovlig andrahandsuthyrning, inklusive 6 st kontrollbesök kvällstid.
UPPDRAGETS ART OCH OMFATTNING
Omfattning
Uppdraget skall avlasta Uppdragsgivaren i arbetet med bosociala frågor för de 232 st lägenheter som ingår i föreningen vid tidpunkten för avtalets upprättande. Entreprenören skall utreda och bedöma behov samt medverka till att rätt hjälp erbjuds till medlemmar och hyresgäster. Entreprenören skall vidare arbeta långsiktigt med medlemmar eller hyresgäster som har bosociala behov. Tjänsten inkluderar inte juridiska tjänster.  Avtalet omfattar inte heller kontakt med medlemmar i samband med större renovering eller stambyte. Sådan kontakt kan i sådant fall ske efter tilläggsbeställning.
          Utförande
Entreprenören åtar sig att utföra uppdraget i överensstämmelse med:

Detta huvudavtal och vid tiden gällande bilagor.

ABFF 15 – Allmänna bestämmelser för entreprenader inom fastighetsförvaltning och service.

Aff-definitioner 15

Uppdraget skall vidare utföras med omsorg för medlemmarna och hyresgästerna samt med respekt för medlemmarnas och hyresgästernas integritet.

          Ändring av omfattning, tidplan eller karaktär
Vid eventuella behov av ändringar beträffande uppdragets omfattning eller karaktär, skall den Part som uppmärksammar detta, snarast meddela den andra Parten. Ändringar får endast ske efter särskild överenskommelse mellan Parterna. Ändringarna skall vara skriftliga och undertecknas av båda Parterna för att bli giltiga.
         Arbetstid
Uppdrag enligt detta avtal skall utföras vardagar med ordinarie arbetstid
kl 08:00-17:00, med undantag för de kontrollbesök som ingår i avtalet, de utförs kvällstid.

Uppdrag som behöver utföras utanför ordinarie arbetstid skall bekostas av Uppdragsgivaren enligt löpande räkning/separat prislista och ske efter överenskommelse.
         Servicenivå
Entreprenören förbinder sig att påbörja ärenden skyndsamt, dock senast inom tre arbetsdagar från dess att ett ärendet inkommer.

Entreprenören strävar efter att kontinuerligt tillhandahålla åtminstone en konsult året runt, med undantag för sjukdom, röda dagar eller verksamhetsobligatoriska evenemang så som planerings- eller utbildningsdagar.
           Samarbete
Parterna är medvetna om att Avtalet inte kan reglera samtliga frågeställningar och händelser som kan tänkas uppkomma till följd av ständig utveckling och förändrade rättsliga förhållanden. Parterna skall sträva efter att anpassa sig till nya förhållanden som kan uppstå under avtalstiden.

Avtalet bygger på ömsesidigt förtroende. Under Uppdragets genomförande skall Parterna samarbeta och samråda.

Uppdragsgivaren skall lämna de erforderliga uppgifter som krävs för att Entreprenören skall kunna utföra uppdraget.
           Kontaktpersoner
Uppdragsgivaren skall utse en kontaktperson som Entreprenören återkommande kan ha kommunikation med. Uppdragsgivarens kontaktperson skall löpande underrättas om ärendenas fortskridande.

Parternas kommunikation angående ärendena ska ske skriftligen eller muntligen.
           Försäkring
Entreprenören garanterar att denne innehar ansvarsförsäkring som omfattar åtagande enligt detta avtal.
             Force Majeure
Part behöver inte fullgöra förpliktelser enligt detta avtal om fullgörande omöjliggör, förhindras eller annars i väsentlig mån försvåras på grund av myndighetsåtgärd, strejk, konflikt på arbetsmarknaden, långvarigt IT-haveri, naturkatastrof eller därmed jämställda omständigheter. En förutsättning för att befrielsen ska gälla är att det är fråga om en omständighet som part skäligen inte kunde ha räknat med vid avtalets ingående och som heller inte skäligen kunde ha undvikits eller övervunnits.

För befrielse enligt ovan skall part utan dröjsmål meddela den andra parten.
Om fullgörande av Avtalet väsentligen förhindras under en längre tid än tre månader på grund av den inträffade omständigheten äger vardera Part rätt att häva avtalet.

Om fullgörande av avtalet väsentligen förhindras under en längre tid än tre månader på grund av den inträffade omständigheten äger vardera parten rätt att häva avtalet. Ersättning utgår ej vid hävning på grund av inträffad force majeure-händelse.
ANSVAR
              Indirekta skador och förlust av data
Entreprenören ansvarar inte i något fall för indirekta skador, såsom utebliven vinst, produktionsbortfall och liknande kostnader eller förluster. Entreprenören ansvarar ej heller för Uppdragsgivarens förlust av data.

4.6.2           Entreprenörens ansvar
Entreprenören är ansvarig för skador som vållas Uppdragsgivaren genom fel eller försummelse vid utförande av uppdraget. Entreprenörens totala ansvar gentemot Uppdragsgivaren, om inte uppsåt eller grov oaktsamhet kan läggas Entreprenören till last, skall vara begränsat till ett belopp motsvarande vad Entreprenören erhållit i arvode från Uppdragsgivaren under den sexmånadersperiod som föregått skadan.

4.6.3           Uppdragsgivarens ansvar
I inget fall ovan skall Uppdragsgivaren vara berättigad till ersättning överstigande dess ersättningsgilla skada. Uppdragsgivaren åtar sig att hålla Entreprenören skadeslös för alla krav som tredje part kan komma att rikta mot Entreprenören och vilka grundar sig på Uppdragsgivarens handlande eller underlåtenhet, såvida inte Entreprenörens vårdslöshet, avtalsbrott eller uppsåt förorsakat tredje mans krav.




EKONOMI
          Arvode
Arvodet för Grannfrid Helhet är ett fast pris om en total avtalssumma som uppgår till 70 000 kr per år för utförande av uppdraget exklusive kostnader för tillägg eller ändringar. Arvodet anges exklusive mervärdesskatt.
          Arvode vid ändringar och tilläggsuppdrag
Ersättning för ändrings- och tilläggsuppdrag som inte inkluderas i avtalssumman sker primärt genom en i förväg skriftligt överenskommen kostnad och sekundärt enligt den prislista som Entreprenören tillämpar vid varje givet tillfälle. Betalning för dessa ändringar och tillägg sker med Löpande pris genom fakturering efter utförandet av respektive uppdrag. För samtliga fakturor gäller 30 dagar netto som betalningsvillkor.

I händelse av en förändring i uppdragets omfattning ska ersättningen enligt ovanstående justeras. Detta gäller dock endast om Entreprenörens arbetsuppgifter utökas eller på annat sätt förändras som en direkt konsekvens av Uppdragsgivarens instruktioner, beslut eller händelser som är kopplade till myndighetsbeslut och som inte kunde förutses vid avtalets ingående. Förändringen ska vara av en sådan väsentlig karaktär att den i betydande grad påverkar förutsättningarna för uppdragets genomförande.

          Ersättning för kostnadsökning (indexreglering)
Avtalssumman ska uppräknas med hänsyn till förändringarna i tjänstemannalöneindex AKI SNI Q.
Uppräkningen ska ske årligen den 1 februari med den procentuella förändring som indextalet undergått i oktober månad föregående år jämfört med oktober månad året dessförinnan.
Första uppräkningen sker den 1 februari 2026. Avtalssumman är anpassad till det indextal som fastställts för november månad 2024.


BETALNING
Betalning av det årliga arvodet, inklusive skatter, ska erläggas vid avtalad avtalsstart. Därefter årligen vid fakturering i förskott. Betalning av ändringar eller tillägg faktureras löpande efter beställning. Betalning sker mot uppvisande av faktura. För samtliga fakturor gäller 30 dagar netto som betalningsvillkor efter fakturans utfärdandedatum.


           Dröjsmålskostnader
Erlägges Uppdragsgivaren inte betalning inom förfallodatum, äger Entreprenören rätt att fakturera för tillkommande påminnelse- och inkassokostnad samt tillkommande dröjsmålsränta enligt räntelagen.

Entreprenören innehar också rätten att, efter skriftlig underrättelse till Uppdragsgivaren, på obestämd tid avbryta sitt uppdrag fram tills dess att Uppdragsgivaren har reglerat eventuella utestående och förfallna fordringar. Denna åtgärd kräver dessutom att Uppdragsgivaren lämnar en betryggande säkerhet för framtida betalningar relaterade till Entreprenörens kontinuerliga uppdrag.

Fullgör inte Uppdragsgivaren sin betalningsskyldighet äger Entreprenören rätt att säga upp Avtalet med omedelbart upphörande efter dess att inkassokrav förfallit till betalning.
ÖVERLÅTELSE
Parterna får inte utan skriftligt samtycke från den andre Parten, överlåta sina förpliktelser enligt detta Avtal till tredje man.
ENTREPRENÖRENS RÄTTSLIGA STÄLLNING
Entreprenören och de personer hos Entreprenören som utför Uppdraget ska betraktas som självständiga parter i förhållande till Uppdragsgivaren och något anställningsförhållande skall inte uppstå mellan Parterna med anledning av detta Avtal.
AVTALSTID OCH UPPSÄGNING
Avtalet träder i kraft vid undertecknande av båda Parterna och gäller fram till och med den 31 januari 2026.

I händelse av att Avtalet inte avslutas genom uppsägning från någon av parterna senast sex (6) månader före avtalstidens utgång, kommer Avtalet automatiskt att förlängas med ytterligare tolv (12) månader.

Uppsägning av Avtalet skall ske skriftligen.




KONTRAKTSBROTT OCH INSOLVENS
Part får med omedelbar verkan häva Avtalet om den andra Parten

åsidosätter sina skyldigheter enligt detta Avtal och inte vidtar rättelse inom tio (14) dagar efter skriftlig anmodan härom,

försätts i konkurs, ställer in sina betalningar, upptar ackordsförhandling, träder i likvidation eller annars kan anses ha kommit på obestånd.
	Reklamation och preskription
En part förväntas reklamera den andra partens kontraktsbrott utan onödigt dröjsmål. Rätten för vardera parten att vidta åtgärder med anledning av detta avtal upphör ett år efter den tidpunkt då Entreprenören slutförde uppdraget.
	Ersättning för utfört uppdrag
Entreprenören kommer emellertid alltid att berättigas till ersättning för genomförda uppdrag och dokumenterade kostnader, i den mån resultatet av uppdraget har motsvarande värde för Uppdragsgivaren.
 	Redovisning och överlämning av resultat
Vid en eventuell avtalsupphörande i förtid åligger det Entreprenören att vid den tidpunkt då betalning mottagits senast, redovisa och överlämna resultaten av de utförda uppdragen.

Information i form av minnesanteckningar raderas vid avslut av ärende efter att ha muntligen kommunicerats.
	Följder av Avtalets upphörande
Vid Avtalets upphörande skall vardera Part tillse att dess skyldigheter intill upphörandedagen uppfylls. Efter denna tidpunkt kvarstår inga rättigheter eller skyldigheter mellan Parterna med undantag av vad som i övrigt anges i detta Avtal.
HANTERING AV PERSONUPPGIFTER M.M.
Entreprenören innehar rollen som personuppgiftsansvarig och åtar sig att efterleva Uppdragsgivarens riktlinjer för behandling och skydd av personuppgifter mot obehörig användning eller spridning. Vid behov av ett sådant förfarande ska parterna, innan uppdraget påbörjas, upprätta ett personuppgiftsbiträdesavtal för att reglera hanteringen av personuppgifter mellan parterna.




SEKRETESS
Entreprenören har rätt att vid behov kontakta myndigheter samt medlemmar för att utge den information som krävs för fullgörelse av detta avtal.

Entreprenören ansvarar för att efterleva Uppdragsgivarens krav på säkerhetsåtgärder beträffande hantering av information och personuppgifter.

Sekretess gäller även efter avtalets upphörande. Sekretess gäller dock inte när part enligt lag är skyldig att lämna ut uppgifter.

	Sekretessåtagandets giltighetstid
Sekretessåtagandet skall fortsätta att gälla under en tid av tolv (12) månader efter att Avtalet sagts upp eller löpt ut.
LAGVAL
Avtalet skall regleras av svensk rätt, såsom den tillämpas på avtal som ingåtts i Sverige mellan svenska parter.
TVIST
Tvister kring tolkning eller tillämpning av detta avtal avgöres i första hand genom samråd mellan Parterna. Om överenskommelse ej kan nås, skall tvister med anledning av Avtalet avgöras av allmän domstol.
















ÖVRIGT
Detta avtal har upprättats i två (2) likalydande exemplar av vilka Parterna tagit var sitt.


HSB Brf Vintergatan			HSB Brf Vintergatan


Ort:____________________   		Ort:_______________________


Datum:_________________		Datum:____________________



___________________________		___________________________
Underskrift				Underskrift


___________________________ 		__________________________  
Namnförtydligande 			Namnförtydligande  
  


Grannfrid AB


Ort:____________________


Datum:_________________



___________________________
Underskrift


___________________________   
Namnförtydligande
```

### `exempel projektavtal.pdf`

```text
Grannfrid – Nyckeln till ett tryggare boende    1 AVTAL FÖR BOSOCIAL TJÄNST I SAMBAND MED STAMBYTE Mellan HSB Bostadsrättsförening Seglaren i Göteborg, organisationsnummer 757202–6941 (nedan ”Beställaren”), och Grannfrid AB, organisationsnummer 559329–7988 (nedan ”Konsulten”), har följande avtal träffats. Avtalet baseras på ABK 09 – Allmänna Bestämmelser för Konsultuppdrag inom arkitekt- och ingenjörsverksamhet. 1. BAKGRUND OCH SYFTE  1.1 Projektfakta • Antal lägenheter: 415 • Förskola: 1 • Lokaler: 2 mindre lokaler (uthyrda) • Huskroppar: 5 • Produktionsstart: 1 mars 2026 • Planerad produktionstid: upp till 36 månader • Produktionstakt: 8–10 lägenheter per vecka • Låghus: 2 stammar samtidigt • Höghus: 1-2 stammar åt gången beroende på typ av lägenhet. 1.2 Teknisk omfattning • Kassetter i badrum samt nytt innertak • Nya badrumsinventarier • Relining i kök och nya tappvattenrör • Nya värmerör • Källarförråd påverkas av rördragningar • Provisorier i trapphus • Tillgång till dusch- och WC-bodar samt torrtoaletter • Fyra evakueringsbostäder • Två standardutföranden på badrum samt möjlighet till tillval • Visningslokal med produkter för standardutföranden och tillval 1.3 Syfte Syftet med det bosociala uppdraget är att stödja Beställaren och dess medlemmar samt lokalhyresgäster genom hela stambytesprocessen, säkerställa god dialog mellan berörda parter, hantera boendesociala behov samt underlätta för styrelse och entreprenör så att projektet kan genomföras effektivt och med minsta möjliga hinder. 2. KONSULTENS ÅTAGANDEN OCH LEVERANSER  2.1 Kommunikation och information • Informationsutskick till boende och lokalhyresgäster • Etapp- och huskroppsmöten vid behov
Transaktion 11hbec1mjy38wm4
Signerat av POG, BM, JH.



Grannfrid – Nyckeln till ett tryggare boende    2 • Löpande kommunikationsstöd till styrelsen • Direktkontakt med boende via telefon, e-post och hembesök • Medling vid konflikter • Månadsvisa uppdateringar till styrelsen 2.2 Samverkan med entreprenör • Deltagande på byggmöten • Regelbunden närvaro på arbetsplatsen • Samordning av tillträdesfrågor • Problemlösning på plats för att undvika förseningar 2.3 Praktisk samordning och medlemsstöd • Hantering av medlemsgodkännanden • Uppsökande verksamhet • Kartläggning av individuella behov • Särskilt stöd till boende med omfattande behov • Stöd i tillvalsprocessen • Samordning kring källarförråd • Konflikthantering 2.4 Hyresgästsamordning • Kontaktperson för lokalhyresgäster • Information om tidplan och etapper • Stöd i tillvalsprocessen vid behov 2.5 Evakuering • Administration av evakueringsbostäder • Behovsbedömning och prioritering • Samordning av in- och utflytt • Efterkontroll av bostäder 2.6 Samarbete Samarbete med förvaltare och fastighetsskötare ingår uttryckligen i uppdraget. 3. PERSONAL Två erfarna konsulter tillhandahålls: • Huvudkonsult • Backup-konsult Ordinarie arbetstid är vardagar 08.00–17.00, med undantag för byggmöten som kan kräva tidigare start och överenskomna kvällsmöten vid behov.
Transaktion 11hbec1mjy38wm4
Signerat av POG, BM, JH.



Grannfrid – Nyckeln till ett tryggare boende    3  4. TIDSPLAN OCH UPPDRAGETS VARAKTIGHET  4.1 Förberedelseperiod (timdebitering) Förberedelseperioden löper från cirka mars 2025 fram till produktionsstart den 1 mars 2026. Under perioden sker ersättning enligt timdebitering. Fakturering sker månadsvis i efterskott. 4.2 Villkorad produktionsstart Avtalets produktionsfas är villkorad av att Beställaren senast vid produktionsstart har erhållit erforderligt bygglov samt säkerställt nödvändig bankfinansiering. Om bygglov inte beviljas eller bankfinansiering inte erhålls, äger Beställaren rätt att skriftligen meddela att avtalet, såvitt avser produktionsfasen, ska upphöra att gälla. Avtalet ska då anses makulerat i denna del, utan rätt till ersättning eller skadestånd med anledning av att produktionsfasen inte påbörjas. 4.3 Produktionsfas Produktionsfasen inleds den 1 mars 2026 och omfattar maximalt tre (3) avtalsperioder om vardera tolv (12) månader. 5. ERSÄTTNING OCH BETALNING  5.1 Förberedelseperiod Timdebitering sker med 1 060 kr per timme exklusive moms. Fakturering sker månadsvis i efterskott. 5.2 Produktionsfas Under produktionsfasen utgår ett fast månadsarvode om 50 000 kr exklusive moms. Arvodet gäller per avtalsperiod om tolv (12) månader.  Om avtalet inte sägs upp skriftligen senast tre (3) månader före pågående avtalsperiods utgång förlängs avtalet automatiskt med ytterligare tolv (12) månader. Automatisk förlängning kan ske högst två (2) gånger, motsvarande maximalt trettiosex (36) månader. Fakturering sker månadsvis i efterskott. 5.3 Indexreglering Månadsarvodet samt timpris indexregleras enligt SCB:s vid var tid gällande konsultarvodesindex för arkitekt- och ingenjörsverksamhet (exempelvis K84). För månadsarvodet sker första indexreglering tolv (12) månader efter produktionsstart, med februari 2026 som basmånad. Därefter sker indexreglering årligen.
Transaktion 11hbec1mjy38wm4
Signerat av POG, BM, JH.



Grannfrid – Nyckeln till ett tryggare boende    4 För timbaserad ersättning sker indexreglering under den tid timpris tillämpas, med årlig reglering räknat från den tidpunkt då timbaserad ersättning börjar gälla. 5.4 Betalningsvillkor Betalningsvillkor är 30 dagar netto. Samtliga priser anges exklusive moms. 6. AVTALSTID, UPPSÄGNING OCH ÖVERGÅNG TILL TIMDEBITERING  6.1 Avtalstid Avtalet gäller från produktionsstart den 1 mars 2026 och löper initialt under tolv (12) månader. 6.2 Automatisk förlängning Om avtalet inte sägs upp skriftligen senast tre (3) månader före avtalsperiodens utgång förlängs avtalet automatiskt med ytterligare tolv (12) månader, dock högst två (2) gånger. 6.3 Övergång till timdebitering Efter att trettiosex (36) månader har löpt ut upphör det fasta månadsarvodet automatiskt. Uppdraget övergår därefter till timbaserad ersättning enligt samma villkor som gällde före produktionsstart, om inte annat skriftligen avtalas. 6.4 Uppsägning efter produktionsfas Efter övergång till timdebitering gäller en ömsesidig uppsägningstid om en (1) månad.  7. ANSVAR, FÖRSÄKRING OCH ÖVRIGA BESTÄMMELSER Konsultens ansvar regleras enligt ABK 09 kapitel 5. Konsulten innehar konsultansvarsförsäkring som täcker uppdraget.  8. TVIST Tvist ska i första hand lösas genom förhandling. Om detta inte lyckas ska tvist avgöras enligt ABK 09 kapitel 9.  9. UNDERSKRIFTER Detta avtal är elektroniskt signerat och är lika bindande som en fysisk originalunderskrift.
Transaktion 11hbec1mjy38wm4
Signerat av POG, BM, JH.


Signerande parter
Per Olof Göransson
Undertecknare
perolofgoransson9@gmail.com
Undertecknad med BankID av Per Olof
Göransson - 196008145093
Signerade 2026-01-02 19:32:23 CET
IP 213.66.213.19
Firefox, WindowsBenjamin Mattsson
Undertecknare
benjamin.mattsson@hotmail.com
Undertecknad med BankID av Benjamin Niklas
Mattsson - 199707243656
Signerade 2026-01-03 10:16:18 CET
IP 90.231.1.80
Chrome, Windows
Jonas Halvarsson
Undertecknare
jonas@grannfrid.se
Undertecknad med BankID av JONAS
HALVARSSON - 198105084894
Signerade 2026-01-02 16:45:47 CET
IP 94.254.62.28
Chrome, iOS, iPhone
Det här dokumentet har verifierats av Cling. Dokumentet är förslutet med dess elektroniska signaturer.
Äktheten av dokumentet går att bevisa matematiskt av en oberoende part och av Cling. För er bekvämlighet
så kan du även säkerställa dokumentets äkthet på: https://app.cling.se/verify
HändelserVerifikat
CLING
2026-01-02 CET
16:42:06 CETDokument skickades till Benjamin Mattsson, .
2026-01-02 CET
16:42:06 CETDokument skickades till Jonas Halvarsson, .
Transaktion 11hbec1mjy38wm4
Signerat av POG, BM, JH.


2026-01-02 CET
16:42:06 CETDokument skickades till Per Olof Göransson, .
2026-01-02 CET
16:45:27 CETJonas Halvarsson har visat dokumentet 1 gång.
2026-01-02 CET
16:45:47 CETDokumentet undertecknades av Jonas Halvarsson.
2026-01-02 CET
19:23:18 CETPer Olof Göransson har visat dokumentet 2 gånger.
2026-01-02 CET
19:32:23 CETDokumentet undertecknades av Per Olof Göransson.
2026-01-03 CET
10:06:55 CETBenjamin Mattsson har visat dokumentet 1 gång.
2026-01-03 CET
10:16:18 CETDokumentet undertecknades av Benjamin Mattsson.
Transaktion 11hbec1mjy38wm4
Signerat av POG, BM, JH.
```

### `exempel 2 projektavtal.pdf`

```text
Grannfrid – Nyckeln till ett tryggare boende    1 AVTAL FÖR BOSOCIAL TJÄNST I SAMBAND MED STAMBYTE Mellan HSB Bostadsrättsförening Toppsockret i Stockholm, org.nr 702002-3532 (nedan ”Beställaren”) och Grannfrid AB, org.nr 559329-7988 (nedan ”Konsulten”) har följande avtal träffats. Avtalet baseras på ABK09 (Allmänna Bestämmelser för Konsultuppdrag inom arkitekt- och ingenjörsverksamhet) i tillämpliga delar. 1. Bakgrund och syfte Beställaren står inför ett stambytesprojekt med planerad byggstart våren 2026. Syftet med det bosociala uppdraget är att skapa trygghet för de boende, avlasta styrelsen och säkerställa en fungerande dialog mellan medlemmar, entreprenör och övriga aktörer under hela processen. 2. Konsultens åtagande Konsulten åtar sig att genomföra bosocialt stöd i tre skeden enligt följande: Skede I – Projektering och förberedelser • Period: Från hösten 2025 fram till entreprenör är utsedd. • Innehåll: Löpande kontakt med boende, hantering av frågor och oro, stöd till styrelsen i kommunikationen. • Arvode: 25 000 kr exkl. moms (engångsbelopp, faktureras i förskott). Skede II – Projekteringsmöten och samverkan • Period: Från entreprenörens godkännande fram till byggstart. • Innehåll: Deltagande på projekteringsmöten, samverkan med entreprenör, socialtjänst, hemtjänst och vården vid behov, fortsatt kontakt med boende. • Arvode: 30 000 kr exkl. moms (engångsbelopp, faktureras i förskott). Skede III – Produktionsfasen • Period: Från första trapphusmöte inför byggstart (planerad april 2026) och under hela byggtiden, uppskattad varaktighet 12 månader (ej juli månad). • Innehåll: o Deltagande på byggmöten, försyner, förbesiktning och låsbyten. o Löpande kontakt med boende. o Hantering av evakueringslägenhet i samråd med styrelsen. o Beställning och administration av tillfälliga toaletter för boende med medicinska behov. • Arvode: 35 000 kr exkl. moms per månad (ej juli månad, faktureras månadsvis i efterskott). Om produktionsfasen överskrider 12 månader löper avtalet vidare med samma månadsarvode tills projektet är avslutat.


Grannfrid – Nyckeln till ett tryggare boende    2 3. Personal Konsulten säkerställer att uppdraget bemannas med erfarna bosociala konsulter med relevant kompetens. Ordinarie arbetstider är vardagar 08.00-17.00, med överenskomna kvällsmöten när projektet kräver det. 4. Tidsplan och avtalstid • Skede I påbörjas hösten 2025. • Skede II beräknas starta under första kvartalet 2026. • Skede III startar i samband med byggstart (planerad april 2026) och löper under hela byggtiden, uppskattad varaktighet 12 månader. • Avtalet gäller från undertecknande till projektets slut. 5. Ersättning och betalning • Samtliga priser är exklusive moms. • Arbetet för Skede I respektive Skede II faktureras i förskott. • Skede III faktureras månadsvis i efterskott. • Betalningsvillkor: 30 dagar netto. • Eventuella merkostnader (t.ex. externa tjänster, hjälpmedel) faktureras separat efter skriftligt godkännande av Beställaren. 6. Ansvar och försäkring • Konsultens ansvar regleras av ABK09 kap. 5 i tillämpliga delar. • Konsulten innehar konsultansvarsförsäkring. Ansvarsbegränsning • Konsultens ansvar är begränsat till ett belopp motsvarande tolv (12) månaders arvode. • Konsulten ansvarar inte för indirekta skador eller följdskador, såsom utebliven vinst eller intäkt. 7. Sekretess och GDPR • Konsulten åtar sig att behandla all information med sekretess och i enlighet med gällande dataskyddslagstiftning. • Ett separat personuppgiftsbiträdesavtal (PUB-avtal) ska upprättas mellan parterna innan uppdragets start. • Sekretesskyldigheten gäller även efter avtalets upphörande.  8. Force majeure Part befrias från sina förpliktelser enligt avtalet om fullgörandet hindras av omständigheter utanför partens kontroll, såsom arbetskonflikt, myndighetsbeslut, krig, pandemi eller


Grannfrid – Nyckeln till ett tryggare boende    3 liknande händelser. Part som åberopar force majeure ska utan dröjsmål skriftligen informera den andra parten. 9. Uppsägning Avtalet kan sägas upp av Beställaren med tre (3) månaders uppsägningstid. Efter den 12:e månaden i Skede III löper avtalet månad för månad och kan sägas upp med en (1) månads uppsägningstid. Vid uppsägning under pågående månad i Skede III faktureras innevarande månad i sin helhet. 10. Tvistelösning Tvist som uppstår i anledning av detta avtal ska i första hand lösas genom förhandling. Om parterna inte enas avgörs tvisten enligt ABK09 kap. 9. 11. Underskrifter Detta avtal har upprättats i två (2) likalydande exemplar, varav parterna tagit var sitt. 14.1 Detta avtal är elektroniskt signerat och är lika bindande som en fysisk originalunderskrift.
```

### `standardavtalPUB.pdf`

```text
Grannfrid AB – 031-7070333 – www.grannfrid.se - info@grannfrid.se    1/6
 PERSONUPPGIFTSBITRÄDESAVTAL    Mellan E Bergqvist db c/o Kjellberg och Möller AB med organisationsnummer 157222-0935 (hädanefter under benämningen Personuppgiftsansvarig) och Grannfrid AB med organisationsnummer 559329-7988 (hädanefter under benämningen Personuppgiftsbiträde) och gemensamt benämnda Parterna har följande Avtal träffats. 1 Definitioner 1.1 Med Personuppgiftsansvarig avses den som ensam eller tillsammans med andra bestämmer ändamålen med och medlen för behandling av personuppgifter. 1.2 Med Personuppgiftsbiträde avses den som behandlar personuppgifter för den Personuppgiftsansvariges räkning. 1.3 Med behandling avses varje åtgärd eller kombination av åtgärder som vidtas i fråga om personuppgifter, oberoende av om de utförs automatiserat eller ej, såsom insamling, registrering, organisering, strukturering, lagring, bearbetning eller ändring, framtagning, läsning, användning, utlämning genom överföring, spridning eller tillhandahållande på annat sätt, justering eller sammanförande, begränsning, radering eller förstöring. 1.4 Med Personuppgift avses varje upplysning som avser en identifierad eller identifierbar fysisk person, varvid en identifierbar fysisk person är en person som direkt eller indirekt kan identifieras särskilt med hänvisning till en identifierare som ett namn, ett identifikationsnummer, en lokaliseringsuppgift eller online-identifikatorer eller en eller flera faktorer som är specifika för den fysiska personens fysiska, fysiologiska, genetiska, psykiska, ekonomiska, kulturella eller sociala identitet. 1.5 Med Personuppgiftsincident avses en säkerhetsincident som leder till oavsiktlig eller olaglig förstöring, förlust eller ändring eller till obehörigt röjande av eller obehörig åtkomst till de personuppgifter som överförts, lagrats eller på annat sätt behandlats. 1.6 Med Tillämpliga bestämmelser avses bestämmelser och praxis hänförlig till Dataskyddsförordningen, nationell kompletteringslagstiftning till Dataskyddsförordningen, tillsynsmyndigheters inkl. Europeiska dataskyddsstyrelsens föreskrifter och yttranden och kommissionens rättsakter på personuppgiftsområdet. 1.7 Med Underbiträde avses den som behandlar personuppgifter enligt instruktioner av Personuppgiftsbiträdet. 2 Bakgrund, syfte och tillämplighet 2.1 Detta Personuppgiftsbiträdesavtal är en del av ett huvudavtal om bosociala tjänster som ingåtts mellan den Personuppgiftsansvarige och Personuppgiftsbiträdet och ska läsas och förstås mot bakgrund av detta. 2.2 Grannfrid AB erbjuder bosociala tjänster. Tjänsterna innefattar att bistå vid störningsärenden, utredningar kring olovlig andrahandsuthyrning och i andra bosociala ärenden med koppling till boendet. Detta kan ske på uppdrag av bostadsrättsföreningar eller


Grannfrid AB – 031-7070333 – www.grannfrid.se - info@grannfrid.se    2/6
fastighetsägare med hyresrätter. Grannfrid AB:s syfte är att hjälpa medlemmar och hyresgäster att hitta lösningar för att de ska kunna bibehålla ett fungerande kvarboende samt att säkerställa att anmälda störningsärenden hanteras utifrån de krav som finns i bostadsrättslagen alternativt hyresrättslagen. Vidare arbetar Grannfrid AB för att utreda olovlig uthyrning av lägenheter för att minska oriktiga hyresförhållanden i fastighetsbeståndet. 2.3 Målet med Grannfrid AB:s hantering av ärenden är att hitta lösningar så att ett fungerande kvarboende görs möjligt för alla involverade parter. Vidare är målet även att ärenden, i den mån det går, inte ska behöva leda till en juridisk process. 2.4 I samband med att personal på Grannfrid AB hanterar ärenden som inkommer behöver vissa personuppgifter behandlas gällande de boende som ärendet berör. 2.5 Syftet med detta Avtal är att säkerställa att all behandling av personuppgifter som görs av Personuppgiftsbiträdet följer de regler som Tillämpliga bestämmelser kräver. 3 Typ och kategorier av personuppgifter 3.1 Personuppgiftsbiträdet kommer vid behov med anledning av Avtalet att behandla olika typer av personuppgifter och hantera information om olika kategorier av registrerade individer. Exempel på sådana personuppgifter och registrerade kategorier kan inkludera: - Identifikationsuppgifter: Namn, personnummer, adress, telefonnummer, e-postadress. - Ekonomiska uppgifter: Medlemsavgifter, ekonomiska transaktioner. - Familjeförhållanden: Information om familjemedlemmar eller andra boende i samma enhet. - Hälsoinformation: Om det krävs för att tillhandahålla särskilt stöd eller anpassningar för boende. - Kommunikationsuppgifter: Korrespondens och kommunikation med de registrerade. 3.2 Kategorier av registrerade: - Bostadsrättsföreningens medlemmar: Personer som äger eller bor i bostadsrättsenheter. - Anställda: Om bolaget har anställd personal som är registrerad för arbetsrelaterade ändamål. - Leverantörer och partners: Personer och organisationer som bolaget samarbetar med för att tillhandahålla tjänster. 3.3 Särskilda kategorier av personuppgifter: - Känsliga uppgifter, såsom hälsouppgifter, kan komma att behandlas för att erbjuda anpassat stöd. 3.4 Övriga uppgifter: - Bilder, ljud- och videoinspelningar kan behöva behandlas vid behov. 4 Den personuppgiftsansvariges skyldigheter 4.1 Den Personuppgiftsansvarige ansvarar för att Behandlingen av personuppgifter sker i enlighet med Avtalet och Tillämpliga bestämmelser, exempelvis att det finns rättslig grund för de Behandlingar som Personuppgiftsbiträdet ska utföra enligt Avtalet. 4.2 Tillhandahållande av personuppgifter: Den Personuppgiftsansvarige ska tillhandahålla Personuppgiftsbiträdet med den information och de personuppgifter som behövs och är ändamålsenliga för att denne ska kunna fullgöra sina skyldigheter enligt


Grannfrid AB – 031-7070333 – www.grannfrid.se - info@grannfrid.se    3/6
Avtalet och Tillämpliga bestämmelser. Detta personuppgiftsbiträdesavtal med tillhörande bilagor utgör den Personuppgiftsansvariges skriftliga instruktioner till Personuppgiftsbiträdet. 4.3 Korrekta uppgifter: Den Personuppgiftsansvarige åtar sig att skyndsamt informera Personuppgiftsbiträdet om förändringar i Behandlingen, vilka påverkar eller kan komma att påverka Personuppgiftsbiträdets skyldigheter enligt Avtalet och Tillämpliga bestämmelser.  Den Personuppgiftsansvarige ska omedelbart lämna Personuppgiftsbiträdet korrekta uppgifter i händelse av att de dokumenterade instruktionerna är felaktiga, ofullständiga eller i övrigt behöver förändras.  Den Personuppgiftsansvarige ansvarar för att de säkerhetsåtgärder som vidtagits i den egna verksamheten och som avser de Behandlingar som omfattas av Avtalet lever upp till de krav som ställs enligt Tillämpliga bestämmelser. 5 Personuppgiftsbiträdets ansvarsområden 5.1 Behandling, lagring och överföring: Personuppgiftsbiträdet ska endast behandla personuppgifter för Personuppgiftsansvariges räkning enligt Avtalet, den Personuppgiftsansvariges instruktioner och Tillämpliga bestämmelser. Behandlingen är begränsad till de syften och den omfattning som anges, och Personuppgiftsbiträdet får inte utan Personuppgiftsansvariges skriftliga samtycke, föreläggande från tillsynsmyndighet eller tvingande lagstiftning:  - samla in eller lämna ut personuppgifter från eller till tredje part, - ändra metod för behandling, - kopiera eller återskapa personuppgifter, eller - behandla personuppgifter för andra ändamål än de dokumenterade instruktionerna.  Avtalet med tillhörande bilagor utgör den Personuppgiftsansvariges instruktioner, med undantag för skriftliga instruktioner som tillhandahålls under avtalstiden. Förändringar ska överenskommas skriftligen.  Personuppgiftsbiträdet ska säkerställa lagringsminimering och gallra personuppgifter som inte längre behövs, med rutiner för hur och när gallring sker. Överföring av personuppgifter till stater utanför EU/EES eller till stater utan tillräckliga skyddsåtgärder är förbjuden utan Personuppgiftsansvariges skriftliga samtycke. 5.2 Säkerhetsåtgärder: Med beaktande av den senaste utvecklingen, genomförandekostnaderna och behandlingens art, omfattning, sammanhang och ändamål samt riskerna för fysiska personers rättigheter och friheter, ska Personuppgiftsbiträdet vidta lämpliga tekniska och organisatoriska åtgärder för att säkerställa en säkerhetsnivå som är lämplig i förhållande till risken. Detta inkluderar:  - pseudonymisering och kryptering av personuppgifter, - fortlöpande säkerställande av konfidentialitet, integritet, tillgänglighet och motståndskraft i behandlingsystem, - förmåga att återställa tillgång till personuppgifter vid incidenter, - regelbunden testning och utvärdering av säkerhetsåtgärder.  Personuppgiftsbiträdet ska säkerställa att personal och underbiträden endast behandlar personuppgifter enligt Personuppgiftsansvariges instruktioner, med bindande skriftliga avtal för underbiträden. 5.3 Incidenthantering: Vid en misstänkt eller upptäckt personuppgiftsincident ska Personuppgiftsbiträdet skyndsamt undersöka och vidta åtgärder för att mildra effekterna. Personuppgiftsbiträdet ska underrätta Personuppgiftsansvarige inom 48 timmar, med en beskrivning som innehåller:  - incidentens art, inklusive kategorier och antal berörda registrerade och personuppgiftsposter,


Grannfrid AB – 031-7070333 – www.grannfrid.se - info@grannfrid.se    4/6
- kontaktuppgifter för mer information, - sannolika konsekvenser, - åtgärder för att åtgärda incidenten och mildra effekter.  Information kan ges i omgångar om det inte är möjligt samtidigt. Vid force majeure (t.ex. naturkatastrofer, IT-haveri) kan tidsfristen förlängas proportionellt, med omedelbar underrättelse till Personuppgiftsansvarige. 5.4 Revision och efterlevnad: Personuppgiftsbiträdet ska ge Personuppgiftsansvarige tillgång till information för att visa efterlevnad av Avtalet och Tillämpliga bestämmelser, inklusive en skriftlig förteckning över behandlingskategorier (namn, kontaktuppgifter, behandlingstyper, eventuella tredjelandsöverföringar, och säkerhetsåtgärder).  Revisioner får genomföras högst en (1) gång per kalenderår, eller vid särskilda omständigheter, med begäran minst tre (3) månader i förväg och specificering av omfattning. Externa revisorer ska godkännas skriftligen av Personuppgiftsbiträdet. Kostnader debiteras Personuppgiftsansvarige enligt Personuppgiftsbiträdets prislista. Inspektion sker endast om dokumentation inte räcker, med minimal störning av Personuppgiftsbiträdets verksamhet. All insamlad information raderas när den inte längre behövs, och revisorer ska följa säkerhetsbestämmelser.  Personuppgiftsbiträdet ska ge assistans vid granskningar och tillhandahålla personuppgifter inom 15 dagar på skriftlig begäran. Personuppgiftsbiträdet ska utvärdera risker och vidta åtgärder för att minska dem, samt säkerställa att personal har tillräcklig kunskap. 5.5 Utlämnande och ändringar: Personuppgiftsbiträdet får inte lämna ut personuppgifter utan Personuppgiftsansvariges medgivande, utom vid föreläggande från tillsynsmyndighet eller tvingande lag. Vid planerade förändringar i behandlingen som påverkar säkerhet eller efterlevnad ska Personuppgiftsansvarige underrättas skriftligen i förväg och ge samtycke.  Personuppgiftsbiträdet ska behandla personuppgifter och relaterad information enligt sekretesslagstiftning och Tillämpliga bestämmelser, med ändamålsenliga sekretessåtaganden för personal. Sekretess gäller även efter avtalets upphörande. 5.6 Dataskyddskontakt: Personuppgiftsbiträdet, Grannfrid AB, ansvarar för all behandling av personuppgifter enligt detta Avtal. För dataskyddsrelaterade frågor ska Personuppgiftsansvarige kontakta Personuppgiftsbiträdet via e-post: jonas@grannfrid.se, vilken fungerar som primär kontaktpunkt i enlighet med Tillämpliga bestämmelser. 6 Underbiträden 6.1 Personuppgiftsbiträdet får anlita underbiträden efter skriftlig underrättelse till Personuppgiftsansvarige, med information om namn, organisationsnummer, tjänster och land. Personuppgiftsansvarige har 10 arbetsdagar att invända med sakliga skäl. Vid invändning ska Personuppgiftsbiträdet avstå, föreslå alternativ eller åtgärda problem och inhämta nytt godkännande. Personuppgiftsbiträdet är ensam avtalspart med underbiträden, ansvarar för deras handlingar, och ska på begäran tillhandahålla en förteckning över underbiträden. 7 Ansvar för skada 7.1 Personuppgiftsbiträdets ansvar: Personuppgiftsbiträdet ansvarar för skada från behandling endast om det inte fullgjort skyldigheter enligt Tillämpliga bestämmelser eller agerat utanför Avtalet. Ansvaret är begränsat till ett års avtalsvärde, utom vid uppsåt eller grov vårdslöshet, och omfattar inte indirekta skador. Personuppgiftsbiträdet undgår ansvar om det visar att det inte orsakat skadan.


Grannfrid AB – 031-7070333 – www.grannfrid.se - info@grannfrid.se    5/6
7.2 Personuppgiftsansvariges ansvar: Personuppgiftsansvarige ersätter Personuppgiftsbiträdet för anspråk grundade i felaktiga instruktioner, inklusive rättegångskostnader. 7.3 Skadeståndskrav: Skadeståndskrav ska framställas inom sex (6) månader från fastställelse. 8 Avtalets varaktighet 8.1 Avtalet gäller från undertecknandet och under den tid Personuppgiftsbiträdet behandlar personuppgifter enligt Personuppgiftsansvariges instruktioner, dvs. så länge som Grannfrid AB och Personuppgiftsansvarige har ett pågående uppdrag. 9 Förändring av avtalet 9.1 Förändringar för efterlevnad: Personuppgiftsansvarige får ändra Avtalet endast för att efterleva Tillämpliga bestämmelser. 9.2 Skriftliga ändringar: Tillägg och ändringar ska vara skriftliga och undertecknade av Parterna. 9.3 Rätt till omförhandling: Parterna har rätt att påkalla omförhandling om lagstiftning ändras och påverkar personuppgiftsbehandling. 9.4 Utökning av behandlingar: Nya behandlingstyper kräver Personuppgiftsbiträdets samtycke. 9.5 Ändringar börjar gälla: Ändringar träder i kraft 30 dagar efter underrättelse. 10 Återlämnande eller radering av personuppgifter 10.1 Hantering av data efter uppdragets slutförande: Efter avslutad behandling ska Personuppgiftsbiträdet återlämna personuppgifter, om inte lag kräver lagring, inom rimlig tid och i ett läsbart format. 10.2 Praktiska rutiner för dataradering: Personuppgiftsbiträdet får behålla personuppgifter upp till sex (6) månader efter ärendets avslutande. Radering sker enligt:  - Aktiva databaser och arbetsdokument inom sex (6) månader. - Backups senast 12 månader efter avslutat uppdrag. - Fysiska kopior förstörs säkert.  Personuppgiftsbiträdet ska på begäran intyga radering.


Grannfrid AB – 031-7070333 – www.grannfrid.se - info@grannfrid.se    6/6
11 Underrättelser 11.1 Form för underrättelser: Underrättelser ska ske skriftligen. 11.2 Kontaktpersoner: Underrättelser ställs till överenskomna kontaktpersoner. 12 Lagval 12.1 Avtalet regleras av svensk rätt. 13 Tvist 13.1 Lösning genom samråd: Tvister avgörs i första hand genom samråd. 13.2 Avgörande i domstol: Om samråd misslyckas avgörs tvister av svensk domstol, om inte annan jurisdiktion har behörighet. 14 Övrigt 14.1 Detta avtal är elektroniskt signerat och är lika bindande som en fysisk originalunderskrift.
```
