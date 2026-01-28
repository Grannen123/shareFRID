import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { CustomerNoteWithAuthor } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface NoteWithCustomer extends CustomerNoteWithAuthor {
  customer: {
    id: string;
    name: string;
    customer_number: string;
  };
}

export function useAllNotes() {
  return useQuery({
    queryKey: queryKeys.notes.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("customer_notes")
          .select(
            `
            *,
            customer:customers(id, name, customer_number)
          `,
          )
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        10000,
      );

      if (error) throw error;
      return data as NoteWithCustomer[];
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      customer_id: string;
      content: string;
      is_pinned: boolean;
    }) => {
      if (!user?.id) {
        throw new Error("Ingen inloggad användare");
      }

      const { data: note, error } = await withTimeout(
        supabase
          .from("customer_notes")
          .insert({
            ...data,
            created_by: user.id,
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success("Anteckning sparad!");
    },
    onError: (error) => {
      console.error("Create note error:", error);
      toast.error("Kunde inte spara anteckning: " + error.message);
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      content?: string;
      is_pinned?: boolean;
    }) => {
      const { data: note, error } = await withTimeout(
        supabase
          .from("customer_notes")
          .update(data)
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success("Anteckning uppdaterad!");
    },
    onError: (error) => {
      console.error("Update note error:", error);
      toast.error("Kunde inte uppdatera anteckning: " + error.message);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from("customer_notes").delete().eq("id", id),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      toast.success("Anteckning borttagen!");
    },
    onError: (error) => {
      console.error("Delete note error:", error);
      toast.error("Kunde inte ta bort anteckning: " + error.message);
    },
  });
}
