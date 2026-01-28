import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, createElement } from "react";

// Mock supabase module
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
  withTimeout: vi.fn((promise) => promise),
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id" },
    profile: { workspace_id: "test-workspace-id" },
  })),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { supabase } from "@/lib/supabase";
import { useCustomers, useCustomer, useCustomersPaged } from "./useCustomers";

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useCustomers", () => {
    it("should fetch all customers successfully", async () => {
      const mockCustomers = [
        {
          id: "1",
          name: "Test Kund 1",
          customer_number: "K-001",
          agreement: [{ id: "a1", status: "active", type: "hourly" }],
        },
        {
          id: "2",
          name: "Test Kund 2",
          customer_number: "K-002",
          agreement: [{ id: "a2", status: "active", type: "timebank" }],
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockCustomers,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe("Test Kund 1");
      // Kontrollerar att endast aktivt avtal behålls
      expect(result.current.data?.[0].agreement?.type).toBe("hourly");
    });

    it("should handle error when fetching customers", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Database error");
    });

    it("should filter active agreements from array", async () => {
      const mockCustomers = [
        {
          id: "1",
          name: "Test Kund",
          agreement: [
            { id: "a1", status: "terminated", type: "hourly" },
            { id: "a2", status: "active", type: "timebank" },
          ],
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockCustomers,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Ska bara returnera det aktiva avtalet
      expect(result.current.data?.[0].agreement?.type).toBe("timebank");
    });
  });

  describe("useCustomer", () => {
    it("should fetch single customer by id", async () => {
      const mockCustomer = {
        id: "test-id",
        name: "Enskild Kund",
        customer_number: "K-001",
        agreement: [{ id: "a1", status: "active", type: "fixed" }],
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCustomer,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const { result } = renderHook(() => useCustomer("test-id"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.name).toBe("Enskild Kund");
      expect(result.current.data?.agreement?.type).toBe("fixed");
    });

    it("should not fetch when id is undefined", async () => {
      const { result } = renderHook(() => useCustomer(undefined), {
        wrapper: createWrapper(),
      });

      // Query ska vara disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useCustomersPaged", () => {
    it("should fetch paginated customers", async () => {
      const mockCustomers = [
        { id: "1", name: "Kund 1", agreement: [] },
        { id: "2", name: "Kund 2", agreement: [] },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockCustomers,
        count: 10,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
      });

      const { result } = renderHook(() => useCustomersPaged(1, 20, ""), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.count).toBe(10);
    });

    it("should apply search filter when provided", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
        or: mockOr,
      });

      renderHook(() => useCustomersPaged(1, 20, "test"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockOr).toHaveBeenCalled();
      });

      // Verifiera att sökmönstret är korrekt escapeat
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining("name.ilike.%test%"),
      );
    });

    it("should escape SQL wildcards in search", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        range: mockRange,
        or: mockOr,
      });

      renderHook(() => useCustomersPaged(1, 20, "test%_pattern"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockOr).toHaveBeenCalled();
      });

      // Verifiera att % och _ är escapede
      const callArg = mockOr.mock.calls[0][0];
      expect(callArg).toContain("\\%");
      expect(callArg).toContain("\\_");
    });
  });
});
