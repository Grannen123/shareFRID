import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { JournalEntry, QuickNote } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useQuickNotes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.quickNotes.all,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("quick_notes")
          .select("*")
          .eq("created_by", user.id)
          .eq("is_processed", false)
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as QuickNote[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateQuickNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("Ingen inloggad användare");

      const { data, error } = await withTimeout(
        supabase
          .from("quick_notes")
          .insert({
            content,
            created_by: user.id,
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return data as QuickNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quickNotes.all });
      toast.success("Anteckning sparad i anteckningsboken!");
    },
    onError: (error) => {
      console.error("Create quick note error:", error);
      toast.error("Kunde inte spara anteckning: " + error.message);
    },
  });
}

export function useDeleteQuickNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from("quick_notes").delete().eq("id", id),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quickNotes.all });
      toast.success("Anteckning borttagen");
    },
    onError: (error) => {
      console.error("Delete quick note error:", error);
      toast.error("Kunde inte ta bort anteckning: " + error.message);
    },
  });
}

export function useLinkQuickNoteToCustomer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      noteId: string;
      customerId: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("Ingen inloggad användare");

      const { data: customerNote, error: noteError } = await withTimeout(
        supabase
          .from("customer_notes")
          .insert({
            customer_id: data.customerId,
            content: data.content,
            is_pinned: false,
            created_by: user.id,
          })
          .select()
          .single(),
      );
      if (noteError) throw noteError;

      const { error: updateError } = await withTimeout(
        supabase
          .from("quick_notes")
          .update({
            is_processed: true,
            customer_id: data.customerId,
          })
          .eq("id", data.noteId)
          .select()
          .single(),
      );
      if (updateError) throw updateError;

      return customerNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quickNotes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerNotes.byCustomer(variables.customerId),
      });
      toast.success("Anteckningen kopplades till kund");
    },
    onError: (error) => {
      console.error("Link quick note to customer error:", error);
      toast.error("Kunde inte koppla till kund: " + error.message);
    },
  });
}

export function useLinkQuickNoteToAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      noteId: string;
      assignmentId: string;
      content: string;
      createdAt?: string;
    }) => {
      if (!user?.id) throw new Error("Ingen inloggad användare");

      const { data: journalEntry, error: journalError } = await withTimeout(
        supabase
          .from("journal_entries")
          .insert({
            assignment_id: data.assignmentId,
            content: data.content,
            content_type: "text",
            entry_type: "note",
            is_extra_billable: false,
            created_by: user.id,
            ...(data.createdAt ? { created_at: data.createdAt } : {}),
          })
          .select()
          .single(),
      );
      if (journalError) throw journalError;

      const { error: updateError } = await withTimeout(
        supabase
          .from("quick_notes")
          .update({
            is_processed: true,
            assignment_id: data.assignmentId,
            processed_journal_id: (journalEntry as JournalEntry).id,
          })
          .eq("id", data.noteId)
          .select()
          .single(),
      );
      if (updateError) throw updateError;

      return journalEntry as JournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quickNotes.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.byAssignment(variables.assignmentId),
      });
      toast.success("Anteckningen kopplades till uppdrag");
    },
    onError: (error) => {
      console.error("Link quick note to assignment error:", error);
      toast.error("Kunde inte koppla till uppdrag: " + error.message);
    },
  });
}
