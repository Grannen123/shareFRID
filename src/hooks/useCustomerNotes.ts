import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { CustomerNote, CustomerNoteWithAuthor } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useCustomerNotes(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customerNotes.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("customer_notes")
          .select("*")
          .eq("customer_id", customerId)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as CustomerNoteWithAuthor[];
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomerNote() {
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
      return note as CustomerNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerNotes.byCustomer(variables.customer_id),
      });
      toast.success("Anteckning sparad!");
    },
    onError: (error) => {
      console.error("Create customer note error:", error);
      toast.error("Kunde inte spara anteckning: " + error.message);
    },
  });
}

export function useUpdateCustomerNote() {
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
      return { note: note as CustomerNote, customerId: note.customer_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerNotes.byCustomer(result.customerId),
      });
      toast.success("Anteckning uppdaterad!");
    },
    onError: (error) => {
      console.error("Update customer note error:", error);
      toast.error("Kunde inte uppdatera anteckning: " + error.message);
    },
  });
}

export function useDeleteCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: deletedNote, error } = await withTimeout(
        supabase
          .from("customer_notes")
          .delete()
          .eq("id", id)
          .select("customer_id")
          .single(),
      );
      if (error) throw error;
      return { customerId: deletedNote?.customer_id || "" };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerNotes.byCustomer(result.customerId),
      });
      toast.success("Anteckning borttagen!");
    },
    onError: (error) => {
      console.error("Delete customer note error:", error);
      toast.error("Kunde inte ta bort anteckning: " + error.message);
    },
  });
}

export function useTogglePinCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      customerId,
      isPinned,
    }: {
      id: string;
      customerId: string;
      isPinned: boolean;
    }) => {
      const { data: note, error } = await withTimeout(
        supabase
          .from("customer_notes")
          .update({ is_pinned: isPinned })
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return { note: note as CustomerNote, customerId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerNotes.byCustomer(result.customerId),
      });
    },
    onError: (error) => {
      console.error("Toggle pin error:", error);
      toast.error("Kunde inte ändra fäst-status: " + error.message);
    },
  });
}
