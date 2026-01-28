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
