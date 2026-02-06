/**
 * React hooks for Microsoft Graph API
 *
 * Provides hooks for Outlook, Calendar, and SharePoint integration.
 */

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  createGraphClient,
  type GraphClient,
  type GraphEmail,
  type GraphCalendarEvent,
  type GraphDriveItem,
  type GraphSite,
  type GraphDrive,
} from "@/lib/graph-client";

// Hook to get Graph client instance
export function useGraphClient(): GraphClient | null {
  const { getAccessToken, isMicrosoftConnected } = useAuth();
  const [client, setClient] = useState<GraphClient | null>(null);

  const initClient = useCallback(async () => {
    if (!isMicrosoftConnected) return null;

    const token = await getAccessToken();
    if (!token) return null;

    const graphClient = createGraphClient(token);
    setClient(graphClient);
    return graphClient;
  }, [getAccessToken, isMicrosoftConnected]);

  // Initialize on first call
  if (!client && isMicrosoftConnected) {
    initClient();
  }

  return client;
}

// ============================================
// Outlook / Email Hooks
// ============================================

export function useEmails(options?: {
  top?: number;
  skip?: number;
  filter?: string;
  search?: string;
}) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["emails", options],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getEmails(options);
    },
    enabled: isMicrosoftConnected,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useEmail(messageId: string | null) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["email", messageId],
    queryFn: async () => {
      if (!messageId) return null;
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getEmail(messageId);
    },
    enabled: isMicrosoftConnected && !!messageId,
  });
}

export function useSendEmail() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: {
      subject: string;
      body: string;
      toRecipients: string[];
      ccRecipients?: string[];
      importance?: "low" | "normal" | "high";
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      await client.sendEmail(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useMarkEmailAsRead() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      await client.markEmailAsRead(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

// ============================================
// Calendar Hooks
// ============================================

export function useCalendarEvents(options?: {
  startDateTime?: string;
  endDateTime?: string;
  top?: number;
}) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["calendarEvents", options],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getCalendarEvents(options);
    },
    enabled: isMicrosoftConnected,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCalendarEvent(eventId: string | null) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["calendarEvent", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getCalendarEvent(eventId);
    },
    enabled: isMicrosoftConnected && !!eventId,
  });
}

export function useCreateCalendarEvent() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      subject: string;
      body?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      location?: string;
      attendees?: string[];
      isOnlineMeeting?: boolean;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.createCalendarEvent(event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      updates,
    }: {
      eventId: string;
      updates: Partial<{
        subject: string;
        body: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        location: string;
      }>;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.updateCalendarEvent(eventId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      await client.deleteCalendarEvent(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
  });
}

// ============================================
// SharePoint / OneDrive Hooks
// ============================================

export function useSites(search?: string) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["sites", search],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getSites(search);
    },
    enabled: isMicrosoftConnected,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useSiteDrives(siteId: string | null) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["siteDrives", siteId],
    queryFn: async () => {
      if (!siteId) return { value: [] };
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getSiteDrives(siteId);
    },
    enabled: isMicrosoftConnected && !!siteId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useDriveItems(driveId: string | null, folderId?: string) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["driveItems", driveId, folderId],
    queryFn: async () => {
      if (!driveId) return { value: [] };
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getDriveItems(driveId, folderId);
    },
    enabled: isMicrosoftConnected && !!driveId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCreateFolder() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driveId,
      parentId,
      folderName,
    }: {
      driveId: string;
      parentId: string;
      folderName: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.createFolder(driveId, parentId, folderName);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["driveItems", variables.driveId],
      });
    },
  });
}

export function useUploadFile() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driveId,
      parentId,
      fileName,
      content,
      contentType,
    }: {
      driveId: string;
      parentId: string;
      fileName: string;
      content: Blob | ArrayBuffer;
      contentType?: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.uploadFile(
        driveId,
        parentId,
        fileName,
        content,
        contentType,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["driveItems", variables.driveId],
      });
    },
  });
}

export function useDownloadFile() {
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      driveId,
      itemId,
    }: {
      driveId: string;
      itemId: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.downloadFile(driveId, itemId);
    },
  });
}

export function useDeleteItem() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driveId,
      itemId,
    }: {
      driveId: string;
      itemId: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      await client.deleteItem(driveId, itemId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["driveItems", variables.driveId],
      });
    },
  });
}

export function useSearchDrive(driveId: string | null, query: string) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["driveSearch", driveId, query],
    queryFn: async () => {
      if (!driveId || !query) return { value: [] };
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.searchDrive(driveId, query);
    },
    enabled: isMicrosoftConnected && !!driveId && query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateSharingLink() {
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      driveId,
      itemId,
      type = "view",
      scope = "organization",
    }: {
      driveId: string;
      itemId: string;
      type?: "view" | "edit";
      scope?: "anonymous" | "organization";
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.createSharingLink(driveId, itemId, type, scope);
    },
  });
}

// ============================================
// Grannfrid-specific hooks
// ============================================

export function useCreateCustomerFolder() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driveId,
      parentId,
      customerName,
      fortnoxNumber,
    }: {
      driveId: string;
      parentId: string;
      customerName: string;
      fortnoxNumber: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.createCustomerFolder(
        driveId,
        parentId,
        customerName,
        fortnoxNumber,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["driveItems", variables.driveId],
      });
    },
  });
}

export function useCreateCaseFolder() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driveId,
      customerFolderId,
      caseNumber,
      caseTitle,
    }: {
      driveId: string;
      customerFolderId: string;
      caseNumber: string;
      caseTitle: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.createCaseFolder(
        driveId,
        customerFolderId,
        caseNumber,
        caseTitle,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["driveItems", variables.driveId],
      });
    },
  });
}

export function useCustomerEmails(contactEmails: string[], top = 25) {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  return useQuery({
    queryKey: ["customerEmails", contactEmails, top],
    queryFn: async () => {
      if (contactEmails.length === 0) return { value: [] };
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const client = createGraphClient(token);
      return client.getCustomerEmails(contactEmails, top);
    },
    enabled: isMicrosoftConnected && contactEmails.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Re-export types for convenience
export type {
  GraphEmail,
  GraphCalendarEvent,
  GraphDriveItem,
  GraphSite,
  GraphDrive,
};
