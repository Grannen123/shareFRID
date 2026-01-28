import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { FILES_BUCKET } from "@/lib/constants";
import type {
  JournalEntry,
  JournalEntryWithAuthor,
  Profile,
} from "@/types/database";
import type { JournalFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateBillingWithSplit,
  type TimebankStatus,
} from "@/lib/billing-logic";

interface CreateJournalParams {
  assignmentId: string;
  data: JournalFormData;
  agreement?: {
    id: string;
    type: "hourly" | "timebank" | "fixed";
    hourly_rate: number;
    overtime_rate?: number | null;
    included_hours?: number | null;
  } | null;
  timebankStatus?: TimebankStatus | null;
  customerId: string;
}

export function useJournalEntries(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.journal.byAssignment(assignmentId || ""),
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await withTimeout(
        supabase
          .from("journal_entries")
          .select("*")
          .eq("assignment_id", assignmentId)
          .eq("is_archived", false)
          .order("created_at", { ascending: false }),
      );

      if (error) throw error;

      const entries = data || [];
      const authorIds = Array.from(
        new Set(entries.map((entry) => entry.created_by).filter(Boolean)),
      );

      type AuthorProfile = Pick<Profile, "id" | "name" | "avatar_url">;
      let authorMap = new Map<string, AuthorProfile>();
      if (authorIds.length > 0) {
        const { data: profiles, error: profileError } = await withTimeout(
          supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", authorIds),
        );

        if (profileError) {
          console.error("Kunde inte hämta författare:", profileError);
        } else {
          authorMap = new Map(
            (profiles || []).map((profile) => [profile.id, profile]),
          );
        }
      }

      return entries.map((entry) => ({
        ...entry,
        author: authorMap.get(entry.created_by) || null,
      })) as JournalEntryWithAuthor[];
    },
    enabled: !!assignmentId,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      data,
      agreement,
      timebankStatus,
      customerId,
    }: CreateJournalParams) => {
      // Skapa journal entry
      const { data: entry, error: entryError } = await withTimeout(
        supabase
          .from("journal_entries")
          .insert({
            assignment_id: assignmentId,
            content: data.content,
            content_type: "text",
            hours: data.hours || null,
            billing_comment: data.billing_comment || null,
            is_extra_billable: data.is_extra_billable || false,
            entry_type: data.entry_type || "note",
            created_by: user?.id,
          })
          .select()
          .single(),
      );

      if (entryError) throw entryError;

      // Om timmar finns, skapa time_entries
      if (data.hours && data.hours > 0 && agreement) {
        const billingResult = calculateBillingWithSplit(
          agreement as any,
          timebankStatus || null,
          data.hours,
          data.is_extra_billable || false,
        );

        // Skapa time entries baserat på split
        for (const split of billingResult.entries) {
          const { error: timeError } = await withTimeout(
            supabase.from("time_entries").insert({
              customer_id: customerId,
              assignment_id: assignmentId,
              agreement_id: agreement.id,
              journal_entry_id: entry.id,
              date: new Date().toISOString().split("T")[0],
              hours: split.hours,
              description:
                data.billing_comment || data.content.substring(0, 200),
              hourly_rate: split.hourlyRate,
              billing_type: split.billingType,
              is_billable:
                split.billingType !== "internal" &&
                split.billingType !== "fixed",
              is_exported: false,
              created_by: user?.id,
            }),
          );

          if (timeError) {
            console.error("Time entry error:", timeError);
          }
        }
      }

      return entry as JournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.byAssignment(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeEntries.byCustomer(variables.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.timebankStatus.byAgreement(
          variables.agreement?.id || "",
        ),
      });
      toast.success("Journalpost skapad!");
    },
    onError: (error) => {
      console.error("Create journal entry error:", error);
      toast.error("Kunde inte skapa journalpost: " + error.message);
    },
  });
}

export function useArchiveJournalEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      assignmentId,
    }: {
      id: string;
      assignmentId: string;
    }) => {
      const { data: entry, error } = await withTimeout(
        supabase
          .from("journal_entries")
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archived_by: user?.id,
          })
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return { entry: entry as JournalEntry, assignmentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.byAssignment(result.assignmentId),
      });
      toast.success("Journalpost arkiverad!");
    },
    onError: (error) => {
      console.error("Archive journal entry error:", error);
      toast.error("Kunde inte arkivera journalpost: " + error.message);
    },
  });
}

export function useTogglePinJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      assignmentId,
      isPinned,
    }: {
      id: string;
      assignmentId: string;
      isPinned: boolean;
    }) => {
      const { data: entry, error } = await withTimeout(
        supabase
          .from("journal_entries")
          .update({ is_pinned: isPinned })
          .eq("id", id)
          .select()
          .single(),
      );

      if (error) throw error;
      return { entry: entry as JournalEntry, assignmentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.byAssignment(result.assignmentId),
      });
    },
    onError: (error) => {
      console.error("Toggle pin error:", error);
      toast.error("Kunde inte ändra fäst-status: " + error.message);
    },
  });
}

interface UpdateJournalParams {
  id: string;
  assignmentId: string;
  data: Partial<JournalFormData>;
  agreement?: {
    id: string;
    type: "hourly" | "timebank" | "fixed";
    hourly_rate: number;
    overtime_rate?: number | null;
    included_hours?: number | null;
  } | null;
  timebankStatus?: TimebankStatus | null;
  customerId: string;
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      assignmentId,
      data,
      agreement,
      timebankStatus,
      customerId,
    }: UpdateJournalParams) => {
      // Uppdatera journal entry
      const { data: entry, error: entryError } = await withTimeout(
        supabase
          .from("journal_entries")
          .update({
            content: data.content,
            hours: data.hours || null,
            billing_comment: data.billing_comment || null,
            is_extra_billable: data.is_extra_billable || false,
            entry_type: data.entry_type || "note",
          })
          .eq("id", id)
          .select()
          .single(),
      );

      if (entryError) throw entryError;

      // Ta bort gamla time_entries för denna journalpost
      const { error: deleteTimeError } = await withTimeout(
        supabase.from("time_entries").delete().eq("journal_entry_id", id),
      );

      if (deleteTimeError) {
        console.error("Delete time entries error:", deleteTimeError);
      }

      // Om timmar finns, skapa nya time_entries
      if (data.hours && data.hours > 0 && agreement) {
        const billingResult = calculateBillingWithSplit(
          agreement as any,
          timebankStatus || null,
          data.hours,
          data.is_extra_billable || false,
        );

        // Skapa time entries baserat på split
        for (const split of billingResult.entries) {
          const { error: timeError } = await withTimeout(
            supabase.from("time_entries").insert({
              customer_id: customerId,
              assignment_id: assignmentId,
              agreement_id: agreement.id,
              journal_entry_id: entry.id,
              date: new Date().toISOString().split("T")[0],
              hours: split.hours,
              description:
                data.billing_comment || (data.content || "").substring(0, 200),
              hourly_rate: split.hourlyRate,
              billing_type: split.billingType,
              is_billable:
                split.billingType !== "internal" &&
                split.billingType !== "fixed",
              is_exported: false,
              created_by: user?.id,
            }),
          );

          if (timeError) {
            console.error("Time entry error:", timeError);
          }
        }
      }

      return {
        entry: entry as JournalEntry,
        assignmentId,
        customerId,
        agreementId: agreement?.id,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.byAssignment(result.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeEntries.byCustomer(result.customerId),
      });
      if (result.agreementId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.timebankStatus.byAgreement(result.agreementId),
        });
      }
      toast.success("Journalpost uppdaterad!");
    },
    onError: (error) => {
      console.error("Update journal entry error:", error);
      toast.error("Kunde inte uppdatera journalpost: " + error.message);
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      assignmentId,
    }: {
      id: string;
      assignmentId: string;
    }) => {
      const { data: files, error: filesError } = await withTimeout(
        supabase
          .from("files")
          .select("id, file_path")
          .eq("journal_entry_id", id),
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
        supabase.from("journal_entries").delete().eq("id", id),
      );

      if (error) throw error;
      return { id, assignmentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.byAssignment(result.assignmentId),
      });
      toast.success("Journalpost borttagen!");
    },
    onError: (error) => {
      console.error("Delete journal entry error:", error);
      toast.error("Kunde inte ta bort journalpost: " + error.message);
    },
  });
}
