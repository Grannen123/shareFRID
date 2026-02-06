/**
 * Calendar Sync Hook
 *
 * Provides functionality to sync cases with Outlook Calendar.
 */

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createGraphClient, type GraphCalendarEvent } from "@/lib/graph-client";

interface CaseCalendarEvent {
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  customerName: string;
  eventType: "deadline" | "meeting" | "follow_up" | "site_visit";
  dateTime: string;
  durationMinutes: number;
  location?: string;
  description?: string;
  attendees?: string[];
  isOnlineMeeting?: boolean;
}

interface UseCalendarSyncReturn {
  createCaseEvent: (
    event: CaseCalendarEvent,
  ) => Promise<GraphCalendarEvent | null>;
  updateCaseEvent: (
    eventId: string,
    updates: Partial<CaseCalendarEvent>,
  ) => Promise<GraphCalendarEvent | null>;
  deleteCaseEvent: (eventId: string) => Promise<boolean>;
  findCaseEvents: (caseId: string) => Promise<GraphCalendarEvent[]>;
  syncDeadline: (
    caseId: string,
    caseNumber: string,
    deadline: string,
    customerName: string,
  ) => Promise<GraphCalendarEvent | null>;
}

const EVENT_TYPE_LABELS = {
  deadline: "Deadline",
  meeting: "Möte",
  follow_up: "Uppföljning",
  site_visit: "Platsbesök",
};

export function useCalendarSync(): UseCalendarSyncReturn {
  const { getAccessToken, isMicrosoftConnected } = useAuth();

  // Create calendar event for a case
  const createCaseEvent = useCallback(
    async (event: CaseCalendarEvent): Promise<GraphCalendarEvent | null> => {
      if (!isMicrosoftConnected) return null;

      try {
        const token = await getAccessToken();
        if (!token) return null;

        const client = createGraphClient(token);
        const typeLabel = EVENT_TYPE_LABELS[event.eventType];

        const calendarEvent = await client.createCalendarEvent({
          subject: `[${event.caseNumber}] ${typeLabel}: ${event.caseTitle}`,
          body: formatEventBody(event),
          start: {
            dateTime: event.dateTime,
            timeZone: "Europe/Stockholm",
          },
          end: {
            dateTime: addMinutes(event.dateTime, event.durationMinutes),
            timeZone: "Europe/Stockholm",
          },
          location: event.location,
          attendees: event.attendees,
          isOnlineMeeting: event.isOnlineMeeting,
        });

        return calendarEvent;
      } catch (error) {
        console.error("Failed to create calendar event:", error);
        return null;
      }
    },
    [getAccessToken, isMicrosoftConnected],
  );

  // Update calendar event
  const updateCaseEvent = useCallback(
    async (
      eventId: string,
      updates: Partial<CaseCalendarEvent>,
    ): Promise<GraphCalendarEvent | null> => {
      if (!isMicrosoftConnected) return null;

      try {
        const token = await getAccessToken();
        if (!token) return null;

        const client = createGraphClient(token);

        const eventUpdates: Parameters<typeof client.updateCalendarEvent>[1] =
          {};

        if (updates.caseTitle && updates.caseNumber) {
          const typeLabel = updates.eventType
            ? EVENT_TYPE_LABELS[updates.eventType]
            : "";
          eventUpdates.subject = `[${updates.caseNumber}] ${typeLabel}: ${updates.caseTitle}`;
        }

        if (updates.description) {
          eventUpdates.body = updates.description;
        }

        if (updates.dateTime) {
          eventUpdates.start = {
            dateTime: updates.dateTime,
            timeZone: "Europe/Stockholm",
          };
          eventUpdates.end = {
            dateTime: addMinutes(
              updates.dateTime,
              updates.durationMinutes || 60,
            ),
            timeZone: "Europe/Stockholm",
          };
        }

        if (updates.location) {
          eventUpdates.location = updates.location;
        }

        return await client.updateCalendarEvent(eventId, eventUpdates);
      } catch (error) {
        console.error("Failed to update calendar event:", error);
        return null;
      }
    },
    [getAccessToken, isMicrosoftConnected],
  );

  // Delete calendar event
  const deleteCaseEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!isMicrosoftConnected) return false;

      try {
        const token = await getAccessToken();
        if (!token) return false;

        const client = createGraphClient(token);
        await client.deleteCalendarEvent(eventId);
        return true;
      } catch (error) {
        console.error("Failed to delete calendar event:", error);
        return false;
      }
    },
    [getAccessToken, isMicrosoftConnected],
  );

  // Find calendar events for a case
  const findCaseEvents = useCallback(
    async (caseId: string): Promise<GraphCalendarEvent[]> => {
      if (!isMicrosoftConnected) return [];

      try {
        const token = await getAccessToken();
        if (!token) return [];

        const client = createGraphClient(token);

        // Search for events with the case ID in the subject
        // This is a simple approach - could be enhanced with extended properties
        const now = new Date();
        const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        const result = await client.getCalendarEvents({
          startDateTime: now.toISOString(),
          endDateTime: futureDate.toISOString(),
          top: 50,
        });

        // Filter events that match the case
        return result.value.filter(
          (event) =>
            event.subject.includes(`[${caseId}]`) ||
            event.body.content.includes(`case-id:${caseId}`),
        );
      } catch (error) {
        console.error("Failed to find case events:", error);
        return [];
      }
    },
    [getAccessToken, isMicrosoftConnected],
  );

  // Quick sync for case deadline
  const syncDeadline = useCallback(
    async (
      caseId: string,
      caseNumber: string,
      deadline: string,
      customerName: string,
    ): Promise<GraphCalendarEvent | null> => {
      return createCaseEvent({
        caseId,
        caseNumber,
        caseTitle: "Deadline",
        customerName,
        eventType: "deadline",
        dateTime: deadline,
        durationMinutes: 30,
        description: `Deadline för ärende ${caseNumber} (${customerName})`,
      });
    },
    [createCaseEvent],
  );

  return {
    createCaseEvent,
    updateCaseEvent,
    deleteCaseEvent,
    findCaseEvents,
    syncDeadline,
  };
}

// Helper functions
function formatEventBody(event: CaseCalendarEvent): string {
  return `
<b>Ärende:</b> ${event.caseNumber} - ${event.caseTitle}<br/>
<b>Kund:</b> ${event.customerName}<br/>
${event.description ? `<br/>${event.description}` : ""}
<br/><br/>
<i style="color:#666">case-id:${event.caseId}</i>
  `.trim();
}

function addMinutes(dateTime: string, minutes: number): string {
  const date = new Date(dateTime);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
