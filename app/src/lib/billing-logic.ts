/**
 * Billing Logic for Grannfrid CRM
 *
 * Handles timbank split calculations, billing line generation,
 * and agreement balance management.
 */

// Types
export interface Agreement {
  id: string;
  type: "lopande" | "timbank" | "fastpris" | "engangbelopp";
  hourlyRate: number | null;
  overtimeRate: number | null;
  fixedAmount: number | null;
  includedMinutes: number | null; // Total minutes in timbank
  usedMinutes: number; // Minutes already used
  status: "active" | "paused" | "expired" | "cancelled";
}

export interface JournalEntry {
  id: string;
  caseId: string;
  entryDate: string;
  entryType: "samtal" | "mail" | "mote" | "platsbesok" | "internt" | "ovrigt";
  minutes: number;
  description: string;
  invoiceText: string | null;
  billingType: "normal" | "extra" | "intern";
  consultantId: string | null;
}

export interface BillingLine {
  id?: string;
  journalEntryId: string;
  period: string; // YYYY-MM
  minutes: number;
  rate: number | null;
  amount: number | null;
  type: "timebank" | "overtime" | "hourly" | "fixed";
  status: "pending" | "review" | "approved" | "invoiced";
  invoiceId: string | null;
  locked: boolean;
}

export interface TimbankSplitResult {
  timbankMinutes: number;
  overtimeMinutes: number;
  timbankLine: BillingLine | null;
  overtimeLine: BillingLine | null;
  newUsedMinutes: number;
}

export interface AgreementLedgerEntry {
  id?: string;
  agreementId: string;
  journalEntryId: string | null;
  entryDate: string;
  entryType: "initial" | "topup" | "usage" | "adjustment";
  minutes: number; // Positive for additions, negative for usage
  balanceAfter: number;
  description: string;
  createdBy: string;
}

/**
 * Calculate timbank split when logging time
 *
 * @param loggedMinutes - Minutes being logged
 * @param remainingMinutes - Minutes remaining in timbank
 * @param agreement - The agreement details
 * @param journalEntryId - ID of the journal entry
 * @param period - Billing period (YYYY-MM)
 * @returns Split result with billing lines
 */
export function calculateTimbankSplit(
  loggedMinutes: number,
  remainingMinutes: number,
  agreement: Agreement,
  journalEntryId: string,
  period: string,
): TimbankSplitResult {
  // Validate inputs
  if (loggedMinutes <= 0) {
    throw new Error("Logged minutes must be positive");
  }

  if (remainingMinutes < 0) {
    throw new Error("Remaining minutes cannot be negative");
  }

  // Calculate split
  const timbankMinutes = Math.min(loggedMinutes, remainingMinutes);
  const overtimeMinutes = Math.max(0, loggedMinutes - remainingMinutes);

  // Create billing lines
  let timbankLine: BillingLine | null = null;
  let overtimeLine: BillingLine | null = null;

  if (timbankMinutes > 0) {
    timbankLine = {
      journalEntryId,
      period,
      minutes: timbankMinutes,
      rate: 0, // Timbank is prepaid, so 0 kr
      amount: 0,
      type: "timebank",
      status: "pending",
      invoiceId: null,
      locked: false,
    };
  }

  if (overtimeMinutes > 0) {
    const rate = agreement.overtimeRate || agreement.hourlyRate || 0;
    overtimeLine = {
      journalEntryId,
      period,
      minutes: overtimeMinutes,
      rate,
      amount: (overtimeMinutes / 60) * rate,
      type: "overtime",
      status: "pending",
      invoiceId: null,
      locked: false,
    };
  }

  return {
    timbankMinutes,
    overtimeMinutes,
    timbankLine,
    overtimeLine,
    newUsedMinutes: (agreement.usedMinutes || 0) + timbankMinutes,
  };
}

/**
 * Generate billing lines for a journal entry based on agreement type
 */
export function generateBillingLines(
  entry: JournalEntry,
  agreement: Agreement,
  period: string,
): BillingLine[] {
  const lines: BillingLine[] = [];

  // Internal entries are not billed
  if (entry.billingType === "intern") {
    lines.push({
      journalEntryId: entry.id,
      period,
      minutes: entry.minutes,
      rate: 0,
      amount: 0,
      type: "hourly", // Track as hourly but 0 amount
      status: "approved", // Auto-approve internal
      invoiceId: null,
      locked: false,
    });
    return lines;
  }

  switch (agreement.type) {
    case "lopande": {
      // Hourly billing - all time is billed
      const rate = agreement.hourlyRate || 0;
      lines.push({
        journalEntryId: entry.id,
        period,
        minutes: entry.minutes,
        rate,
        amount: (entry.minutes / 60) * rate,
        type: "hourly",
        status: "pending",
        invoiceId: null,
        locked: false,
      });
      break;
    }

    case "timbank": {
      // Calculate remaining minutes in timbank
      const includedMinutes = agreement.includedMinutes || 0;
      const usedMinutes = agreement.usedMinutes || 0;
      const remainingMinutes = Math.max(0, includedMinutes - usedMinutes);

      const split = calculateTimbankSplit(
        entry.minutes,
        remainingMinutes,
        agreement,
        entry.id,
        period,
      );

      if (split.timbankLine) {
        lines.push(split.timbankLine);
      }
      if (split.overtimeLine) {
        lines.push(split.overtimeLine);
      }
      break;
    }

    case "fastpris": {
      // Fixed price - normal work is included, extra is billed
      if (entry.billingType === "extra") {
        const rate = agreement.hourlyRate || agreement.overtimeRate || 0;
        lines.push({
          journalEntryId: entry.id,
          period,
          minutes: entry.minutes,
          rate,
          amount: (entry.minutes / 60) * rate,
          type: "hourly",
          status: "pending",
          invoiceId: null,
          locked: false,
        });
      } else {
        // Normal work under fixed price - track but don't bill
        lines.push({
          journalEntryId: entry.id,
          period,
          minutes: entry.minutes,
          rate: 0,
          amount: 0,
          type: "fixed",
          status: "approved",
          invoiceId: null,
          locked: false,
        });
      }
      break;
    }

    case "engangbelopp": {
      // One-time amount - track time but don't bill per hour
      lines.push({
        journalEntryId: entry.id,
        period,
        minutes: entry.minutes,
        rate: 0,
        amount: 0,
        type: "fixed",
        status: "approved",
        invoiceId: null,
        locked: false,
      });
      break;
    }
  }

  return lines;
}

/**
 * Create a ledger entry for timbank usage
 */
export function createTimbankLedgerEntry(
  agreementId: string,
  journalEntryId: string,
  minutesUsed: number,
  currentBalance: number,
  description: string,
  userId: string,
): AgreementLedgerEntry {
  return {
    agreementId,
    journalEntryId,
    entryDate: new Date().toISOString(),
    entryType: "usage",
    minutes: -minutesUsed, // Negative for usage
    balanceAfter: currentBalance - minutesUsed,
    description,
    createdBy: userId,
  };
}

/**
 * Calculate invoice totals from billing lines
 */
export interface InvoiceSummary {
  totalMinutes: number;
  billableMinutes: number;
  timbankMinutes: number;
  overtimeMinutes: number;
  totalAmount: number;
  lineCount: number;
  byType: Record<BillingLine["type"], { minutes: number; amount: number }>;
}

export function calculateInvoiceSummary(lines: BillingLine[]): InvoiceSummary {
  const summary: InvoiceSummary = {
    totalMinutes: 0,
    billableMinutes: 0,
    timbankMinutes: 0,
    overtimeMinutes: 0,
    totalAmount: 0,
    lineCount: lines.length,
    byType: {
      timebank: { minutes: 0, amount: 0 },
      overtime: { minutes: 0, amount: 0 },
      hourly: { minutes: 0, amount: 0 },
      fixed: { minutes: 0, amount: 0 },
    },
  };

  for (const line of lines) {
    summary.totalMinutes += line.minutes;
    summary.totalAmount += line.amount || 0;
    summary.byType[line.type].minutes += line.minutes;
    summary.byType[line.type].amount += line.amount || 0;

    if (line.type === "timebank") {
      summary.timbankMinutes += line.minutes;
    } else if (line.type === "overtime") {
      summary.overtimeMinutes += line.minutes;
      summary.billableMinutes += line.minutes;
    } else if (line.type === "hourly" && (line.amount || 0) > 0) {
      summary.billableMinutes += line.minutes;
    }
  }

  return summary;
}

/**
 * Format minutes as hours and minutes string
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} h`;
  } else {
    return `${hours} h ${mins} min`;
  }
}

/**
 * Format amount as Swedish currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get billing period from date
 */
export function getBillingPeriod(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Validate that a billing line can be modified
 */
export function canModifyBillingLine(line: BillingLine): {
  canModify: boolean;
  reason?: string;
} {
  if (line.locked) {
    return { canModify: false, reason: "Raden är låst" };
  }

  if (line.status === "invoiced") {
    return { canModify: false, reason: "Raden är redan fakturerad" };
  }

  return { canModify: true };
}

/**
 * Calculate timbank status for display
 */
export interface TimbankStatus {
  includedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  percentageUsed: number;
  isOverdrawn: boolean;
  overdrawMinutes: number;
}

export function calculateTimbankStatus(agreement: Agreement): TimbankStatus {
  const includedMinutes = agreement.includedMinutes || 0;
  const usedMinutes = agreement.usedMinutes || 0;
  const remainingMinutes = Math.max(0, includedMinutes - usedMinutes);
  const isOverdrawn = usedMinutes > includedMinutes;
  const overdrawMinutes = isOverdrawn ? usedMinutes - includedMinutes : 0;
  const percentageUsed =
    includedMinutes > 0 ? (usedMinutes / includedMinutes) * 100 : 0;

  return {
    includedMinutes,
    usedMinutes,
    remainingMinutes,
    percentageUsed: Math.min(100, percentageUsed),
    isOverdrawn,
    overdrawMinutes,
  };
}
