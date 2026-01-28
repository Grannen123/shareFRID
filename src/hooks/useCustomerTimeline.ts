import { useQuery } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export type CustomerTimelineType = "assignment" | "note" | "task" | "file";

export interface CustomerTimelineItem {
  id: string;
  type: CustomerTimelineType;
  title: string;
  description?: string | null;
  date: string;
  status?: string | null;
}

export function useCustomerTimeline(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.timeline(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [] as CustomerTimelineItem[];

      const [assignmentsResult, notesResult, tasksResult, filesResult] =
        await Promise.all([
          withTimeout(
            supabase
              .from("assignments")
              .select("id, title, assignment_number, status, created_at")
              .eq("customer_id", customerId),
          ),
          withTimeout(
            supabase
              .from("customer_notes")
              .select("id, content, created_at")
              .eq("customer_id", customerId),
          ),
          withTimeout(
            supabase
              .from("tasks")
              .select("id, title, status, due_date, created_at")
              .eq("customer_id", customerId),
          ),
          withTimeout(
            supabase
              .from("files")
              .select("id, file_name, mime_type, created_at")
              .eq("customer_id", customerId),
          ),
        ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (notesResult.error) throw notesResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (filesResult.error) throw filesResult.error;

      const assignments = (assignmentsResult.data || []).map((assignment) => ({
        id: assignment.id,
        type: "assignment" as const,
        title: assignment.title,
        description: assignment.assignment_number || null,
        status: assignment.status,
        date: assignment.created_at,
      }));

      const notes = (notesResult.data || []).map((note) => ({
        id: note.id,
        type: "note" as const,
        title: "Anteckning",
        description: note.content,
        date: note.created_at,
      }));

      const tasks = (tasksResult.data || []).map((task) => ({
        id: task.id,
        type: "task" as const,
        title: task.title,
        description: task.due_date ? `Förfallodatum: ${task.due_date}` : null,
        status: task.status,
        date: task.created_at,
      }));

      const files = (filesResult.data || []).map((file) => ({
        id: file.id,
        type: "file" as const,
        title: file.file_name,
        description: file.mime_type || null,
        date: file.created_at,
      }));

      return [...assignments, ...notes, ...tasks, ...files].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    },
    enabled: !!customerId,
  });
}
