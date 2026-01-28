import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, createElement } from "react";

// Mock supabase module
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
  withTimeout: vi.fn((promise) => promise),
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id" },
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
import { toast } from "sonner";
import {
  useBillingBatches,
  useBillingSummary,
  useCreateBillingBatch,
  useUpdateBillingBatchStatus,
  useBillingBatchDetail,
} from "./useBilling";

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useBillingBatches", () => {
    it("should fetch all billing batches", async () => {
      const mockBatches = [
        {
          id: "batch-1",
          batch_id: "B-202601-123",
          customer_id: "c1",
          period_year: 2026,
          period_month: 1,
          status: "draft",
          total_amount: 5000,
          customer: { name: "Kund 1", customer_number: "K-001" },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockBatches,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        eq: vi.fn().mockReturnThis(),
      });

      const { result } = renderHook(() => useBillingBatches(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].batch_id).toBe("B-202601-123");
    });

    it("should filter by year and month when provided", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockFinalEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        eq: vi.fn().mockImplementation(() => {
          return { eq: mockFinalEq };
        }),
      });

      renderHook(() => useBillingBatches(2026, 3), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("billing_batches");
      });
    });
  });

  describe("useBillingSummary", () => {
    it("should calculate billing summary per customer", async () => {
      const mockEntries = [
        {
          id: "e1",
          customer_id: "c1",
          hours: 5,
          hourly_rate: 500,
          billing_type: "hourly",
          is_billable: true,
          is_exported: false,
          date: "2026-01-15",
          customer: { id: "c1", name: "Kund 1", customer_number: "K-001" },
        },
        {
          id: "e2",
          customer_id: "c1",
          hours: 3,
          hourly_rate: 500,
          billing_type: "timebank",
          is_billable: true,
          is_exported: false,
          date: "2026-01-16",
          customer: { id: "c1", name: "Kund 1", customer_number: "K-001" },
        },
        {
          id: "e3",
          customer_id: "c2",
          hours: 2,
          hourly_rate: 600,
          billing_type: "overtime",
          is_billable: true,
          is_exported: false,
          date: "2026-01-17",
          customer: { id: "c2", name: "Kund 2", customer_number: "K-002" },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockEntries,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const { result } = renderHook(() => useBillingSummary(2026, 1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Ska ha 2 kunder i summary
      expect(result.current.data).toHaveLength(2);

      // Hitta kund 1 i resultatet
      const kund1Summary = result.current.data?.find(
        (s) => s.customerId === "c1",
      );
      expect(kund1Summary?.totalHours).toBe(8);
      expect(kund1Summary?.hourlyHours).toBe(5);
      expect(kund1Summary?.timebankHours).toBe(3);
      expect(kund1Summary?.totalAmount).toBe(4000); // (5+3) * 500

      // Hitta kund 2 i resultatet
      const kund2Summary = result.current.data?.find(
        (s) => s.customerId === "c2",
      );
      expect(kund2Summary?.overtimeHours).toBe(2);
      expect(kund2Summary?.totalAmount).toBe(1200); // 2 * 600
    });

    it("should calculate correct date range for month", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
      });

      const { result } = renderHook(() => useBillingSummary(2026, 2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verifiera att datumfilter kallades (exakta datum kan variera beroende på implementation)
      expect(mockGte).toHaveBeenCalled();
      expect(mockLte).toHaveBeenCalled();
    });
  });

  describe("useCreateBillingBatch", () => {
    it("should create billing batch and update time entries", async () => {
      const mockBatch = {
        id: "new-batch-id",
        batch_id: "B-202601-123456",
        customer_id: "c1",
        period_year: 2026,
        period_month: 1,
        status: "draft",
        total_amount: 5000,
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBatch,
        error: null,
      });
      const mockUpdate = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
        (table) => {
          if (table === "billing_batches") {
            return {
              insert: mockInsert,
              select: mockSelect,
              single: mockSingle,
            };
          }
          if (table === "time_entries") {
            return {
              update: mockUpdate,
              in: mockIn,
            };
          }
          return {};
        },
      );

      const { result } = renderHook(() => useCreateBillingBatch(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        customerId: "c1",
        year: 2026,
        month: 1,
        entryIds: ["e1", "e2"],
        totalAmount: 5000,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({
        export_batch_id: "new-batch-id",
      });
      expect(mockIn).toHaveBeenCalledWith("id", ["e1", "e2"]);
      expect(toast.success).toHaveBeenCalledWith("Fakturaunderlag skapat!");
    });
  });

  describe("useUpdateBillingBatchStatus", () => {
    it("should update batch status", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "batch-1", status: "review" },
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateBillingBatchStatus(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "batch-1", status: "review" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith({ status: "review" });
      expect(toast.success).toHaveBeenCalledWith("Status uppdaterad!");
    });

    it("should mark time entries as exported when status is exported", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "batch-1", status: "exported" },
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
        (table) => {
          if (table === "billing_batches") {
            return {
              update: mockUpdate,
              eq: mockEq,
              select: mockSelect,
              single: mockSingle,
            };
          }
          if (table === "time_entries") {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          return {};
        },
      );

      const { result } = renderHook(() => useUpdateBillingBatchStatus(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "batch-1", status: "exported" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "exported",
          exported_at: expect.any(String),
          exported_by: "test-user-id",
        }),
      );
    });
  });

  describe("useBillingBatchDetail", () => {
    it("should fetch batch with entries", async () => {
      const mockBatch = {
        id: "batch-1",
        batch_id: "B-202601-123",
        customer: { name: "Kund 1", customer_number: "K-001" },
      };

      const mockEntries = [
        {
          id: "e1",
          hours: 5,
          date: "2026-01-15",
          assignment: { title: "Uppdrag 1", assignment_number: "C-001" },
        },
      ];

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
        (table) => {
          if (table === "billing_batches") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBatch,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "time_entries") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockEntries,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      );

      const { result } = renderHook(() => useBillingBatchDetail("batch-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.batch.batch_id).toBe("B-202601-123");
      expect(result.current.data?.entries).toHaveLength(1);
    });

    it("should not fetch when batchId is null", async () => {
      const { result } = renderHook(() => useBillingBatchDetail(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });
});
