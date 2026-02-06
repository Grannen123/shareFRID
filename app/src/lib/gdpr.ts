/**
 * GDPR Tools
 *
 * Provides GDPR compliance functionality:
 * - Data export (right of access)
 * - Data deletion (right to be forgotten)
 * - Consent management
 * - Data portability
 */

import { supabase } from "./supabase";
import { auditLogger } from "./audit-log";

// Types
export interface GdprDataExport {
  exportedAt: string;
  format: "json" | "csv";
  entities: {
    customers?: unknown[];
    contacts?: unknown[];
    cases?: unknown[];
    journalEntries?: unknown[];
    tasks?: unknown[];
    invoices?: unknown[];
  };
  metadata: {
    requestedBy: string;
    reason?: string;
    entityType?: string;
    entityId?: string;
  };
}

export interface GdprDeleteRequest {
  entityType: "customer" | "contact" | "case";
  entityId: string;
  reason: string;
  requestedBy: string;
  confirmationRequired: boolean;
}

export interface GdprDeleteResult {
  success: boolean;
  deletedEntities: { type: string; id: string; name?: string }[];
  errors: string[];
  auditLogId?: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType:
    | "data_processing"
    | "marketing"
    | "ai_processing"
    | "third_party";
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  ipAddress?: string;
  version: string;
}

/**
 * Export all data related to a customer (GDPR Article 15)
 */
export async function exportCustomerData(
  customerId: string,
  format: "json" | "csv" = "json",
  requestedBy: { id: string; name: string },
): Promise<GdprDataExport> {
  // Fetch all related data
  const [customerResult, contactsResult, casesResult, _agreementsResult] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).single(),
      supabase.from("contacts").select("*").eq("customer_id", customerId),
      supabase.from("cases").select("*").eq("customer_id", customerId),
      supabase.from("agreements").select("*").eq("customer_id", customerId),
    ]);

  // Fetch journal entries for all cases
  const caseIds = casesResult.data?.map((c) => c.id) || [];
  const journalResult =
    caseIds.length > 0
      ? await supabase
          .from("journal_entries")
          .select("*")
          .in("case_id", caseIds)
      : { data: [] };

  const exportData: GdprDataExport = {
    exportedAt: new Date().toISOString(),
    format,
    entities: {
      customers: customerResult.data ? [customerResult.data] : [],
      contacts: contactsResult.data || [],
      cases: casesResult.data || [],
      journalEntries: journalResult.data || [],
    },
    metadata: {
      requestedBy: requestedBy.name,
      entityType: "customer",
      entityId: customerId,
    },
  };

  // Log the export
  await auditLogger.logGdprExport(customerId, "customer", requestedBy);

  return exportData;
}

/**
 * Export all data related to a contact person (GDPR Article 15)
 */
export async function exportContactData(
  contactId: string,
  format: "json" | "csv" = "json",
  requestedBy: { id: string; name: string },
): Promise<GdprDataExport> {
  const contactResult = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  const exportData: GdprDataExport = {
    exportedAt: new Date().toISOString(),
    format,
    entities: {
      contacts: contactResult.data ? [contactResult.data] : [],
    },
    metadata: {
      requestedBy: requestedBy.name,
      entityType: "contact",
      entityId: contactId,
    },
  };

  // Log the export
  await auditLogger.logGdprExport(contactId, "contact", requestedBy);

  return exportData;
}

/**
 * Delete customer and all related data (GDPR Article 17)
 */
export async function deleteCustomerData(
  request: GdprDeleteRequest,
): Promise<GdprDeleteResult> {
  const result: GdprDeleteResult = {
    success: false,
    deletedEntities: [],
    errors: [],
  };

  try {
    // Get customer info for logging
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", request.entityId)
      .single();

    // Delete in order (respecting foreign keys)

    // 1. Get case IDs
    const { data: cases } = await supabase
      .from("cases")
      .select("id, case_number")
      .eq("customer_id", request.entityId);

    const caseIds = cases?.map((c) => c.id) || [];

    // 2. Delete billing lines
    if (caseIds.length > 0) {
      const { data: journalEntries } = await supabase
        .from("journal_entries")
        .select("id")
        .in("case_id", caseIds);

      const journalIds = journalEntries?.map((j) => j.id) || [];

      if (journalIds.length > 0) {
        const { error: billingError } = await supabase
          .from("billing_lines")
          .delete()
          .in("journal_entry_id", journalIds);

        if (billingError)
          result.errors.push(`Billing lines: ${billingError.message}`);
      }

      // 3. Delete journal entries
      const { error: journalError } = await supabase
        .from("journal_entries")
        .delete()
        .in("case_id", caseIds);

      if (journalError)
        result.errors.push(`Journal entries: ${journalError.message}`);

      // 4. Delete tasks
      const { error: taskError } = await supabase
        .from("tasks")
        .delete()
        .in("case_id", caseIds);

      if (taskError) result.errors.push(`Tasks: ${taskError.message}`);
    }

    // 5. Delete cases
    const { error: caseError } = await supabase
      .from("cases")
      .delete()
      .eq("customer_id", request.entityId);

    if (caseError) {
      result.errors.push(`Cases: ${caseError.message}`);
    } else {
      cases?.forEach((c) =>
        result.deletedEntities.push({
          type: "case",
          id: c.id,
          name: c.case_number,
        }),
      );
    }

    // 6. Delete agreements
    const { data: agreements } = await supabase
      .from("agreements")
      .select("id, name")
      .eq("customer_id", request.entityId);

    const { error: agreementError } = await supabase
      .from("agreements")
      .delete()
      .eq("customer_id", request.entityId);

    if (agreementError) {
      result.errors.push(`Agreements: ${agreementError.message}`);
    } else {
      agreements?.forEach((a) =>
        result.deletedEntities.push({
          type: "agreement",
          id: a.id,
          name: a.name,
        }),
      );
    }

    // 7. Delete contacts
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("customer_id", request.entityId);

    const { error: contactError } = await supabase
      .from("contacts")
      .delete()
      .eq("customer_id", request.entityId);

    if (contactError) {
      result.errors.push(`Contacts: ${contactError.message}`);
    } else {
      contacts?.forEach((c) =>
        result.deletedEntities.push({
          type: "contact",
          id: c.id,
          name: c.name,
        }),
      );
    }

    // 8. Delete customer
    const { error: customerError } = await supabase
      .from("customers")
      .delete()
      .eq("id", request.entityId);

    if (customerError) {
      result.errors.push(`Customer: ${customerError.message}`);
    } else {
      result.deletedEntities.push({
        type: "customer",
        id: request.entityId,
        name: customer?.name,
      });
    }

    // Log the deletion
    await auditLogger.logGdprDelete(
      request.entityId,
      "customer",
      customer?.name || "Unknown",
      { id: request.requestedBy, name: request.requestedBy },
    );

    result.success = result.errors.length === 0;
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  return result;
}

/**
 * Delete contact data (GDPR Article 17)
 */
export async function deleteContactData(
  request: GdprDeleteRequest,
): Promise<GdprDeleteResult> {
  const result: GdprDeleteResult = {
    success: false,
    deletedEntities: [],
    errors: [],
  };

  try {
    const { data: contact } = await supabase
      .from("contacts")
      .select("name")
      .eq("id", request.entityId)
      .single();

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", request.entityId);

    if (error) {
      result.errors.push(error.message);
    } else {
      result.deletedEntities.push({
        type: "contact",
        id: request.entityId,
        name: contact?.name,
      });
      result.success = true;
    }

    await auditLogger.logGdprDelete(
      request.entityId,
      "contact",
      contact?.name || "Unknown",
      { id: request.requestedBy, name: request.requestedBy },
    );
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  return result;
}

/**
 * Record user consent
 */
export async function recordConsent(
  consent: Omit<ConsentRecord, "id">,
): Promise<ConsentRecord | null> {
  const { data, error } = await supabase
    .from("consent_records")
    .insert({
      user_id: consent.userId,
      consent_type: consent.consentType,
      granted: consent.granted,
      granted_at: consent.granted ? new Date().toISOString() : null,
      revoked_at: consent.granted ? null : new Date().toISOString(),
      ip_address: consent.ipAddress,
      version: consent.version,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to record consent:", error);
    return null;
  }

  return data;
}

/**
 * Get user consent status
 */
export async function getConsentStatus(
  userId: string,
): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from("consent_records")
    .select("consent_type, granted")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const status: Record<string, boolean> = {
    data_processing: false,
    marketing: false,
    ai_processing: false,
    third_party: false,
  };

  // Get latest consent for each type
  data?.forEach((record) => {
    if (
      !(record.consent_type in status) ||
      status[record.consent_type] === false
    ) {
      status[record.consent_type] = record.granted;
    }
  });

  return status;
}

/**
 * Generate data export download
 */
export function downloadExport(
  exportData: GdprDataExport,
  filename: string,
): void {
  const content =
    exportData.format === "json"
      ? JSON.stringify(exportData, null, 2)
      : convertToCSV(exportData);

  const blob = new Blob([content], {
    type: exportData.format === "json" ? "application/json" : "text/csv",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${exportData.format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert export data to CSV format
 */
function convertToCSV(exportData: GdprDataExport): string {
  const sections: string[] = [];

  for (const [entityType, entities] of Object.entries(exportData.entities)) {
    if (!entities || entities.length === 0) continue;

    sections.push(`\n# ${entityType.toUpperCase()}\n`);

    const headers = Object.keys(entities[0] as object);
    sections.push(headers.join(","));

    for (const entity of entities) {
      const values = headers.map((h) => {
        const value = (entity as Record<string, unknown>)[h];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      sections.push(values.join(","));
    }
  }

  return sections.join("\n");
}
