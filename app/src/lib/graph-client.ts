/**
 * Microsoft Graph API Client for Grannfrid CRM
 *
 * Provides methods for:
 * - Outlook email integration
 * - Calendar management
 * - SharePoint document management
 */

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// Types for Graph API responses
export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
}

export interface GraphEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: "low" | "normal" | "high";
  webLink: string;
}

export interface GraphCalendarEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
  };
  attendees: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    type: "required" | "optional" | "resource";
  }>;
  organizer: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  webLink: string;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  webUrl: string;
  folder?: {
    childCount: number;
  };
  file?: {
    mimeType: string;
  };
  createdBy: {
    user: {
      displayName: string;
    };
  };
  lastModifiedBy: {
    user: {
      displayName: string;
    };
  };
  parentReference: {
    driveId: string;
    id: string;
    path: string;
  };
}

export interface GraphSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface GraphDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
}

// Error types
export class GraphApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "GraphApiError";
    this.status = status;
    this.code = code;
  }
}

// Create Graph API client
export function createGraphClient(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  async function graphFetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new GraphApiError(
        errorData.error?.message || `Graph API error: ${response.status}`,
        response.status,
        errorData.error?.code,
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  return {
    // ============================================
    // User / Profile
    // ============================================

    async getMe(): Promise<GraphUser> {
      return graphFetch<GraphUser>("/me");
    },

    async getMyPhoto(): Promise<Blob | null> {
      try {
        const response = await fetch(`${GRAPH_API_BASE}/me/photo/$value`, {
          headers,
        });
        if (!response.ok) return null;
        return response.blob();
      } catch {
        return null;
      }
    },

    // ============================================
    // Outlook / Email
    // ============================================

    async getEmails(options?: {
      top?: number;
      skip?: number;
      filter?: string;
      orderBy?: string;
      search?: string;
    }): Promise<{ value: GraphEmail[]; "@odata.nextLink"?: string }> {
      const params = new URLSearchParams();
      if (options?.top) params.set("$top", options.top.toString());
      if (options?.skip) params.set("$skip", options.skip.toString());
      if (options?.filter) params.set("$filter", options.filter);
      if (options?.orderBy) params.set("$orderby", options.orderBy);
      if (options?.search) params.set("$search", `"${options.search}"`);

      const query = params.toString();
      return graphFetch(`/me/messages${query ? `?${query}` : ""}`);
    },

    async getEmail(messageId: string): Promise<GraphEmail> {
      return graphFetch(`/me/messages/${messageId}`);
    },

    async sendEmail(email: {
      subject: string;
      body: string;
      toRecipients: string[];
      ccRecipients?: string[];
      importance?: "low" | "normal" | "high";
    }): Promise<void> {
      await graphFetch("/me/sendMail", {
        method: "POST",
        body: JSON.stringify({
          message: {
            subject: email.subject,
            body: {
              contentType: "HTML",
              content: email.body,
            },
            toRecipients: email.toRecipients.map((addr) => ({
              emailAddress: { address: addr },
            })),
            ccRecipients: email.ccRecipients?.map((addr) => ({
              emailAddress: { address: addr },
            })),
            importance: email.importance || "normal",
          },
          saveToSentItems: true,
        }),
      });
    },

    async markEmailAsRead(messageId: string): Promise<void> {
      await graphFetch(`/me/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      });
    },

    async searchEmails(
      query: string,
      top = 25,
    ): Promise<{ value: GraphEmail[] }> {
      return this.getEmails({ search: query, top });
    },

    // ============================================
    // Calendar
    // ============================================

    async getCalendarEvents(options?: {
      startDateTime?: string;
      endDateTime?: string;
      top?: number;
    }): Promise<{ value: GraphCalendarEvent[] }> {
      const params = new URLSearchParams();
      if (options?.top) params.set("$top", options.top.toString());
      params.set("$orderby", "start/dateTime");

      // Use calendarView for date range queries
      if (options?.startDateTime && options?.endDateTime) {
        params.set("startDateTime", options.startDateTime);
        params.set("endDateTime", options.endDateTime);
        const query = params.toString();
        return graphFetch(`/me/calendarView?${query}`);
      }

      const query = params.toString();
      return graphFetch(`/me/events${query ? `?${query}` : ""}`);
    },

    async getCalendarEvent(eventId: string): Promise<GraphCalendarEvent> {
      return graphFetch(`/me/events/${eventId}`);
    },

    async createCalendarEvent(event: {
      subject: string;
      body?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      location?: string;
      attendees?: string[];
      isOnlineMeeting?: boolean;
    }): Promise<GraphCalendarEvent> {
      return graphFetch("/me/events", {
        method: "POST",
        body: JSON.stringify({
          subject: event.subject,
          body: event.body
            ? {
                contentType: "HTML",
                content: event.body,
              }
            : undefined,
          start: event.start,
          end: event.end,
          location: event.location
            ? { displayName: event.location }
            : undefined,
          attendees: event.attendees?.map((email) => ({
            emailAddress: { address: email },
            type: "required",
          })),
          isOnlineMeeting: event.isOnlineMeeting,
          onlineMeetingProvider: event.isOnlineMeeting
            ? "teamsForBusiness"
            : undefined,
        }),
      });
    },

    async updateCalendarEvent(
      eventId: string,
      updates: Partial<{
        subject: string;
        body: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        location: string;
      }>,
    ): Promise<GraphCalendarEvent> {
      const body: Record<string, unknown> = {};
      if (updates.subject) body.subject = updates.subject;
      if (updates.body)
        body.body = { contentType: "HTML", content: updates.body };
      if (updates.start) body.start = updates.start;
      if (updates.end) body.end = updates.end;
      if (updates.location) body.location = { displayName: updates.location };

      return graphFetch(`/me/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },

    async deleteCalendarEvent(eventId: string): Promise<void> {
      await graphFetch(`/me/events/${eventId}`, {
        method: "DELETE",
      });
    },

    // ============================================
    // SharePoint / OneDrive
    // ============================================

    async getSites(search?: string): Promise<{ value: GraphSite[] }> {
      if (search) {
        return graphFetch(`/sites?search=${encodeURIComponent(search)}`);
      }
      return graphFetch("/sites?search=*");
    },

    async getSite(siteId: string): Promise<GraphSite> {
      return graphFetch(`/sites/${siteId}`);
    },

    async getSiteDrives(siteId: string): Promise<{ value: GraphDrive[] }> {
      return graphFetch(`/sites/${siteId}/drives`);
    },

    async getDriveItems(
      driveId: string,
      folderId?: string,
    ): Promise<{ value: GraphDriveItem[] }> {
      const path = folderId
        ? `/drives/${driveId}/items/${folderId}/children`
        : `/drives/${driveId}/root/children`;
      return graphFetch(path);
    },

    async getDriveItem(
      driveId: string,
      itemId: string,
    ): Promise<GraphDriveItem> {
      return graphFetch(`/drives/${driveId}/items/${itemId}`);
    },

    async createFolder(
      driveId: string,
      parentId: string,
      folderName: string,
    ): Promise<GraphDriveItem> {
      return graphFetch(`/drives/${driveId}/items/${parentId}/children`, {
        method: "POST",
        body: JSON.stringify({
          name: folderName,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        }),
      });
    },

    async uploadFile(
      driveId: string,
      parentId: string,
      fileName: string,
      content: Blob | ArrayBuffer,
      contentType?: string,
    ): Promise<GraphDriveItem> {
      const response = await fetch(
        `${GRAPH_API_BASE}/drives/${driveId}/items/${parentId}:/${encodeURIComponent(fileName)}:/content`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": contentType || "application/octet-stream",
          },
          body: content,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GraphApiError(
          errorData.error?.message || `Upload failed: ${response.status}`,
          response.status,
          errorData.error?.code,
        );
      }

      return response.json();
    },

    async downloadFile(driveId: string, itemId: string): Promise<Blob> {
      const response = await fetch(
        `${GRAPH_API_BASE}/drives/${driveId}/items/${itemId}/content`,
        { headers },
      );

      if (!response.ok) {
        throw new GraphApiError(
          `Download failed: ${response.status}`,
          response.status,
        );
      }

      return response.blob();
    },

    async deleteItem(driveId: string, itemId: string): Promise<void> {
      await graphFetch(`/drives/${driveId}/items/${itemId}`, {
        method: "DELETE",
      });
    },

    async searchDrive(
      driveId: string,
      query: string,
    ): Promise<{ value: GraphDriveItem[] }> {
      return graphFetch(
        `/drives/${driveId}/root/search(q='${encodeURIComponent(query)}')`,
      );
    },

    async getItemPermissions(
      driveId: string,
      itemId: string,
    ): Promise<{ value: unknown[] }> {
      return graphFetch(`/drives/${driveId}/items/${itemId}/permissions`);
    },

    async createSharingLink(
      driveId: string,
      itemId: string,
      type: "view" | "edit" = "view",
      scope: "anonymous" | "organization" = "organization",
    ): Promise<{ link: { webUrl: string } }> {
      return graphFetch(`/drives/${driveId}/items/${itemId}/createLink`, {
        method: "POST",
        body: JSON.stringify({ type, scope }),
      });
    },

    // ============================================
    // Utility methods for Grannfrid-specific operations
    // ============================================

    /**
     * Create a customer folder structure in SharePoint
     */
    async createCustomerFolder(
      driveId: string,
      parentId: string,
      customerName: string,
      fortnoxNumber: string,
    ): Promise<GraphDriveItem> {
      const folderName = `${fortnoxNumber} - ${customerName}`;
      const folder = await this.createFolder(driveId, parentId, folderName);

      // Create subfolders
      await Promise.all([
        this.createFolder(driveId, folder.id, "Avtal"),
        this.createFolder(driveId, folder.id, "Ärenden"),
        this.createFolder(driveId, folder.id, "Fakturor"),
        this.createFolder(driveId, folder.id, "Korrespondens"),
      ]);

      return folder;
    },

    /**
     * Create a case folder structure
     */
    async createCaseFolder(
      driveId: string,
      customerFolderId: string,
      caseNumber: string,
      caseTitle: string,
    ): Promise<GraphDriveItem> {
      const arendenFolder = await this.getDriveItems(driveId, customerFolderId);
      const arendenFolderItem = arendenFolder.value.find(
        (item) => item.name === "Ärenden",
      );

      if (!arendenFolderItem) {
        throw new Error("Ärenden-mappen hittades inte");
      }

      const folderName = `${caseNumber} - ${caseTitle}`;
      return this.createFolder(driveId, arendenFolderItem.id, folderName);
    },

    /**
     * Get emails related to a customer (by email domain or contact emails)
     */
    async getCustomerEmails(
      contactEmails: string[],
      top = 25,
    ): Promise<{ value: GraphEmail[] }> {
      const filter = contactEmails
        .map((email) => `from/emailAddress/address eq '${email}'`)
        .join(" or ");

      return this.getEmails({ filter, top, orderBy: "receivedDateTime desc" });
    },
  };
}

export type GraphClient = ReturnType<typeof createGraphClient>;
