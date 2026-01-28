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

interface TimeEntryWithCustomer extends TimeEntry {
  customer?: { id: string; name: string; customer_number: string } | null;
}

interface BillingBatchUpdate {
  status: "draft" | "review" | "exported" | "locked";
  exported_at?: string;
  exported_by?: string;
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

      timeEntries?.forEach((entry: TimeEntryWithCustomer) => {
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
      const { data: batch, error: batchError } = await withTimeout(
        supabase
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
          .single(),
      );

      if (batchError) throw batchError;

      // Uppdatera time entries med batch ID
      const { error: updateError } = await withTimeout(
        supabase
          .from("time_entries")
          .update({ export_batch_id: batch.id })
          .in("id", entryIds),
      );

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
      const updates: BillingBatchUpdate = { status };

      if (status === "exported") {
        updates.exported_at = new Date().toISOString();
        updates.exported_by = user?.id;
      }

      const { data: batch, error } = await withTimeout(
        supabase
          .from("billing_batches")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;

      // Om exported, markera alla time entries
      if (status === "exported") {
        const { error: updateError } = await withTimeout(
          supabase
            .from("time_entries")
            .update({ is_exported: true })
            .eq("export_batch_id", id),
        );

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
