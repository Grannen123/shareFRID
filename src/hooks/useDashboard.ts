import { useQuery } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  activeCustomers: number;
  activeAssignments: number;
  pendingTasks: number;
  upcomingIndexations: number;
  hoursThisMonth: number;
  unbilledHours: number;
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      // Använd RPC-funktionen för att hämta all dashboard-statistik i ett anrop
      const { data, error } = await withTimeout(
        supabase.rpc("get_dashboard_stats"),
      );

      if (error) {
        // Fallback till parallella queries om RPC inte finns ännu
        console.warn(
          "RPC get_dashboard_stats saknas, använder fallback:",
          error.message,
        );
        return await fetchDashboardStatsFallback();
      }

      const row = Array.isArray(data) ? data[0] : data;

      return {
        activeCustomers: Number(row?.active_customers_count) || 0,
        activeAssignments: Number(row?.active_assignments_count) || 0,
        pendingTasks: Number(row?.pending_tasks_count) || 0,
        upcomingIndexations: Number(row?.upcoming_indexations_count) || 0,
        hoursThisMonth: Number(row?.hours_this_month_total) || 0,
        unbilledHours: Number(row?.unbilled_hours_total) || 0,
      };
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
}

// Fallback om RPC-funktionen inte finns i databasen ännu
async function fetchDashboardStatsFallback(): Promise<DashboardStats> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    customersResult,
    assignmentsResult,
    tasksResult,
    indexationsResult,
    hoursResult,
    unbilledResult,
  ] = await Promise.all([
    withTimeout(
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
    ),
    withTimeout(
      supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "pending"]),
    ),
    withTimeout(
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "done"),
    ),
    withTimeout(
      supabase
        .from("agreements")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .lte("next_indexation", thirtyDaysFromNow.toISOString().split("T")[0]),
    ),
    withTimeout(
      supabase
        .from("time_entries")
        .select("hours")
        .gte("date", firstOfMonth.toISOString().split("T")[0])
        .lte("date", lastOfMonth.toISOString().split("T")[0]),
    ),
    withTimeout(
      supabase
        .from("time_entries")
        .select("hours")
        .eq("is_exported", false)
        .eq("is_billable", true),
    ),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (indexationsResult.error) throw indexationsResult.error;
  if (hoursResult.error) throw hoursResult.error;
  if (unbilledResult.error) throw unbilledResult.error;

  const hoursThisMonth =
    hoursResult.data?.reduce((sum, entry) => sum + Number(entry.hours), 0) || 0;
  const unbilledHours =
    unbilledResult.data?.reduce((sum, entry) => sum + Number(entry.hours), 0) ||
    0;

  return {
    activeCustomers: customersResult.count || 0,
    activeAssignments: assignmentsResult.count || 0,
    pendingTasks: tasksResult.count || 0,
    upcomingIndexations: indexationsResult.count || 0,
    hoursThisMonth,
    unbilledHours,
  };
}

export interface IndexationAlert {
  id: string;
  customerName: string;
  customerId: string;
  nextIndexation: string;
  daysUntil: number;
}

export function useIndexationAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "indexationAlerts"],
    queryFn: async (): Promise<IndexationAlert[]> => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select(
            `
          id,
          next_indexation,
          customer:customers(id, name)
        `,
          )
          .eq("status", "active")
          .not("next_indexation", "is", null)
          .lte("next_indexation", sevenDaysFromNow.toISOString().split("T")[0])
          .order("next_indexation", { ascending: true }),
      );

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return (data || []).map((agreement) => {
        const customer = agreement.customer as unknown as {
          id: string;
          name: string;
        } | null;
        const indexDate = new Date(agreement.next_indexation as string);
        const diffTime = indexDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: agreement.id,
          customerName: customer?.name || "Okänd kund",
          customerId: customer?.id || "",
          nextIndexation: agreement.next_indexation as string,
          daysUntil,
        };
      });
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });
}

export interface RecentActivity {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, unknown> | null;
  performedBy: string;
  performedAt: string;
  performer?: {
    full_name: string;
  };
  title?: string;
}

export function useRecentActivity(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", "activity", limit],
    queryFn: async (): Promise<RecentActivity[]> => {
      // Hämta aktiviteter från olika tabeller istället för activity_log
      // (som inte har automatiska triggers)

      // Kör alla data-queries parallellt
      const [journalResult, tasksResult, timeEntriesResult] = await Promise.all(
        [
          withTimeout(
            supabase
              .from("journal_entries")
              .select(
                `
              id,
              created_at,
              created_by,
              content,
              assignment:assignments(title)
            `,
              )
              .eq("is_archived", false)
              .order("created_at", { ascending: false })
              .limit(5),
          ),
          withTimeout(
            supabase
              .from("tasks")
              .select(
                `
              id,
              created_at,
              updated_at,
              created_by,
              title,
              status,
              completed_at
            `,
              )
              .order("updated_at", { ascending: false })
              .limit(5),
          ),
          withTimeout(
            supabase
              .from("time_entries")
              .select(
                `
              id,
              created_at,
              created_by,
              hours,
              description,
              customer:customers(name)
            `,
              )
              .order("created_at", { ascending: false })
              .limit(5),
          ),
        ],
      );

      const journalEntries = journalResult.data;
      const tasks = tasksResult.data;
      const timeEntries = timeEntriesResult.data;

      // Samla alla author IDs
      const authorIds = new Set<string>();
      (journalEntries || []).forEach((entry) => {
        if (entry.created_by) authorIds.add(entry.created_by);
      });
      (tasks || []).forEach((task) => {
        if (task.created_by) authorIds.add(task.created_by);
      });
      (timeEntries || []).forEach((entry) => {
        if (entry.created_by) authorIds.add(entry.created_by);
      });

      // Hämta profiler för alla authors
      let performerMap = new Map<string, { id: string; name: string }>();
      const authorList = Array.from(authorIds);
      if (authorList.length > 0) {
        const { data: profiles, error: profileError } = await withTimeout(
          supabase.from("profiles").select("id, name").in("id", authorList),
        );

        if (profileError) {
          console.error(
            "Kunde inte hämta användare för activity feed:",
            profileError,
          );
        } else {
          performerMap = new Map(
            (profiles || []).map((profile) => [profile.id, profile]),
          );
        }
      }

      const activities: RecentActivity[] = [];

      if (journalEntries) {
        for (const entry of journalEntries) {
          const performerName =
            performerMap.get(entry.created_by || "")?.name || "Okänd användare";
          const assignmentData = entry.assignment as unknown;
          const assignment = Array.isArray(assignmentData)
            ? (assignmentData[0] as { title: string } | undefined)
            : (assignmentData as { title: string } | null);
          activities.push({
            id: `journal-${entry.id}`,
            entityType: "journal_entry",
            entityId: entry.id,
            action: "created",
            changes: null,
            performedBy: entry.created_by || "",
            performedAt: entry.created_at,
            performer: { full_name: performerName },
            title: assignment?.title || "journalanteckning",
          });
        }
      }

      if (tasks) {
        for (const task of tasks) {
          const performerName =
            performerMap.get(task.created_by || "")?.name || "Okänd användare";
          const action = task.status === "done" ? "completed" : "created";
          const performedAt =
            task.status === "done" && task.completed_at
              ? task.completed_at
              : task.created_at;

          activities.push({
            id: `task-${task.id}`,
            entityType: "task",
            entityId: task.id,
            action,
            changes: null,
            performedBy: task.created_by || "",
            performedAt,
            performer: { full_name: performerName },
            title: task.title,
          });
        }
      }

      if (timeEntries) {
        for (const entry of timeEntries) {
          const performerName =
            performerMap.get(entry.created_by || "")?.name || "Okänd användare";
          const customerData = entry.customer as unknown;
          const customer = Array.isArray(customerData)
            ? (customerData[0] as { name: string } | undefined)
            : (customerData as { name: string } | null);
          activities.push({
            id: `time-${entry.id}`,
            entityType: "time_entry",
            entityId: entry.id,
            action: "created",
            changes: null,
            performedBy: entry.created_by || "",
            performedAt: entry.created_at,
            performer: { full_name: performerName },
            title: `${entry.hours}h - ${customer?.name || "Okänd kund"}`,
          });
        }
      }

      // Sortera alla aktiviteter efter datum och begränsa
      return activities
        .sort(
          (a, b) =>
            new Date(b.performedAt).getTime() -
            new Date(a.performedAt).getTime(),
        )
        .slice(0, limit);
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
