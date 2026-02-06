import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format minutes to hours and minutes
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

// Parse duration string to minutes
export function parseDuration(input: string): number {
  // Handle "2h", "2 h", "30min", "30 min", "2h 30min", "2:30"
  const hourMatch = input.match(/(\d+)\s*h/i);
  const minMatch = input.match(/(\d+)\s*m/i);
  const colonMatch = input.match(/(\d+):(\d+)/);

  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  }

  let total = 0;
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minMatch) total += parseInt(minMatch[1]);
  return total || parseInt(input) || 0;
}

// Format currency (Swedish kronor)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to Swedish format
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

// Format date to relative time (idag, igår, etc.)
export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Idag";
  if (diffDays === 1) return "Igår";
  if (diffDays < 7) return `${diffDays} dagar sedan`;
  return formatDate(date);
}

// Get current period (YYYY-MM)
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Generate case number
export function generateCaseNumber(
  type: "case" | "project",
  sequence: number,
): string {
  const prefix = type === "case" ? "C" : "P";
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
}

// Calculate timbank split
export interface TimbankSplit {
  timbankMinutes: number;
  overtimeMinutes: number;
}

export function calculateTimbankSplit(
  loggedMinutes: number,
  remainingMinutes: number,
): TimbankSplit {
  if (remainingMinutes >= loggedMinutes) {
    return {
      timbankMinutes: loggedMinutes,
      overtimeMinutes: 0,
    };
  }

  return {
    timbankMinutes: Math.max(0, remainingMinutes),
    overtimeMinutes: loggedMinutes - Math.max(0, remainingMinutes),
  };
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Sleep function for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if string is valid UUID
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
