import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Contact } from "@/types/database";
import { toast } from "sonner";

export interface ContactWithRelations extends Contact {
  customer?: { id: string; name: string; customer_number: string } | null;
  assignment?: { id: string; title: string; assignment_number: string } | null;
}

export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("contacts")
          .select(
            `
          *,
          customer:customers(id, name, customer_number),
          assignment:assignments(id, title, assignment_number)
        `,
          )
          .order("name", { ascending: true }),
      );

      if (error) throw error;
      return data as ContactWithRelations[];
    },
  });
}

export function useContactsByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contacts.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("contacts")
          .select("*")
          .eq("customer_id", customerId)
          .order("name", { ascending: true }),
      );

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!customerId,
  });
}

export function useContactsByAssignment(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contacts.byAssignment(assignmentId || ""),
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("contacts")
          .select("*")
          .eq("assignment_id", assignmentId)
          .order("name", { ascending: true }),
      );

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!assignmentId,
  });
}

export interface CreateContactData {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  customer_id?: string;
  assignment_id?: string;
  contact_type?: "customer" | "assignment" | "standalone";
  is_invoice_recipient?: boolean;
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactData) => {
      const { data: contact, error } = await withTimeout(
        supabase.from("contacts").insert(data).select().single(),
      );

      if (error) throw error;
      return contact as Contact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      if (variables.customer_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.byCustomer(variables.customer_id),
        });
      }
      if (variables.assignment_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.byAssignment(variables.assignment_id),
        });
      }
      toast.success("Kontakt skapad!");
    },
    onError: (error) => {
      console.error("Create contact error:", error);
      toast.error("Kunde inte skapa kontakt: " + error.message);
    },
  });
}

export interface UpdateContactData {
  id: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  customer_id?: string | null;
  assignment_id?: string | null;
  contact_type?: "customer" | "assignment" | "standalone";
  is_invoice_recipient?: boolean;
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateContactData) => {
      const { data: contact, error } = await withTimeout(
        supabase.from("contacts").update(data).eq("id", id).select().single(),
      );

      if (error) throw error;
      return contact as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Kontakt uppdaterad!");
    },
    onError: (error) => {
      console.error("Update contact error:", error);
      toast.error("Kunde inte uppdatera kontakt: " + error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from("contacts").delete().eq("id", id),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Kontakt borttagen!");
    },
    onError: (error) => {
      console.error("Delete contact error:", error);
      toast.error("Kunde inte ta bort kontakt: " + error.message);
    },
  });
}
