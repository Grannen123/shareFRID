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
const mockUser = { id: "test-user-id" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
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
  useTasks,
  useMyTasks,
  useTasksByCustomer,
  useTasksByAssignment,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskStatus,
} from "./useTasks";

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

describe("useTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("useTasks", () => {
    it("should fetch all tasks successfully", async () => {
      const mockTasks = [
        {
          id: "task-1",
          title: "Uppgift 1",
          status: "pending",
          priority: "high",
          customer: { id: "c1", name: "Kund 1" },
          assignment: null,
        },
        {
          id: "task-2",
          title: "Uppgift 2",
          status: "in_progress",
          priority: "medium",
          customer: null,
          assignment: { id: "a1", title: "Uppdrag 1" },
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFinalOrder = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        order: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockImplementation(() => ({
            order: mockFinalOrder,
          })),
        })),
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].title).toBe("Uppgift 1");
    });

    it("should not fetch tasks when user is not authenticated", async () => {
      // Temporärt ändra mock för detta test
      const originalMock = vi.mocked(
        await import("@/contexts/AuthContext"),
      ).useAuth;
      vi.mocked(originalMock).mockReturnValueOnce({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      // Query ska vara disabled när user är null
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useMyTasks", () => {
    it("should fetch tasks for current user and unassigned tasks", async () => {
      const mockTasks = [
        { id: "t1", title: "Min uppgift", assigned_to: "test-user-id" },
        { id: "t2", title: "Otilldelad", assigned_to: null },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockNeq = vi.fn().mockReturnThis();
      const mockFinalOrder = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        neq: mockNeq,
        order: vi.fn().mockImplementation(() => ({
          order: mockFinalOrder,
        })),
      });

      const { result } = renderHook(() => useMyTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verifierar att or-filter användes med rätt user id
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining("test-user-id"),
      );
    });
  });

  describe("useTasksByCustomer", () => {
    it("should fetch tasks for specific customer", async () => {
      const mockTasks = [
        { id: "t1", title: "Kunduppgift", customer_id: "customer-123" },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockFinalOrder = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockImplementation(() => ({
            order: mockFinalOrder,
          })),
        })),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => useTasksByCustomer("customer-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockEq).toHaveBeenCalledWith("customer_id", "customer-123");
    });

    it("should return empty array when customerId is undefined", async () => {
      const { result } = renderHook(() => useTasksByCustomer(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useTasksByAssignment", () => {
    it("should fetch tasks for specific assignment", async () => {
      const mockTasks = [
        { id: "t1", title: "Uppdragsuppgift", assignment_id: "assignment-456" },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockImplementation(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          })),
        })),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(
        () => useTasksByAssignment("assignment-456"),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockEq).toHaveBeenCalledWith("assignment_id", "assignment-456");
    });
  });

  describe("useCreateTask", () => {
    it("should create task successfully", async () => {
      const newTask = {
        id: "new-task",
        title: "Ny uppgift",
        created_by: "test-user-id",
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: newTask,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        title: "Ny uppgift",
        priority: "high",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Ny uppgift",
          priority: "high",
          created_by: "test-user-id",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Uppgift skapad!");
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

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ title: "Test" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Kunde inte skapa uppgift"),
      );
    });
  });

  describe("useUpdateTask", () => {
    it("should update task successfully", async () => {
      const updatedTask = {
        id: "task-1",
        title: "Uppdaterad titel",
        status: "in_progress",
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedTask,
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "task-1",
        title: "Uppdaterad titel",
        status: "in_progress",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Uppgift uppdaterad!");
    });

    it("should set completed_at when status is done", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "task-1", status: "done" },
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: "task-1",
        status: "done",
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "done",
          completed_at: expect.any(String),
        }),
      );
    });
  });

  describe("useDeleteTask", () => {
    it("should delete task successfully", async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      });

      const { result } = renderHook(() => useDeleteTask(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("task-to-delete");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockEq).toHaveBeenCalledWith("id", "task-to-delete");
      expect(toast.success).toHaveBeenCalledWith("Uppgift borttagen!");
    });
  });

  describe("useToggleTaskStatus", () => {
    it("should toggle task status to done", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "task-1", status: "done" },
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useToggleTaskStatus(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "task-1", status: "done" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "done",
          completed_at: expect.any(String),
        }),
      );
    });

    it("should clear completed_at when toggling from done", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "task-1", status: "pending" },
        error: null,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { result } = renderHook(() => useToggleTaskStatus(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: "task-1", status: "pending" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          completed_at: null,
        }),
      );
    });
  });
});
