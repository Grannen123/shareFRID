import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Customer, CustomerWithAgreement } from "@/types/database";
import type { CustomerFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PaginatedCustomersResult {
  data: CustomerWithAgreement[];
  count: number;
}

/**
 * Hämtar alla kunder med deras aktiva avtal.
 * Filtrerar automatiskt bort inaktiva avtal per kund.
 * @returns React Query result med CustomerWithAgreement[]
 */
export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("customers")
          .select(
            `
          *,
          agreement:agreements(*)
        `,
          )
          .order("name"),
      );

      if (error) throw error;

      // Ta bara det aktiva avtalet per kund
      return data.map((customer) => ({
        ...customer,
        agreement: Array.isArray(customer.agreement)
          ? customer.agreement.find(
              (a: { status: string }) => a.status === "active",
            ) || null
          : customer.agreement,
      })) as CustomerWithAgreement[];
    },
  });
}

/**
 * Hämtar kunder med paginering och sökfilter.
 * SQL wildcards (%, _) escapas automatiskt i söksträngen.
 * @param page - Sidnummer (1-indexerad)
 * @param pageSize - Antal kunder per sida
 * @param search - Sökterm (söker i namn och kundnummer)
 * @returns React Query result med { data: CustomerWithAgreement[], count: number }
 */
export function useCustomersPaged(
  page: number,
  pageSize: number,
  search: string,
) {
  return useQuery({
    queryKey: queryKeys.customers.paged(page, pageSize, search),
    queryFn: async (): Promise<PaginatedCustomersResult> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("customers")
        .select(
          `
          *,
          agreement:agreements(*)
        `,
          { count: "exact" },
        )
        .order("name")
        .range(from, to);

      if (search.trim()) {
        // Escape SQL wildcards and special characters for safe ilike query
        const escaped = search
          .replace(/\\/g, "\\\\") // Escape backslashes first
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_");
        const pattern = `%${escaped}%`;
        // Use filter with ilike for each field - safer than string interpolation
        query = query.or(
          `name.ilike.${pattern},customer_number.ilike.${pattern}`,
        );
      }

      const { data, error, count } = await withTimeout(query);
      if (error) throw error;

      const customers = (data || []).map((customer) => ({
        ...customer,
        agreement: Array.isArray(customer.agreement)
          ? customer.agreement.find(
              (a: { status: string }) => a.status === "active",
            ) || null
          : customer.agreement,
      })) as CustomerWithAgreement[];

      return { data: customers, count: count || 0 };
    },
  });
}

/**
 * Hämtar en enskild kund med aktivt avtal.
 * @param id - Kundens UUID, eller undefined för att inaktivera queryn
 * @returns React Query result med CustomerWithAgreement eller null
 */
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await withTimeout(
        supabase
          .from("customers")
          .select(
            `
          *,
          agreement:agreements(*)
        `,
          )
          .eq("id", id)
          .single(),
      );

      if (error) throw error;

      return {
        ...data,
        agreement: Array.isArray(data.agreement)
          ? data.agreement.find(
              (a: { status: string }) => a.status === "active",
            ) || null
          : data.agreement,
      } as CustomerWithAgreement;
    },
    enabled: !!id,
  });
}

/**
 * Mutation för att skapa en ny kund.
 * Tilldelar automatiskt workspace och ansvarig konsult.
 * Invaliderar kundcachen och visar toast vid resultat.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CustomerFormData) => {
      let workspace_id = profile?.workspace_id || null;
      if (!workspace_id) {
        const { data: workspace, error: workspaceError } = await supabase
          .from("workspaces")
          .select("id")
          .eq("name", "Göteborg")
          .maybeSingle();

        if (workspaceError) throw workspaceError;
        workspace_id = workspace?.id || null;
      }

      if (!workspace_id) {
        throw new Error("Workspace saknas för kunden.");
      }

      const { data: customer, error } = await withTimeout(
        supabase
          .from("customers")
          .insert({
            ...data,
            workspace_id,
            responsible_consultant_id: user?.id,
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return customer as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: ["customers", "page"],
        exact: false,
      });
      toast.success("Kund skapad!");
    },
    onError: (error) => {
      console.error("Create customer error:", error);
      toast.error("Kunde inte skapa kund: " + error.message);
    },
  });
}

/**
 * Mutation för att uppdatera en befintlig kund.
 * Invaliderar relevant cache och visar toast vid resultat.
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & Partial<CustomerFormData>) => {
      const { data: customer, error } = await withTimeout(
        supabase.from("customers").update(data).eq("id", id).select().single(),
      );

      if (error) throw error;
      return customer as Customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: ["customers", "page"],
        exact: false,
      });
      toast.success("Kund uppdaterad!");
    },
    onError: (error) => {
      console.error("Update customer error:", error);
      toast.error("Kunde inte uppdatera kund: " + error.message);
    },
  });
}

/**
 * Mutation för att ta bort en kund.
 * OBS: Använd försiktigt då detta är en permanent operation.
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await withTimeout(
        supabase.from("customers").delete().eq("id", id),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: ["customers", "page"],
        exact: false,
      });
      toast.success("Kund borttagen!");
    },
    onError: (error) => {
      console.error("Delete customer error:", error);
      toast.error("Kunde inte ta bort kund: " + error.message);
    },
  });
}
