/**
 * Email Link Hook
 *
 * Provides functionality to link emails to cases and customers.
 */

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createGraphClient, type GraphEmail } from "@/lib/graph-client";
import { supabase } from "@/lib/supabase";

interface LinkedEmail {
  id: string;
  emailId: string;
  caseId?: string;
  customerId?: string;
  subject: string;
  from: string;
  receivedDateTime: string;
  linkedAt: string;
  linkedBy: string;
  notes?: string;
}

interface UseEmailLinkReturn {
  linkedEmails: LinkedEmail[];
  isLoading: boolean;
  linkEmailToCase: (
    emailId: string,
    caseId: string,
    notes?: string,
  ) => Promise<boolean>;
  linkEmailToCustomer: (
    emailId: string,
    customerId: string,
    notes?: string,
  ) => Promise<boolean>;
  unlinkEmail: (linkedEmailId: string) => Promise<boolean>;
  getLinkedEmails: (
    caseId?: string,
    customerId?: string,
  ) => Promise<LinkedEmail[]>;
  getEmailDetails: (emailId: string) => Promise<GraphEmail | null>;
  searchEmails: (query: string, limit?: number) => Promise<GraphEmail[]>;
}

export function useEmailLink(): UseEmailLinkReturn {
  const { user, getAccessToken, isMicrosoftConnected } = useAuth();
  const [linkedEmails, setLinkedEmails] = useState<LinkedEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Link email to case
  const linkEmailToCase = useCallback(
    async (
      emailId: string,
      caseId: string,
      notes?: string,
    ): Promise<boolean> => {
      if (!isMicrosoftConnected || !user) return false;

      try {
        setIsLoading(true);

        // Get email details
        const token = await getAccessToken();
        if (!token) return false;

        const client = createGraphClient(token);
        const email = await client.getEmail(emailId);

        // Save link to database
        const { error } = await supabase.from("linked_emails").insert({
          email_id: emailId,
          case_id: caseId,
          subject: email.subject,
          from_address: email.from.emailAddress.address,
          from_name: email.from.emailAddress.name,
          received_at: email.receivedDateTime,
          linked_by: user.id,
          notes,
        });

        if (error) {
          console.error("Failed to link email:", error);
          return false;
        }

        // Refresh linked emails
        await getLinkedEmails(caseId);
        return true;
      } catch (error) {
        console.error("Failed to link email to case:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getAccessToken, isMicrosoftConnected, user],
  );

  // Link email to customer
  const linkEmailToCustomer = useCallback(
    async (
      emailId: string,
      customerId: string,
      notes?: string,
    ): Promise<boolean> => {
      if (!isMicrosoftConnected || !user) return false;

      try {
        setIsLoading(true);

        const token = await getAccessToken();
        if (!token) return false;

        const client = createGraphClient(token);
        const email = await client.getEmail(emailId);

        const { error } = await supabase.from("linked_emails").insert({
          email_id: emailId,
          customer_id: customerId,
          subject: email.subject,
          from_address: email.from.emailAddress.address,
          from_name: email.from.emailAddress.name,
          received_at: email.receivedDateTime,
          linked_by: user.id,
          notes,
        });

        if (error) {
          console.error("Failed to link email:", error);
          return false;
        }

        await getLinkedEmails(undefined, customerId);
        return true;
      } catch (error) {
        console.error("Failed to link email to customer:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getAccessToken, isMicrosoftConnected, user],
  );

  // Unlink email
  const unlinkEmail = useCallback(
    async (linkedEmailId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("linked_emails")
          .delete()
          .eq("id", linkedEmailId);

        if (error) {
          console.error("Failed to unlink email:", error);
          return false;
        }

        setLinkedEmails((prev) => prev.filter((e) => e.id !== linkedEmailId));
        return true;
      } catch (error) {
        console.error("Failed to unlink email:", error);
        return false;
      }
    },
    [],
  );

  // Get linked emails for case or customer
  const getLinkedEmails = useCallback(
    async (caseId?: string, customerId?: string): Promise<LinkedEmail[]> => {
      try {
        setIsLoading(true);

        let query = supabase.from("linked_emails").select("*");

        if (caseId) {
          query = query.eq("case_id", caseId);
        }
        if (customerId) {
          query = query.eq("customer_id", customerId);
        }

        query = query.order("received_at", { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error("Failed to get linked emails:", error);
          return [];
        }

        const emails: LinkedEmail[] =
          data?.map((row) => ({
            id: row.id,
            emailId: row.email_id,
            caseId: row.case_id,
            customerId: row.customer_id,
            subject: row.subject,
            from: row.from_address,
            receivedDateTime: row.received_at,
            linkedAt: row.created_at,
            linkedBy: row.linked_by,
            notes: row.notes,
          })) || [];

        setLinkedEmails(emails);
        return emails;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Get email details from Graph API
  const getEmailDetails = useCallback(
    async (emailId: string): Promise<GraphEmail | null> => {
      if (!isMicrosoftConnected) return null;

      try {
        const token = await getAccessToken();
        if (!token) return null;

        const client = createGraphClient(token);
        return await client.getEmail(emailId);
      } catch (error) {
        console.error("Failed to get email details:", error);
        return null;
      }
    },
    [getAccessToken, isMicrosoftConnected],
  );

  // Search emails
  const searchEmails = useCallback(
    async (query: string, limit = 25): Promise<GraphEmail[]> => {
      if (!isMicrosoftConnected || !query.trim()) return [];

      try {
        const token = await getAccessToken();
        if (!token) return [];

        const client = createGraphClient(token);
        const result = await client.searchEmails(query, limit);
        return result.value;
      } catch (error) {
        console.error("Failed to search emails:", error);
        return [];
      }
    },
    [getAccessToken, isMicrosoftConnected],
  );

  return {
    linkedEmails,
    isLoading,
    linkEmailToCase,
    linkEmailToCustomer,
    unlinkEmail,
    getLinkedEmails,
    getEmailDetails,
    searchEmails,
  };
}
