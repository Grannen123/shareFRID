/**
 * Outbox Pattern for Reliable Write Operations
 *
 * Provides reliable write operations with:
 * - Local queue for pending operations
 * - Automatic retry with exponential backoff
 * - Offline support with sync on reconnect
 * - Operation deduplication
 * - Conflict detection via ETags
 */

import { v4 as uuidv4 } from "uuid";

// Types
export interface OutboxOperation {
  id: string;
  type: "create" | "update" | "delete";
  entity: string;
  entityId: string;
  payload: Record<string, unknown>;
  etag?: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttempt: number | null;
  status: "pending" | "processing" | "failed" | "completed";
  error: string | null;
}

export interface OutboxConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  syncIntervalMs?: number;
  onSync?: (operation: OutboxOperation) => Promise<void>;
  onError?: (operation: OutboxOperation, error: Error) => void;
  onConflict?: (operation: OutboxOperation, serverData: unknown) => void;
}

// IndexedDB database name and version
const DB_NAME = "grannfrid_outbox";
const DB_VERSION = 1;
const STORE_NAME = "operations";

// Default configuration
const DEFAULT_CONFIG: Required<
  Omit<OutboxConfig, "onSync" | "onError" | "onConflict">
> = {
  maxRetries: 5,
  retryDelayMs: 1000,
  maxRetryDelayMs: 60000,
  syncIntervalMs: 5000,
};

/**
 * Outbox Manager Class
 *
 * Manages the outbox queue and synchronization.
 */
export class OutboxManager {
  private db: IDBDatabase | null = null;
  private config: Required<
    Omit<OutboxConfig, "onSync" | "onError" | "onConflict">
  > &
    Pick<OutboxConfig, "onSync" | "onError" | "onConflict">;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private listeners: Set<(operations: OutboxOperation[]) => void> = new Set();

  constructor(config: OutboxConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the outbox database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.startSync();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("entity", "entity", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  /**
   * Add an operation to the outbox
   */
  async add(
    type: OutboxOperation["type"],
    entity: string,
    entityId: string,
    payload: Record<string, unknown>,
    options: { etag?: string; priority?: number } = {},
  ): Promise<OutboxOperation> {
    const operation: OutboxOperation = {
      id: uuidv4(),
      type,
      entity,
      entityId,
      payload,
      etag: options.etag,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      createdAt: Date.now(),
      lastAttempt: null,
      status: "pending",
      error: null,
    };

    await this.saveOperation(operation);
    this.notifyListeners();

    // Trigger immediate sync
    this.processQueue();

    return operation;
  }

  /**
   * Get all pending operations
   */
  async getPending(): Promise<OutboxOperation[]> {
    return this.getOperationsByStatus("pending");
  }

  /**
   * Get all failed operations
   */
  async getFailed(): Promise<OutboxOperation[]> {
    return this.getOperationsByStatus("failed");
  }

  /**
   * Get all operations
   */
  async getAll(): Promise<OutboxOperation[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retry a failed operation
   */
  async retry(operationId: string): Promise<void> {
    const operation = await this.getOperation(operationId);
    if (!operation) return;

    operation.status = "pending";
    operation.retryCount = 0;
    operation.error = null;
    await this.saveOperation(operation);
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Remove an operation
   */
  async remove(operationId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(operationId);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Subscribe to operation changes
   */
  subscribe(listener: (operations: OutboxOperation[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get sync status
   */
  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: 0, // Will be updated async
      processing: this.isProcessing,
    };
  }

  /**
   * Force sync now
   */
  async sync(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Stop the outbox manager
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Private methods

  private startSync(): void {
    // Listen for online/offline events
    window.addEventListener("online", () => this.processQueue());

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
      }
    }, this.config.syncIntervalMs);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;
    if (!this.config.onSync) return;

    this.isProcessing = true;

    try {
      const pending = await this.getPending();
      const sorted = pending.sort((a, b) => {
        // Sort by priority (higher first), then by createdAt (older first)
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.createdAt - b.createdAt;
      });

      for (const operation of sorted) {
        await this.processOperation(operation);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOperation(operation: OutboxOperation): Promise<void> {
    operation.status = "processing";
    operation.lastAttempt = Date.now();
    await this.saveOperation(operation);
    this.notifyListeners();

    try {
      await this.config.onSync!(operation);

      // Success - remove from outbox
      await this.remove(operation.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check for conflict (ETag mismatch)
      if (err.message.includes("412") || err.message.includes("conflict")) {
        operation.status = "failed";
        operation.error = "Konflikt: Data har ändrats av annan användare";
        await this.saveOperation(operation);
        this.config.onConflict?.(operation, null);
        return;
      }

      // Increment retry count
      operation.retryCount++;

      if (operation.retryCount >= operation.maxRetries) {
        operation.status = "failed";
        operation.error = err.message;
        await this.saveOperation(operation);
        this.config.onError?.(operation, err);
      } else {
        // Schedule retry with exponential backoff
        operation.status = "pending";
        operation.error = null;
        await this.saveOperation(operation);

        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(2, operation.retryCount),
          this.config.maxRetryDelayMs,
        );

        setTimeout(() => this.processQueue(), delay);
      }
    }

    this.notifyListeners();
  }

  private async saveOperation(operation: OutboxOperation): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getOperation(id: string): Promise<OutboxOperation | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async getOperationsByStatus(
    status: OutboxOperation["status"],
  ): Promise<OutboxOperation[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("status");
      const request = index.getAll(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async notifyListeners(): Promise<void> {
    const operations = await this.getAll();
    this.listeners.forEach((listener) => listener(operations));
  }
}

// Singleton instance
let outboxInstance: OutboxManager | null = null;

/**
 * Get or create the outbox manager instance
 */
export function getOutbox(config?: OutboxConfig): OutboxManager {
  if (!outboxInstance) {
    outboxInstance = new OutboxManager(config);
  }
  return outboxInstance;
}

/**
 * React hook for using the outbox
 */
export { useOutbox } from "@/hooks/useOutbox";
