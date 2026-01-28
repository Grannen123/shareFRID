import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/types/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useCurrentProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      );

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  title?: string;
  default_hourly_rate?: number;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user?.id) throw new Error("Ingen användare inloggad");

      const { data: profile, error } = await withTimeout(
        supabase
          .from("profiles")
          .update(data)
          .eq("id", user.id)
          .select()
          .single(),
      );

      if (error) throw error;
      return profile as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.current });
      toast.success("Profil uppdaterad!");
    },
    onError: (error) => {
      console.error("Update profile error:", error);
      toast.error("Kunde inte uppdatera profil: " + error.message);
    },
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .order("name", { ascending: true }),
      );

      if (error) throw error;
      return data as Profile[];
    },
  });
}
