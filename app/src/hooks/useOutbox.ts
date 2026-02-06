/**
 * Outbox Hook
 *
 * React hook for using the outbox pattern for reliable writes.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getOutbox } from "@/lib/outbox";
import type {
  OutboxManager,
  OutboxOperation,
  OutboxConfig,
} from "@/lib/outbox";

interface UseOutboxReturn {
  operations: OutboxOperation[];
  pending: OutboxOperation[];
  failed: OutboxOperation[];
  isProcessing: boolean;
  isOnline: boolean;
  add: (
    type: OutboxOperation["type"],
    entity: string,
    entityId: string,
    payload: Record<string, unknown>,
    options?: { etag?: string; priority?: number },
  ) => Promise<OutboxOperation>;
  retry: (operationId: string) => Promise<void>;
  remove: (operationId: string) => Promise<void>;
  sync: () => Promise<void>;
}

export function useOutbox(config?: OutboxConfig): UseOutboxReturn {
  const [operations, setOperations] = useState<OutboxOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const outboxRef = useRef<OutboxManager | null>(null);
  const initializedRef = useRef(false);

  // Initialize outbox
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const outbox = getOutbox(config);
    outboxRef.current = outbox;

    outbox.init().then(() => {
      // Subscribe to changes
      const unsubscribe = outbox.subscribe((ops) => {
        setOperations(ops);
        setIsProcessing(outbox.getStatus().processing);
      });

      // Load initial operations
      outbox.getAll().then(setOperations);

      return () => {
        unsubscribe();
      };
    });
  }, [config]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Add operation
  const add = useCallback(
    async (
      type: OutboxOperation["type"],
      entity: string,
      entityId: string,
      payload: Record<string, unknown>,
      options?: { etag?: string; priority?: number },
    ) => {
      if (!outboxRef.current) {
        throw new Error("Outbox not initialized");
      }
      return outboxRef.current.add(type, entity, entityId, payload, options);
    },
    [],
  );

  // Retry operation
  const retry = useCallback(async (operationId: string) => {
    if (!outboxRef.current) return;
    await outboxRef.current.retry(operationId);
  }, []);

  // Remove operation
  const remove = useCallback(async (operationId: string) => {
    if (!outboxRef.current) return;
    await outboxRef.current.remove(operationId);
  }, []);

  // Force sync
  const sync = useCallback(async () => {
    if (!outboxRef.current) return;
    await outboxRef.current.sync();
  }, []);

  // Compute pending and failed
  const pending = operations.filter((op) => op.status === "pending");
  const failed = operations.filter((op) => op.status === "failed");

  return {
    operations,
    pending,
    failed,
    isProcessing,
    isOnline,
    add,
    retry,
    remove,
    sync,
  };
}
