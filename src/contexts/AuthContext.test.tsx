import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./AuthContext";
import type { ReactNode } from "react";

// Mock Supabase
const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    user_metadata: { name: "Test User" },
  },
  access_token: "test-token",
  refresh_token: "test-refresh-token",
};

const mockProfile = {
  id: "test-user-id",
  name: "Test Konsult",
  email: "test@example.com",
  workspace_id: "test-workspace",
};

let mockGetSession = vi.fn();
let mockSignInWithPassword = vi.fn();
let mockSignOut = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithPassword: (params: { email: string; password: string }) =>
        mockSignInWithPassword(params),
      signOut: () => mockSignOut(),
      onAuthStateChange: () => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: mockProfile,
              error: null,
            }),
        }),
      }),
    }),
  },
  withTimeout: <T,>(promise: Promise<T>) => promise,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("useAuth hook", () => {
    it("kastar fel om useAuth används utanför AuthProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth måste användas inom AuthProvider");

      consoleSpy.mockRestore();
    });

    it("returnerar initial state", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.profile).toBe(null);
    });
  });

  describe("signIn", () => {
    it("anropar supabase signInWithPassword", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("returnerar fel vid misslyckad inloggning", async () => {
      const mockError = new Error("Invalid credentials");
      mockSignInWithPassword.mockResolvedValueOnce({ error: mockError });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrong");
      });

      expect(signInResult).toEqual({ error: mockError });
    });

    it("returnerar null error vid lyckad inloggning", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn(
          "test@example.com",
          "correct",
        );
      });

      expect(signInResult).toEqual({ error: null });
    });
  });

  describe("signOut", () => {
    it("rensar state omedelbart", async () => {
      // Start with a session
      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.profile).toBe(null);
    });

    it("anropar supabase signOut", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("session initialization", () => {
    it("sätter user och session från befintlig session", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.session).toEqual(mockSession);
    });

    it("hanterar session error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error("Session error"),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      consoleSpy.mockRestore();
    });

    it("hanterar timeout", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockGetSession.mockRejectedValueOnce(new Error("Timeout"));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      consoleSpy.mockRestore();
    });
  });

  describe("refreshProfile", () => {
    it("uppdaterar profil från databasen", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshProfile();
      });

      // Profile should be set from mock
      await waitFor(() => {
        expect(result.current.profile).toBeTruthy();
      });
    });

    it("gör inget om ingen user finns", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(result.current.profile).toBe(null);
    });
  });
});
