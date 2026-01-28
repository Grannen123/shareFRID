import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/types/database";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hämta profil från profiles-tabellen
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).single(),
      );

      if (error) {
        console.error("Kunde inte hämta profil:", error);
        return null;
      }
      return data as Profile;
    } catch (error) {
      console.error("Kunde inte hämta profil:", error);
      return null;
    }
  };

  // Refresha profil - uppdaterar både lokal state och React Query cache
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      // Invalidera React Query cache så useCurrentProfile() hämtar ny data
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.current });
    }
  };

  useEffect(() => {
    // Track if initial auth has been set to prevent race condition
    let isInitialized = false;

    // 1. Hämta befintlig session vid mount (KRITISKT!)
    const initializeAuth = async () => {
      try {
        const {
          data: { session: existingSession },
          error: sessionError,
        } = await withTimeout(supabase.auth.getSession(), 5000);

        if (sessionError) {
          console.error("Session error:", sessionError);
          setIsLoading(false);
          return;
        }

        if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          // Await profile fetch to avoid race condition
          try {
            const profileData = await fetchProfile(existingSession.user.id);
            setProfile(profileData);
          } catch (err) {
            console.error("Profile fetch error:", err);
            setProfile(null);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("timeout")
        ) {
          console.warn(
            "Auth initialization timeout - continuing without session",
          );
        } else {
          console.error("Auth initialization error:", error);
        }
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        isInitialized = true;
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 2. Lyssna på auth-ändringar
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Skip if this is the initial INITIAL_SESSION event before we've initialized
      // This prevents race condition between getSession() and onAuthStateChange
      if (event === "INITIAL_SESSION" && !isInitialized) {
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        try {
          const profileData = await fetchProfile(newSession.user.id);
          setProfile(profileData);
        } catch (error) {
          console.error("Profile fetch error:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        10000,
      );
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Rensa state först för omedelbar UI-uppdatering
    setUser(null);
    setSession(null);
    setProfile(null);

    // Försök logga ut från Supabase (med timeout)
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signout timeout")), 3000),
      );
      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
    } catch (error) {
      console.warn("Signout error (continuing anyway):", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth måste användas inom AuthProvider");
  }
  return context;
}
