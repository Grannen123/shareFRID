/**
 * Audit Log Hook
 *
 * React hook for easy audit logging in components.
 */

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  auditLogger,
  type AuditEntity,
  type AuditEntry,
  type AuditLogFilter,
} from "@/lib/audit-log";

interface UseAuditLogReturn {
  logCreate: (
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  logUpdate: (
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    previousData: Record<string, unknown>,
    newData: Record<string, unknown>,
  ) => Promise<void>;
  logDelete: (
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  logRead: (
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
  getEntityHistory: (
    entity: AuditEntity,
    entityId: string,
  ) => Promise<AuditEntry[]>;
  query: (filter: AuditLogFilter) => Promise<AuditEntry[]>;
}

export function useAuditLog(): UseAuditLogReturn {
  const { user } = useAuth();

  const getUser = useCallback(() => {
    return {
      id: user?.id || "anonymous",
      name: user?.email || "Anonymous",
    };
  }, [user]);

  const logCreate = useCallback(
    async (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      data: Record<string, unknown>,
    ) => {
      await auditLogger.logCreate(
        entity,
        entityId,
        entityName,
        data,
        getUser(),
      );
    },
    [getUser],
  );

  const logUpdate = useCallback(
    async (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      previousData: Record<string, unknown>,
      newData: Record<string, unknown>,
    ) => {
      await auditLogger.logUpdate(
        entity,
        entityId,
        entityName,
        previousData,
        newData,
        getUser(),
      );
    },
    [getUser],
  );

  const logDelete = useCallback(
    async (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      data: Record<string, unknown>,
    ) => {
      await auditLogger.logDelete(
        entity,
        entityId,
        entityName,
        data,
        getUser(),
      );
    },
    [getUser],
  );

  const logRead = useCallback(
    async (
      entity: AuditEntity,
      entityId: string,
      entityName: string,
      metadata?: Record<string, unknown>,
    ) => {
      await auditLogger.logRead(
        entity,
        entityId,
        entityName,
        getUser(),
        metadata,
      );
    },
    [getUser],
  );

  const getEntityHistory = useCallback(
    async (entity: AuditEntity, entityId: string) => {
      return auditLogger.getEntityHistory(entity, entityId);
    },
    [],
  );

  const query = useCallback(async (filter: AuditLogFilter) => {
    return auditLogger.query(filter);
  }, []);

  return {
    logCreate,
    logUpdate,
    logDelete,
    logRead,
    getEntityHistory,
    query,
  };
}
