import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Agreement, AgreementWithCustomer } from "@/types/database";
import type { AgreementFormData } from "@/lib/schemas";
import { toast } from "sonner";

export function useAgreements() {
  return useQuery({
    queryKey: queryKeys.agreements.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as AgreementWithCustomer[];
    },
  });
}

export function useAgreementsByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.agreements.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select("*")
          .eq("customer_id", customerId)
          .order("valid_from", { ascending: false }),
      );

      if (error) throw error;
      return data as Agreement[];
    },
    enabled: !!customerId,
  });
}

// Hämta aktivt avtal för en kund
export function useCustomerAgreement(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.agreements.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select("*")
          .eq("customer_id", customerId)
          .eq("status", "active")
          .order("valid_from", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );

      if (error) throw error;
      return data as Agreement | null;
    },
    enabled: !!customerId,
  });
}

export function useAgreementsWithUpcomingIndexation(daysAhead: number = 30) {
  return useQuery({
    queryKey: queryKeys.agreements.withIndexation,
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await withTimeout(
        supabase
          .from("agreements")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .not("next_indexation", "is", null)
          .lte("next_indexation", futureDate.toISOString().split("T")[0])
          .eq("status", "active")
          .order("next_indexation"),
      );

      if (error) throw error;
      return data as AgreementWithCustomer[];
    },
  });
}

export function useCreateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AgreementFormData) => {
      const { data: agreement, error } = await withTimeout(
        supabase
          .from("agreements")
          .insert({
            ...data,
            status: "active",
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return agreement as Agreement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.byCustomer(variables.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customer_id),
      });
      toast.success("Avtal skapat!");
    },
    onError: (error) => {
      console.error("Create agreement error:", error);
      toast.error("Kunde inte skapa avtal: " + error.message);
    },
  });
}

export function useUpdateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & Partial<AgreementFormData & { status?: string }>) => {
      const { data: agreement, error } = await withTimeout(
        supabase.from("agreements").update(data).eq("id", id).select().single(),
      );

      if (error) throw error;
      return agreement as Agreement;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.byCustomer(result.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(result.customer_id),
      });
      toast.success("Avtal uppdaterat!");
    },
    onError: (error) => {
      console.error("Update agreement error:", error);
      toast.error("Kunde inte uppdatera avtal: " + error.message);
    },
  });
}

export function useDeleteAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreement: Agreement) => {
      const { error } = await withTimeout(
        supabase.from("agreements").delete().eq("id", agreement.id),
      );
      if (error) throw error;
      return agreement;
    },
    onSuccess: (agreement) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.byCustomer(agreement.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success("Avtal borttaget!");
    },
    onError: (error) => {
      console.error("Delete agreement error:", error);
      toast.error("Kunde inte ta bort avtal: " + error.message);
    },
  });
}
