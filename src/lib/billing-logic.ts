import type { Agreement, BillingType, TimebankCurrentStatus } from '@/types/database';

// ============================================================================
// TIMBANK STATUS
// ============================================================================

export interface TimebankStatus {
  includedHours: number;
  hoursUsed: number;
  hoursRemaining: number;
  overtimeHours: number;
  percentUsed: number;
  isOvertime: boolean;
}

export function calculateTimebankStatus(
  agreement: Agreement,
  hoursThisPeriod: number
): TimebankStatus {
  const includedHours = agreement.included_hours || 0;
  const hoursRemaining = Math.max(0, includedHours - hoursThisPeriod);
  const overtimeHours = Math.max(0, hoursThisPeriod - includedHours);
  const percentUsed = includedHours > 0 ? (hoursThisPeriod / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed: hoursThisPeriod,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursThisPeriod > includedHours,
  };
}

export function timebankStatusFromView(view: TimebankCurrentStatus): TimebankStatus {
  const includedHours = view.included_hours;
  const hoursUsed = view.hours_used_this_period;
  const hoursRemaining = Math.max(0, view.hours_remaining);
  const overtimeHours = Math.max(0, hoursUsed - includedHours);
  const percentUsed = includedHours > 0 ? (hoursUsed / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursUsed > includedHours,
  };
}

// ============================================================================
// BILLING CALCULATION MED SPLIT-SUPPORT
// ============================================================================

export interface TimeEntrySplit {
  hours: number;
  billingType: BillingType;
  hourlyRate: number;
  amount: number;
}

export interface BillingResult {
  entries: TimeEntrySplit[];
  totalAmount: number;
}

/**
 * Beräknar hur nya timmar ska delas upp mellan timebank och overtime.
 * Returnerar en eller två time_entry "splits" beroende på om gränsen passeras.
 */
export function calculateBillingWithSplit(
  agreement: Agreement,
  timebankStatus: TimebankStatus | null,
  newHours: number,
  isExtraBillable: boolean = false
): BillingResult {
  // Löpande timpris - enkel beräkning
  if (agreement.type === 'hourly') {
    const amount = newHours * agreement.hourly_rate;
    return {
      entries: [{
        hours: newHours,
        billingType: 'hourly',
        hourlyRate: agreement.hourly_rate,
        amount,
      }],
      totalAmount: amount,
    };
  }

  // Fastpris - timmar loggas för statistik
  if (agreement.type === 'fixed') {
    if (isExtraBillable) {
      // Explicit extraarbete debiteras som hourly
      const amount = newHours * agreement.hourly_rate;
      return {
        entries: [{
          hours: newHours,
          billingType: 'hourly',
          hourlyRate: agreement.hourly_rate,
          amount,
        }],
        totalAmount: amount,
      };
    }
    return {
      entries: [{
        hours: newHours,
        billingType: 'fixed',
        hourlyRate: 0,
        amount: 0,
      }],
      totalAmount: 0,
    };
  }

  // Timbank - komplex logik med split
  if (agreement.type === 'timebank') {
    // Explicit extraarbete = alltid overtime
    if (isExtraBillable) {
      const rate = agreement.overtime_rate || agreement.hourly_rate;
      const amount = newHours * rate;
      return {
        entries: [{
          hours: newHours,
          billingType: 'overtime',
          hourlyRate: rate,
          amount,
        }],
        totalAmount: amount,
      };
    }

    const remaining = timebankStatus?.hoursRemaining ?? agreement.included_hours ?? 0;
    const overtimeRate = agreement.overtime_rate || agreement.hourly_rate;

    // Allt ryms inom timbanken
    if (remaining >= newHours) {
      return {
        entries: [{
          hours: newHours,
          billingType: 'timebank',
          hourlyRate: 0,
          amount: 0,
        }],
        totalAmount: 0,
      };
    }

    // Split: en del timebank, en del overtime
    if (remaining > 0) {
      const overtimeHours = newHours - remaining;
      const overtimeAmount = overtimeHours * overtimeRate;

      return {
        entries: [
          {
            hours: remaining,
            billingType: 'timebank',
            hourlyRate: 0,
            amount: 0,
          },
          {
            hours: overtimeHours,
            billingType: 'overtime',
            hourlyRate: overtimeRate,
            amount: overtimeAmount,
          },
        ],
        totalAmount: overtimeAmount,
      };
    }

    // Allt är övertid
    const amount = newHours * overtimeRate;
    return {
      entries: [{
        hours: newHours,
        billingType: 'overtime',
        hourlyRate: overtimeRate,
        amount,
      }],
      totalAmount: amount,
    };
  }

  // Fallback
  return {
    entries: [{
      hours: newHours,
      billingType: 'internal',
      hourlyRate: 0,
      amount: 0,
    }],
    totalAmount: 0,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

export function getPeriodStartDate(period: 'monthly' | 'yearly'): Date {
  const now = new Date();
  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(now.getFullYear(), 0, 1);
}

export function isIndexationWarningNeeded(nextIndexation: string | null, daysThreshold: number = 7): boolean {
  if (!nextIndexation) return false;
  const indexDate = new Date(nextIndexation);
  const now = new Date();
  const diffTime = indexDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= daysThreshold;
}
