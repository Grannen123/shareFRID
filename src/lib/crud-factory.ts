/**
 * CRUD Factory for React Query + Supabase
 *
 * Reduces boilerplate in hooks by providing standardized patterns for
 * list, detail, create, update, and delete operations.
 *
 * Usage:
 *   const hooks = createCrudHooks({
 *     tableName: 'customers',
 *     queryKey: 'customers',
 *     select: '*, agreements(*)',
 *   });
 *
 *   export const useCustomers = hooks.useList;
 *   export const useCustomer = hooks.useDetail;
 *   export const useCreateCustomer = hooks.useCreate;
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { toast } from "sonner";

interface CrudOptions<T> {
  tableName: string;
  queryKey: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  defaultPageSize?: number;
  transformData?: (data: unknown) => T;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  successMessages?: {
    create?: string;
    update?: string;
    delete?: string;
  };
  errorMessages?: {
    fetch?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
}

export function createCrudHooks<T extends { id: string }>(
  options: CrudOptions<T>,
) {
  const {
    tableName,
    queryKey,
    select = "*",
    orderBy = { column: "created_at", ascending: false },
    successMessages = {},
    errorMessages = {},
  } = options;

  const queryKeys = {
    all: [queryKey] as QueryKey,
    list: (filters?: Record<string, unknown>) =>
      [queryKey, "list", filters] as QueryKey,
    detail: (id: string) => [queryKey, id] as QueryKey,
  };

  // List hook
  function useList(filters?: Record<string, unknown>) {
    return useQuery({
      queryKey: queryKeys.list(filters),
      queryFn: async () => {
        let query = supabase
          .from(tableName)
          .select(select)
          .order(orderBy.column, { ascending: orderBy.ascending ?? false });

        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              query = query.eq(key, value);
            }
          });
        }

        const { data, error } = await withTimeout(query);
        if (error) throw error;
        const result = options.transformData
          ? options.transformData(data)
          : data;
        return result as unknown as T[];
      },
    });
  }

  // Detail hook
  function useDetail(id: string | undefined) {
    return useQuery({
      queryKey: queryKeys.detail(id || ""),
      queryFn: async () => {
        if (!id) return null;

        const { data, error } = await withTimeout(
          supabase.from(tableName).select(select).eq("id", id).single(),
        );

        if (error) throw error;
        return (
          options.transformData ? options.transformData(data) : data
        ) as T;
      },
      enabled: !!id,
    });
  }

  // Create hook
  function useCreate() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: Omit<T, "id" | "created_at" | "updated_at">) => {
        const { data: result, error } = await withTimeout(
          supabase.from(tableName).insert(data).select().single(),
        );

        if (error) throw error;
        return result as T;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.all });
        options.onCreateSuccess?.();
        toast.success(successMessages.create || "Skapad!");
      },
      onError: (error: Error) => {
        console.error(`Create ${tableName} error:`, error);
        toast.error(
          (errorMessages.create || "Kunde inte skapa") + ": " + error.message,
        );
      },
    });
  }

  // Update hook
  function useUpdate() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
        const { data: result, error } = await withTimeout(
          supabase.from(tableName).update(data).eq("id", id).select().single(),
        );

        if (error) throw error;
        return result as T;
      },
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.all });
        queryClient.invalidateQueries({
          queryKey: queryKeys.detail(result.id),
        });
        options.onUpdateSuccess?.();
        toast.success(successMessages.update || "Uppdaterad!");
      },
      onError: (error: Error) => {
        console.error(`Update ${tableName} error:`, error);
        toast.error(
          (errorMessages.update || "Kunde inte uppdatera") +
            ": " +
            error.message,
        );
      },
    });
  }

  // Delete hook
  function useDelete() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await withTimeout(
          supabase.from(tableName).delete().eq("id", id),
        );

        if (error) throw error;
        return id;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.all });
        options.onDeleteSuccess?.();
        toast.success(successMessages.delete || "Borttagen!");
      },
      onError: (error: Error) => {
        console.error(`Delete ${tableName} error:`, error);
        toast.error(
          (errorMessages.delete || "Kunde inte ta bort") + ": " + error.message,
        );
      },
    });
  }

  return {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useDelete,
    queryKeys,
  };
}

/**
 * Helper for creating filtered list queries
 */
export function createFilteredListHook<T>(
  tableName: string,
  queryKeyBase: QueryKey,
  select: string,
  buildFilters: (params: unknown) => Record<string, unknown>,
) {
  return function useFilteredList(params: unknown) {
    const filters = buildFilters(params);

    return useQuery({
      queryKey: [...queryKeyBase, filters],
      queryFn: async () => {
        let query = supabase.from(tableName).select(select);

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        const { data, error } = await withTimeout(query);
        if (error) throw error;
        return data as T[];
      },
      enabled: Object.values(filters).some(
        (v) => v !== undefined && v !== null,
      ),
    });
  };
}
