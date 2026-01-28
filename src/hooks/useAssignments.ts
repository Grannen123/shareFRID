import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { FILES_BUCKET } from "@/lib/constants";
import type { Assignment, AssignmentWithCustomer } from "@/types/database";
import type { AssignmentFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useAssignments() {
  return useQuery({
    queryKey: queryKeys.assignments.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("assignments")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as AssignmentWithCustomer[];
    },
  });
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assignments.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await withTimeout(
        supabase
          .from("assignments")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .eq("id", id)
          .single(),
      );

      if (error) throw error;
      return data as AssignmentWithCustomer;
    },
    enabled: !!id,
  });
}

export function useAssignmentsByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assignments.byCustomer(customerId || ""),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("assignments")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!customerId,
  });
}

export function useActiveAssignments() {
  return useQuery({
    queryKey: [...queryKeys.assignments.all, "active"],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("assignments")
          .select(
            `
          *,
          customer:customers(*)
        `,
          )
          .eq("status", "active")
          .order("priority")
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;
      return data as AssignmentWithCustomer[];
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const { data: assignment, error } = await withTimeout(
        supabase
          .from("assignments")
          .insert({
            ...data,
            status: "active",
            responsible_consultant_id: user?.id,
          })
          .select()
          .single(),
      );

      if (error) throw error;
      return assignment as Assignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.byCustomer(variables.customer_id),
      });
      toast.success("Uppdrag skapat!");
    },
    onError: (error) => {
      console.error("Create assignment error:", error);
      toast.error("Kunde inte skapa uppdrag: " + error.message);
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & Partial<AssignmentFormData & { status?: string }>) => {
      const { data: assignment, error } = await withTimeout(
        supabase
          .from("assignments")
          .update(data)
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return assignment as Assignment;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.byCustomer(result.customer_id),
      });
      toast.success("Uppdrag uppdaterat!");
    },
    onError: (error) => {
      console.error("Update assignment error:", error);
      toast.error("Kunde inte uppdatera uppdrag: " + error.message);
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: Assignment) => {
      const { data: files, error: filesError } = await withTimeout(
        supabase
          .from("files")
          .select("id, file_path")
          .eq("assignment_id", assignment.id),
      );

      if (filesError) throw filesError;

      const filePaths = (files || []).map((file) => file.file_path);
      if (filePaths.length > 0) {
        const { error: storageError } = await withTimeout(
          supabase.storage.from(FILES_BUCKET).remove(filePaths),
          20000,
        );

        if (storageError) throw storageError;
      }

      const { error } = await withTimeout(
        supabase.from("assignments").delete().eq("id", assignment.id),
      );
      if (error) throw error;
      return assignment;
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.byCustomer(assignment.customer_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(assignment.id),
      });
      toast.success("Uppdrag borttaget!");
    },
    onError: (error) => {
      console.error("Delete assignment error:", error);
      toast.error("Kunde inte ta bort uppdrag: " + error.message);
    },
  });
}

export function useCloseAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: assignment, error } = await withTimeout(
        supabase
          .from("assignments")
          .update({ status: "closed" })
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return assignment as Assignment;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(result.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.byCustomer(result.customer_id),
      });
      toast.success("Uppdrag avslutat!");
    },
    onError: (error) => {
      console.error("Close assignment error:", error);
      toast.error("Kunde inte avsluta uppdrag: " + error.message);
    },
  });
}
