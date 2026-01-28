import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Task, TaskWithRelations, TaskStatus } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hämtar alla uppgifter med relationer till kund och uppdrag.
 * Sorteras efter förfallodatum, prioritet och skapad-datum.
 */
export function useTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("tasks")
          .select(
            `
          *,
          customer:customers(*),
          assignment:assignments(*)
        `,
          )
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as TaskWithRelations[];
    },
    enabled: !!user,
  });
}

/**
 * Hämtar uppgifter tilldelade till inloggad användare samt otilldelade uppgifter.
 * Filtrerar bort slutförda uppgifter (status !== 'done').
 */
export function useMyTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.tasks.byAssignee(user?.id || ""),
    queryFn: async () => {
      if (!user?.id) return [];

      // Hämta uppgifter tilldelade till användaren ELLER otilldelade uppgifter
      const { data, error } = await withTimeout(
        supabase
          .from("tasks")
          .select(
            `
          *,
          customer:customers(*),
          assignment:assignments(*)
        `,
          )
          .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: false }),
      );

      if (error) throw error;
      return data as TaskWithRelations[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hämtar alla uppgifter för en specifik kund.
 * Inkluderar assignee-information via separat profiles-hämtning.
 * @param customerId - Kundens UUID, eller undefined för att inaktivera queryn
 */
export function useTasksByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("tasks")
          .select(
            `
            *,
            assignment:assignments(id, title, assignment_number)
          `,
          )
          .eq("customer_id", customerId)
          .order("status", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: false }),
      );

      if (error) throw error;

      const assigneeIds = Array.from(
        new Set((data || []).map((task) => task.assigned_to).filter(Boolean)),
      ) as string[];

      let assigneeMap = new Map<string, { id: string; name: string }>();
      if (assigneeIds.length > 0) {
        const { data: profiles, error: profileError } = await withTimeout(
          supabase.from("profiles").select("id, name").in("id", assigneeIds),
        );

        if (profileError) {
          console.error("Kunde inte hämta assignees:", profileError);
        } else {
          assigneeMap = new Map(
            (profiles || []).map((profile) => [profile.id, profile]),
          );
        }
      }

      return (data || []).map((task) => ({
        ...task,
        assignee: assigneeMap.get(task.assigned_to || "") || null,
      })) as TaskWithRelations[];
    },
    enabled: !!customerId,
  });
}

/**
 * Hämtar alla uppgifter för ett specifikt uppdrag.
 * @param assignmentId - Uppdragets UUID, eller undefined för att inaktivera queryn
 */
export function useTasksByAssignment(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.byAssignment(assignmentId || ""),
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("tasks")
          .select("*")
          .eq("assignment_id", assignmentId)
          .order("status", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("priority", { ascending: false }),
      );

      if (error) throw error;

      const assigneeIds = Array.from(
        new Set((data || []).map((task) => task.assigned_to).filter(Boolean)),
      ) as string[];

      let assigneeMap = new Map<string, { id: string; name: string }>();
      if (assigneeIds.length > 0) {
        const { data: profiles, error: profileError } = await withTimeout(
          supabase.from("profiles").select("id, name").in("id", assigneeIds),
        );

        if (profileError) {
          console.error("Kunde inte hämta assignees:", profileError);
        } else {
          assigneeMap = new Map(
            (profiles || []).map((profile) => [profile.id, profile]),
          );
        }
      }

      return (data || []).map((task) => ({
        ...task,
        assignee: assigneeMap.get(task.assigned_to || "") || null,
      })) as TaskWithRelations[];
    },
    enabled: !!assignmentId,
  });
}

export interface CreateTaskData {
  title: string;
  description?: string;
  customer_id?: string;
  assignment_id?: string;
  due_date?: string;
  priority?: "low" | "medium" | "high";
  assigned_to?: string;
}

/**
 * Mutation för att skapa en ny uppgift.
 * Invaliderar relevant cache baserat på kund/uppdrag/assignee.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const { data: task, error } = await withTimeout(
        supabase
          .from("tasks")
          .insert({
            ...data,
            created_by: user?.id,
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return task as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
        exact: false,
      });
      if (variables.customer_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.byCustomer(variables.customer_id),
        });
      }
      if (variables.assignment_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.byAssignment(variables.assignment_id),
        });
      }
      if (variables.assigned_to) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.byAssignee(variables.assigned_to),
        });
      }
      toast.success("Uppgift skapad!");
    },
    onError: (error) => {
      console.error("Create task error:", error);
      toast.error("Kunde inte skapa uppgift: " + error.message);
    },
  });
}

export interface UpdateTaskData {
  id: string;
  title?: string;
  description?: string;
  customer_id?: string | null;
  assignment_id?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
  status?: TaskStatus;
  assigned_to?: string | null;
}

/**
 * Mutation för att uppdatera en uppgift.
 * Sätter automatiskt completed_at när status ändras till 'done'.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTaskData) => {
      const updateData: Record<string, unknown> = { ...data };

      // Set completed_at when task is marked as done
      if (data.status === "done") {
        updateData.completed_at = new Date().toISOString();
      } else if (data.status) {
        updateData.completed_at = null;
      }

      const { data: task, error } = await withTimeout(
        supabase
          .from("tasks")
          .update(updateData)
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return task as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
        exact: false,
      });
      toast.success("Uppgift uppdaterad!");
    },
    onError: (error) => {
      console.error("Update task error:", error);
      toast.error("Kunde inte uppdatera uppgift: " + error.message);
    },
  });
}

/**
 * Mutation för att ta bort en uppgift permanent.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from("tasks").delete().eq("id", id),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
        exact: false,
      });
      toast.success("Uppgift borttagen!");
    },
    onError: (error) => {
      console.error("Delete task error:", error);
      toast.error("Kunde inte ta bort uppgift: " + error.message);
    },
  });
}

/**
 * Mutation för att växla status på en uppgift (med optimistic update).
 * Uppdaterar UI direkt utan att vänta på server-svar, med rollback vid fel.
 */
export function useToggleTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const updateData: Record<string, unknown> = { status };

      if (status === "done") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { data: task, error } = await withTimeout(
        supabase
          .from("tasks")
          .update(updateData)
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return task as Task;
    },
    // Optimistic update - uppdatera UI direkt utan att vänta på servern
    onMutate: async ({ id, status }) => {
      // Avbryt pågående hämtningar så de inte skriver över vår optimistiska uppdatering
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      // Spara tidigare state för rollback
      const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(
        queryKeys.tasks.all,
      );

      // Optimistisk uppdatering
      queryClient.setQueryData<TaskWithRelations[]>(
        queryKeys.tasks.all,
        (old) =>
          old?.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status,
                  completed_at:
                    status === "done" ? new Date().toISOString() : null,
                }
              : task,
          ),
      );

      return { previousTasks };
    },
    onError: (error, _, context) => {
      // Rollback vid fel
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks);
      }
      console.error("Toggle task status error:", error);
      toast.error("Kunde inte ändra status: " + error.message);
    },
    onSettled: () => {
      // Synka med servern efter mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
        exact: false,
      });
    },
  });
}
