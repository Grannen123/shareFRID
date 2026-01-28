import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, createElement } from "react";

// Mock supabase module
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
  withTimeout: vi.fn((promise) => promise),
}));

// Mock constants
vi.mock("@/lib/constants", () => ({
  FILES_BUCKET: "files",
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
  useAssignments,
  useAssignment,
  useAssignmentsByCustomer,
  useActiveAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useCloseAssignment,
} from "./useAssignments";

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

describe("useAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useAssignments", () => {
    it("should fetch all assignments successfully", async () => {
      const mockAssignments = [
        {
          id: "a1",
          title: "Uppdrag 1",
          assignment_number: "C-001",
          status: "active",
          customer: { id: "c1", name: "Kund 1" },
        },
        {
          id: "a2",
          title: "Uppdrag 2",
          assignment_number: "P-001",
          status: "closed",
          customer: { id: "c2", name: "Kund 2" },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].title).toBe("Uppdrag 1");
    });

    it("should handle error when fetching assignments", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Database error");
    });
  });

  describe("useAssignment", () => {
    it("should fetch single assignment by id", async () => {
      const mockAssignment = {
        id: "test-id",
        title: "Testuppdrag",
        assignment_number: "C-001",
        customer: { id: "c1", name: "Testkund" },
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockAssignment,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const { result } = renderHook(() => useAssignment("test-id"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe("Testuppdrag");
    });

    it("should not fetch when id is undefined", async () => {
      const { result } = renderHook(() => useAssignment(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useAssignmentsByCustomer", () => {
    it("should fetch assignments for specific customer", async () => {
      const mockAssignments = [
        { id: "a1", title: "Kunduppdrag 1", customer_id: "customer-123" },
        { id: "a2", title: "Kunduppdrag 2", customer_id: "customer-123" },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const { result } = renderHook(
        () => useAssignmentsByCustomer("customer-123"),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(mockEq).toHaveBeenCalledWith("customer_id", "customer-123");
    });

    it("should return empty array when customerId is undefined", async () => {
      const { result } = renderHook(() => useAssignmentsByCustomer(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useActiveAssignments", () => {
    it("should fetch only active assignments", async () => {
      const mockAssignments = [
        {
          id: "a1",
          title: "Aktivt uppdrag",
          status: "active",
          customer: { id: "c1", name: "Kund" },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockFinalOrder = vi.fn().mockResolvedValue({
        data: mockAssignments,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: vi.fn().mockImplementation(() => ({
          order: mockFinalOrder,
        })),
      });

      const { result } = renderHook(() => useActiveAssignments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockEq).toHaveBeenCalledWith("status", "active");
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useCreateAssignment", () => {
    it("should create assignment successfully", async () => {
      const newAssignment = {
        id: "new-assignment",
        title: "Nytt uppdrag",
        customer_id: "c1",
        status: "active",
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: newAssignment,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateAssignment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "Nytt uppdrag",
        customer_id: "c1",
        type: "case",
        priority: "medium",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Nytt uppdrag",
          customer_id: "c1",
          status: "active",
          responsible_consultant_id: "test-user-id",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Uppdrag skapat!");
    });

    it("should show error toast on failure", async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Insert failed"),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateAssignment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "Test",
        customer_id: "c1",
        type: "case",
        priority: "medium",
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Kunde inte skapa uppdrag"),
      );
    });
  });

  describe("useUpdateAssignment", () => {
    it("should update assignment successfully", async () => {
      const updatedAssignment = {
        id: "a1",
        title: "Uppdaterad titel",
        customer_id: "c1",
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedAssignment,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateAssignment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "a1",
        title: "Uppdaterad titel",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Uppdrag uppdaterat!");
    });
  });

  describe("useDeleteAssignment", () => {
    it("should delete assignment successfully", async () => {
      const mockAssignment = {
        id: "a1",
        title: "Uppdrag att radera",
        customer_id: "c1",
      };

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
        (table) => {
          if (table === "files") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [], // Inga filer att radera
                  error: null,
                }),
              }),
            };
          }
          if (table === "assignments") {
            return {
              delete: mockDelete,
              eq: mockEq,
            };
          }
          return {};
        },
      );

      const { result } = renderHook(() => useDeleteAssignment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockAssignment as any);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Uppdrag borttaget!");
    });
  });

  describe("useCloseAssignment", () => {
    it("should close assignment by setting status", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "a1", status: "closed", customer_id: "c1" },
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useCloseAssignment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("a1");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith({ status: "closed" });
      expect(toast.success).toHaveBeenCalledWith("Uppdrag avslutat!");
    });
  });
});
