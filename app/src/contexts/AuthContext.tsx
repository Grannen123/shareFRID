/**
 * Authentication Context for Grannfrid CRM
 *
 * Provides Microsoft SSO authentication with MSAL and
 * Supabase session management.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  PublicClientApplication,
  InteractionStatus,
  EventType,
} from "@azure/msal-browser";
import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import {
  msalConfig,
  loginRequest,
  graphRequest,
  isMicrosoftAuthConfigured,
} from "@/lib/auth-config";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
  // Handle redirect promise
  msalInstance.handleRedirectPromise().catch(console.error);
});

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  workspace?: string;
  microsoftAccount?: AccountInfo;
}

interface AuthContextValue {
  user: AuthUser | null;
  supabaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMicrosoftConnected: boolean;
  interactionStatus: InteractionStatus;
  login: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: (scopes?: string[]) => Promise<string | null>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interactionStatus, setInteractionStatus] = useState<InteractionStatus>(
    InteractionStatus.None,
  );
  const [error, setError] = useState<string | null>(null);

  // Check if user has Microsoft account connected
  const getMicrosoftAccount = useCallback((): AccountInfo | null => {
    const accounts = msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }, []);

  // Build user object from Supabase and Microsoft data
  const buildUser = useCallback(
    (
      supabaseUserArg: User | null,
      microsoftAccount: AccountInfo | null,
    ): AuthUser | null => {
      if (!supabaseUserArg) return null;

      return {
        id: supabaseUserArg.id,
        email: supabaseUserArg.email || microsoftAccount?.username || "",
        name:
          supabaseUserArg.user_metadata?.name ||
          microsoftAccount?.name ||
          supabaseUserArg.email?.split("@")[0] ||
          "Användare",
        avatarUrl: supabaseUserArg.user_metadata?.avatar_url,
        role: supabaseUserArg.user_metadata?.role,
        workspace: supabaseUserArg.user_metadata?.workspace,
        microsoftAccount: microsoftAccount || undefined,
      };
    },
    [],
  );

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSupabaseUser(session?.user || null);

        // Check Microsoft account
        const microsoftAccount = getMicrosoftAccount();

        // Build combined user
        if (session?.user) {
          setUser(buildUser(session.user, microsoftAccount));
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError("Kunde inte initiera autentisering");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSupabaseUser(session?.user || null);
      const microsoftAccount = getMicrosoftAccount();
      setUser(buildUser(session?.user || null, microsoftAccount));
    });

    // Listen for MSAL events
    const callbackId = msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        const result = event.payload as AuthenticationResult;
        const microsoftAccount = result.account;
        if (supabaseUser) {
          setUser(buildUser(supabaseUser, microsoftAccount));
        }
      }
      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        const microsoftAccount = getMicrosoftAccount();
        if (supabaseUser) {
          setUser(buildUser(supabaseUser, microsoftAccount));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (callbackId) {
        msalInstance.removeEventCallback(callbackId);
      }
    };
  }, [buildUser, getMicrosoftAccount, supabaseUser]);

  // Login with Supabase (email/password or magic link)
  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // For now, use Microsoft SSO as primary login
      await loginWithMicrosoft();
    } catch (err) {
      console.error("Login error:", err);
      setError("Inloggning misslyckades");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with Microsoft SSO
  const loginWithMicrosoft = useCallback(async () => {
    if (!isMicrosoftAuthConfigured()) {
      setError("Microsoft-inloggning är inte konfigurerad");
      throw new Error("Microsoft auth not configured");
    }

    setIsLoading(true);
    setInteractionStatus(InteractionStatus.Startup);
    setError(null);

    try {
      // Login with Microsoft popup
      const result = await msalInstance.loginPopup(loginRequest);

      if (result.account) {
        // Sign in to Supabase with the Microsoft token
        const { data, error: supabaseError } =
          await supabase.auth.signInWithIdToken({
            provider: "azure",
            token: result.idToken,
          });

        if (supabaseError) {
          // If Supabase Azure provider is not configured, try creating a user
          console.warn(
            "Supabase Azure auth failed, using email login:",
            supabaseError,
          );

          // Use email from Microsoft account to sign in or create user
          const email = result.account.username;
          if (email) {
            // For development, auto-sign in with email
            const { error: signInError } = await supabase.auth.signInWithOtp({
              email,
              options: {
                shouldCreateUser: true,
                data: {
                  name: result.account.name,
                  microsoft_oid: result.account.localAccountId,
                },
              },
            });

            if (signInError) {
              console.error("Supabase sign in error:", signInError);
            }
          }
        }

        // Update user state with Microsoft account
        setUser(buildUser(data?.user || supabaseUser, result.account));
      }
    } catch (err) {
      console.error("Microsoft login error:", err);
      setError("Microsoft-inloggning misslyckades");
      throw err;
    } finally {
      setIsLoading(false);
      setInteractionStatus(InteractionStatus.None);
    }
  }, [buildUser, supabaseUser]);

  // Logout from both Supabase and Microsoft
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Logout from Microsoft
      const account = getMicrosoftAccount();
      if (account) {
        await msalInstance.logoutPopup({ account });
      }

      // Logout from Supabase
      await supabase.auth.signOut();

      setUser(null);
      setSupabaseUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError("Utloggning misslyckades");
    } finally {
      setIsLoading(false);
    }
  }, [getMicrosoftAccount]);

  // Get access token for Microsoft Graph API
  const getAccessToken = useCallback(
    async (scopes?: string[]): Promise<string | null> => {
      const account = getMicrosoftAccount();
      if (!account) {
        return null;
      }

      try {
        const result = await msalInstance.acquireTokenSilent({
          scopes: scopes || graphRequest.scopes,
          account,
        });
        return result.accessToken;
      } catch (err) {
        console.warn("Silent token acquisition failed, trying popup:", err);
        try {
          const result = await msalInstance.acquireTokenPopup({
            scopes: scopes || graphRequest.scopes,
            account,
          });
          return result.accessToken;
        } catch (popupErr) {
          console.error("Token acquisition failed:", popupErr);
          return null;
        }
      }
    },
    [getMicrosoftAccount],
  );

  const value: AuthContextValue = {
    user,
    supabaseUser,
    isLoading,
    isAuthenticated: !!user,
    isMicrosoftConnected: !!getMicrosoftAccount(),
    interactionStatus,
    login,
    loginWithMicrosoft,
    logout,
    getAccessToken,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Export MSAL instance for direct access if needed
export { msalInstance };
