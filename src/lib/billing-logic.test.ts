import { describe, it, expect } from "vitest";
import {
  calculateTimebankStatus,
  timebankStatusFromView,
  calculateBillingWithSplit,
  getPeriodStartDate,
  isIndexationWarningNeeded,
  type TimebankStatus,
} from "./billing-logic";
import type { Agreement, TimebankCurrentStatus } from "@/types/database";

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createAgreement(overrides: Partial<Agreement> = {}): Agreement {
  return {
    id: "test-agreement-id",
    customer_id: "test-customer-id",
    type: "hourly",
    status: "active",
    hourly_rate: 1000,
    start_date: "2026-01-01",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Agreement;
}

function createTimebankStatus(
  overrides: Partial<TimebankStatus> = {},
): TimebankStatus {
  return {
    includedHours: 60,
    hoursUsed: 0,
    hoursRemaining: 60,
    overtimeHours: 0,
    percentUsed: 0,
    isOvertime: false,
    ...overrides,
  };
}

// ============================================================================
// calculateTimebankStatus
// ============================================================================

describe("calculateTimebankStatus", () => {
  it("beräknar korrekt när inga timmar är använda", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
    });

    const result = calculateTimebankStatus(agreement, 0);

    expect(result.includedHours).toBe(60);
    expect(result.hoursUsed).toBe(0);
    expect(result.hoursRemaining).toBe(60);
    expect(result.overtimeHours).toBe(0);
    expect(result.percentUsed).toBe(0);
    expect(result.isOvertime).toBe(false);
  });

  it("beräknar korrekt när halva timbanken är använd", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
    });

    const result = calculateTimebankStatus(agreement, 30);

    expect(result.includedHours).toBe(60);
    expect(result.hoursUsed).toBe(30);
    expect(result.hoursRemaining).toBe(30);
    expect(result.overtimeHours).toBe(0);
    expect(result.percentUsed).toBe(50);
    expect(result.isOvertime).toBe(false);
  });

  it("beräknar korrekt vid 100% användning", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
    });

    const result = calculateTimebankStatus(agreement, 60);

    expect(result.includedHours).toBe(60);
    expect(result.hoursUsed).toBe(60);
    expect(result.hoursRemaining).toBe(0);
    expect(result.overtimeHours).toBe(0);
    expect(result.percentUsed).toBe(100);
    expect(result.isOvertime).toBe(false);
  });

  it("beräknar övertid korrekt", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
    });

    const result = calculateTimebankStatus(agreement, 75);

    expect(result.includedHours).toBe(60);
    expect(result.hoursUsed).toBe(75);
    expect(result.hoursRemaining).toBe(0);
    expect(result.overtimeHours).toBe(15);
    expect(result.percentUsed).toBe(100); // Max 100%
    expect(result.isOvertime).toBe(true);
  });

  it("hanterar noll inkluderade timmar", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 0,
    });

    const result = calculateTimebankStatus(agreement, 5);

    expect(result.includedHours).toBe(0);
    expect(result.hoursUsed).toBe(5);
    expect(result.hoursRemaining).toBe(0);
    expect(result.overtimeHours).toBe(5);
    expect(result.percentUsed).toBe(0); // Division by zero protection
    expect(result.isOvertime).toBe(true);
  });

  it("hanterar null inkluderade timmar", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: null,
    });

    const result = calculateTimebankStatus(agreement, 10);

    expect(result.includedHours).toBe(0);
    expect(result.hoursUsed).toBe(10);
    expect(result.hoursRemaining).toBe(0);
    expect(result.overtimeHours).toBe(10);
  });
});

// ============================================================================
// timebankStatusFromView
// ============================================================================

describe("timebankStatusFromView", () => {
  it("konverterar vy-data korrekt", () => {
    const view: TimebankCurrentStatus = {
      agreement_id: "test-id",
      customer_id: "test-customer",
      included_hours: 60,
      period: "monthly",
      hours_used_this_period: 25,
      hours_remaining: 35,
    };

    const result = timebankStatusFromView(view);

    expect(result.includedHours).toBe(60);
    expect(result.hoursUsed).toBe(25);
    expect(result.hoursRemaining).toBe(35);
    expect(result.overtimeHours).toBe(0);
    expect(result.percentUsed).toBeCloseTo(41.67, 1);
    expect(result.isOvertime).toBe(false);
  });

  it("hanterar negativ hours_remaining", () => {
    const view: TimebankCurrentStatus = {
      agreement_id: "test-id",
      customer_id: "test-customer",
      included_hours: 60,
      period: "yearly",
      hours_used_this_period: 80,
      hours_remaining: -20, // DB kan returnera negativ
    };

    const result = timebankStatusFromView(view);

    expect(result.hoursRemaining).toBe(0); // Ska aldrig vara negativ
    expect(result.overtimeHours).toBe(20);
    expect(result.isOvertime).toBe(true);
  });
});

// ============================================================================
// calculateBillingWithSplit - Hourly agreement
// ============================================================================

describe("calculateBillingWithSplit - hourly", () => {
  it("beräknar löpande timmar korrekt", () => {
    const agreement = createAgreement({
      type: "hourly",
      hourly_rate: 995,
    });

    const result = calculateBillingWithSplit(agreement, null, 2.5);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].hours).toBe(2.5);
    expect(result.entries[0].billingType).toBe("hourly");
    expect(result.entries[0].hourlyRate).toBe(995);
    expect(result.entries[0].amount).toBe(2487.5);
    expect(result.totalAmount).toBe(2487.5);
  });

  it("ignorerar isExtraBillable för hourly", () => {
    const agreement = createAgreement({
      type: "hourly",
      hourly_rate: 1000,
    });

    const result = calculateBillingWithSplit(agreement, null, 3, true);

    expect(result.entries[0].billingType).toBe("hourly");
    expect(result.totalAmount).toBe(3000);
  });
});

// ============================================================================
// calculateBillingWithSplit - Fixed agreement
// ============================================================================

describe("calculateBillingWithSplit - fixed", () => {
  it("loggar timmar utan belopp för fastpris", () => {
    const agreement = createAgreement({
      type: "fixed",
      hourly_rate: 1000,
    });

    const result = calculateBillingWithSplit(agreement, null, 5);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].hours).toBe(5);
    expect(result.entries[0].billingType).toBe("fixed");
    expect(result.entries[0].hourlyRate).toBe(0);
    expect(result.entries[0].amount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("debiterar extraarbete som hourly vid isExtraBillable", () => {
    const agreement = createAgreement({
      type: "fixed",
      hourly_rate: 1200,
    });

    const result = calculateBillingWithSplit(agreement, null, 2, true);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].billingType).toBe("hourly");
    expect(result.entries[0].hourlyRate).toBe(1200);
    expect(result.entries[0].amount).toBe(2400);
    expect(result.totalAmount).toBe(2400);
  });
});

// ============================================================================
// calculateBillingWithSplit - Timebank agreement
// ============================================================================

describe("calculateBillingWithSplit - timebank", () => {
  it("använder timebank när timmar ryms", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
      overtime_rate: 1100,
    });
    const status = createTimebankStatus({
      hoursRemaining: 50,
    });

    const result = calculateBillingWithSplit(agreement, status, 10);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].billingType).toBe("timebank");
    expect(result.entries[0].hours).toBe(10);
    expect(result.entries[0].amount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("skapar split när gränsen passeras", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
      overtime_rate: 1100,
    });
    const status = createTimebankStatus({
      hoursRemaining: 5,
    });

    const result = calculateBillingWithSplit(agreement, status, 10);

    expect(result.entries).toHaveLength(2);

    // Första entry: timebank
    expect(result.entries[0].billingType).toBe("timebank");
    expect(result.entries[0].hours).toBe(5);
    expect(result.entries[0].amount).toBe(0);

    // Andra entry: overtime
    expect(result.entries[1].billingType).toBe("overtime");
    expect(result.entries[1].hours).toBe(5);
    expect(result.entries[1].hourlyRate).toBe(1100);
    expect(result.entries[1].amount).toBe(5500);

    expect(result.totalAmount).toBe(5500);
  });

  it("debiterar allt som övertid när timbanken är tom", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
      overtime_rate: 1100,
    });
    const status = createTimebankStatus({
      hoursRemaining: 0,
      isOvertime: true,
    });

    const result = calculateBillingWithSplit(agreement, status, 8);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].billingType).toBe("overtime");
    expect(result.entries[0].hours).toBe(8);
    expect(result.entries[0].hourlyRate).toBe(1100);
    expect(result.entries[0].amount).toBe(8800);
    expect(result.totalAmount).toBe(8800);
  });

  it("använder hourly_rate som fallback för overtime_rate", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 10,
      hourly_rate: 900,
      overtime_rate: null,
    });
    const status = createTimebankStatus({
      hoursRemaining: 0,
    });

    const result = calculateBillingWithSplit(agreement, status, 5);

    expect(result.entries[0].hourlyRate).toBe(900);
    expect(result.totalAmount).toBe(4500);
  });

  it("debiterar explicit extraarbete som övertid oavsett timbank", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 60,
      overtime_rate: 1100,
    });
    const status = createTimebankStatus({
      hoursRemaining: 50, // Finns gott om timmar
    });

    const result = calculateBillingWithSplit(agreement, status, 3, true);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].billingType).toBe("overtime");
    expect(result.entries[0].hours).toBe(3);
    expect(result.entries[0].hourlyRate).toBe(1100);
    expect(result.totalAmount).toBe(3300);
  });

  it("hanterar null timebankStatus med agreement.included_hours", () => {
    const agreement = createAgreement({
      type: "timebank",
      included_hours: 20,
      overtime_rate: 1000,
    });

    const result = calculateBillingWithSplit(agreement, null, 15);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].billingType).toBe("timebank");
    expect(result.entries[0].hours).toBe(15);
  });
});

// ============================================================================
// getPeriodStartDate
// ============================================================================

describe("getPeriodStartDate", () => {
  it("returnerar första dagen i månaden för monthly", () => {
    const result = getPeriodStartDate("monthly");

    expect(result.getDate()).toBe(1);
  });

  it("returnerar 1 januari för yearly", () => {
    const result = getPeriodStartDate("yearly");

    expect(result.getMonth()).toBe(0); // Januari
    expect(result.getDate()).toBe(1);
  });
});

// ============================================================================
// isIndexationWarningNeeded
// ============================================================================

describe("isIndexationWarningNeeded", () => {
  it("returnerar false för null datum", () => {
    expect(isIndexationWarningNeeded(null)).toBe(false);
  });

  it("returnerar false för datum långt fram", () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    expect(isIndexationWarningNeeded(futureDate.toISOString())).toBe(false);
  });

  it("returnerar true för datum inom 7 dagar", () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);

    expect(isIndexationWarningNeeded(soonDate.toISOString())).toBe(true);
  });

  it("returnerar true för datum idag", () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    expect(isIndexationWarningNeeded(today.toISOString())).toBe(true);
  });

  it("returnerar false för passerat datum", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    expect(isIndexationWarningNeeded(pastDate.toISOString())).toBe(false);
  });

  it("respekterar custom daysThreshold", () => {
    const date = new Date();
    date.setDate(date.getDate() + 10);

    expect(isIndexationWarningNeeded(date.toISOString(), 7)).toBe(false);
    expect(isIndexationWarningNeeded(date.toISOString(), 14)).toBe(true);
  });
});
