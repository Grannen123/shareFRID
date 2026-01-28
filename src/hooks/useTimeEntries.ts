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
      const { error } = await withTimeout(
        supabase
          .from("time_entries")
          .update({ is_exported: true })
          .in("id", entryIds),
      );

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
