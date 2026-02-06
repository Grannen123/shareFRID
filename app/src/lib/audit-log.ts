/**
 * Audit Logging System
 *
 * Provides comprehensive audit logging for:
 * - User actions (create, update, delete)
 * - Data access (view sensitive data)
 * - Authentication events
 * - GDPR-related actions
 */

import { supabase } from "./supabase";

// Audit event types
export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "export"
  | "login"
  | "logout"
  | "gdpr_export"
  | "gdpr_delete"
  | "permission_change"
  | "config_change";

export type AuditEntity =
  | "customer"
  | "contact"
  | "case"
  | "journal_entry"
  | "agreement"
  | "billing_line"
  | "invoice"
  | "task"
  | "user"
  | "knowledge_article"
  | "document"
  | "email";

export interface AuditEntry {
  id?: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityName?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit Logger class
 */
class AuditLogger {
  private queue: AuditEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isEnabled = true;

  constructor() {
    // Flush queue every 5 seconds
    this.flushInterval = setInterval(() => this.flush(), 5000);

    // Flush on page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  /**
   * Enable or disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<void> {
    if (!this.isEnabled) return;

    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      ipAddress: await this.getClientIP(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    this.queue.push(fullEntry);

    // Flush immediately for critical actions
    if (this.isCriticalAction(entry.action)) {
      await this.flush();
    }
  }

  /**
   * Log a create action
   */
  async logCreate(
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    data: Record<string, unknown>,
    user: { id: string; name: string },
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userName: user.name,
      action: "create",
      entity,
      entityId,
      entityName,
      newData: this.sanitizeData(data),
    });
  }

  /**
   * Log an update action
   */
  async logUpdate(
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    previousData: Record<string, unknown>,
    newData: Record<string, unknown>,
    user: { id: string; name: string },
  ): Promise<void> {
    const changedFields = this.getChangedFields(previousData, newData);

    await this.log({
      userId: user.id,
      userName: user.name,
      action: "update",
      entity,
      entityId,
      entityName,
      previousData: this.sanitizeData(previousData),
      newData: this.sanitizeData(newData),
      changedFields,
    });
  }

  /**
   * Log a delete action
   */
  async logDelete(
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    data: Record<string, unknown>,
    user: { id: string; name: string },
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userName: user.name,
      action: "delete",
      entity,
      entityId,
      entityName,
      previousData: this.sanitizeData(data),
    });
  }

  /**
   * Log a read/view action (for sensitive data)
   */
  async logRead(
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    user: { id: string; name: string },
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userName: user.name,
      action: "read",
      entity,
      entityId,
      entityName,
      metadata,
    });
  }

  /**
   * Log GDPR export action
   */
  async logGdprExport(
    entityId: string,
    entityType: string,
    user: { id: string; name: string },
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userName: user.name,
      action: "gdpr_export",
      entity: entityType as AuditEntity,
      entityId,
      metadata: { exportedAt: new Date().toISOString() },
    });
  }

  /**
   * Log GDPR deletion action
   */
  async logGdprDelete(
    entityId: string,
    entityType: string,
    entityName: string,
    user: { id: string; name: string },
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userName: user.name,
      action: "gdpr_delete",
      entity: entityType as AuditEntity,
      entityId,
      entityName,
      metadata: { deletedAt: new Date().toISOString() },
    });
  }

  /**
   * Query audit logs
   */
  async query(filter: AuditLogFilter): Promise<AuditEntry[]> {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    if (filter.userId) {
      query = query.eq("user_id", filter.userId);
    }
    if (filter.action) {
      query = query.eq("action", filter.action);
    }
    if (filter.entity) {
      query = query.eq("entity", filter.entity);
    }
    if (filter.entityId) {
      query = query.eq("entity_id", filter.entityId);
    }
    if (filter.fromDate) {
      query = query.gte("timestamp", filter.fromDate);
    }
    if (filter.toDate) {
      query = query.lte("timestamp", filter.toDate);
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    if (filter.offset) {
      query = query.range(
        filter.offset,
        filter.offset + (filter.limit || 50) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to query audit logs:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entity: AuditEntity,
    entityId: string,
  ): Promise<AuditEntry[]> {
    return this.query({
      entity,
      entityId,
      limit: 100,
    });
  }

  /**
   * Flush pending entries to database
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const entries = [...this.queue];
    this.queue = [];

    try {
      const { error } = await supabase.from("audit_logs").insert(
        entries.map((entry) => ({
          timestamp: entry.timestamp,
          user_id: entry.userId,
          user_name: entry.userName,
          action: entry.action,
          entity: entry.entity,
          entity_id: entry.entityId,
          entity_name: entry.entityName,
          previous_data: entry.previousData,
          new_data: entry.newData,
          changed_fields: entry.changedFields,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          metadata: entry.metadata,
        })),
      );

      if (error) {
        console.error("Failed to insert audit logs:", error);
        // Re-queue failed entries
        this.queue.unshift(...entries);
      }
    } catch (error) {
      console.error("Failed to flush audit logs:", error);
      // Re-queue on error
      this.queue.unshift(...entries);
    }
  }

  /**
   * Check if action is critical and should be logged immediately
   */
  private isCriticalAction(action: AuditAction): boolean {
    return [
      "delete",
      "gdpr_delete",
      "gdpr_export",
      "permission_change",
      "login",
      "logout",
    ].includes(action);
  }

  /**
   * Get changed fields between two objects
   */
  private getChangedFields(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
  ): string[] {
    const changed: string[] = [];
    const allKeys = new Set([
      ...Object.keys(previous),
      ...Object.keys(current),
    ]);

    for (const key of allKeys) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Sanitize data to remove sensitive fields
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "api_key",
      "personnummer",
      "bankgiro",
    ];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Get client IP address (simplified)
   */
  private async getClientIP(): Promise<string | undefined> {
    // In a real implementation, this would be passed from the server
    // or obtained via a service call
    return undefined;
  }

  /**
   * Stop the logger
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// React hook for audit logging
export { useAuditLog } from "@/hooks/useAuditLog";
