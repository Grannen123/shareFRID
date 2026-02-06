// Core entity types for Grannfrid CRM

// Customer (Kund)
export interface Customer {
  id: string;
  fortnoxNumber: string;
  name: string;
  orgNumber: string | null;
  status: CustomerStatus;
  workspace: Workspace;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  contacts?: Contact[];
  agreements?: Agreement[];
}

export type CustomerStatus = "active" | "prospekt" | "vilande";
export type Workspace = "goteborg" | "stockholm";

// Contact (Kontakt)
export interface Contact {
  id: string;
  customerId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  isBillingContact: boolean;
  createdAt: string;
}

// Agreement (Avtal)
export interface Agreement {
  id: string;
  customerId: string;
  type: AgreementType;
  name: string;
  hourlyRate: number | null;
  overtimeRate: number | null;
  fixedAmount: number | null;
  includedMinutes: number | null;
  usedMinutes: number;
  validFrom: string;
  validTo: string | null;
  status: AgreementStatus;
  createdAt: string;
  updatedAt: string;
  ledgerEntries?: AgreementLedgerEntry[];
}

export type AgreementType = "hourly" | "timebank" | "fixed" | "onetime";
export type AgreementStatus = "active" | "expired" | "cancelled";

// Agreement Ledger (for tracking timebank balance)
export interface AgreementLedgerEntry {
  id: string;
  agreementId: string;
  entryDate: string;
  entryType: LedgerEntryType;
  minutes: number;
  balanceAfter: number;
  journalEntryId: string | null;
  description: string | null;
  createdAt: string;
}

export type LedgerEntryType = "initial" | "usage" | "adjustment" | "rollover";

// Case/Assignment (Ärende/Uppdrag)
export interface Case {
  id: string;
  caseNumber: string; // C-26-001 or P-26-001
  customerId: string;
  agreementId: string | null;
  billingContactId: string | null;
  title: string;
  type: CaseType;
  status: CaseStatus;
  priority: Priority;
  assigneeId: string | null;
  description: string | null;
  deadline: string | null;
  closedAt: string | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  agreement?: Agreement;
  billingContact?: Contact;
  journalEntries?: JournalEntry[];
  tasks?: Task[];
}

export type CaseType = "case" | "project";
export type CaseStatus = "active" | "paused" | "closed";
export type Priority = "low" | "medium" | "high";

// Journal Entry (Journalanteckning)
export interface JournalEntry {
  id: string;
  caseId: string;
  entryDate: string;
  entryType: JournalEntryType;
  minutes: number;
  description: string;
  invoiceText: string | null;
  billingType: BillingType;
  consultantId: string | null;
  createdAt: string;
  updatedAt: string;
  billingLines?: BillingLine[];
}

export type JournalEntryType =
  | "call"
  | "email"
  | "meeting"
  | "visit"
  | "letter"
  | "admin"
  | "other";

export type BillingType = "included" | "extra" | "non_billable";

// Billing Line (Faktureringsrad)
export interface BillingLine {
  id: string;
  journalEntryId: string;
  period: string; // YYYY-MM
  minutes: number;
  rate: number | null;
  amount: number | null;
  type: BillingLineType;
  status: BillingLineStatus;
  invoiceId: string | null;
  locked: boolean;
  createdAt: string;
}

export type BillingLineType = "timebank" | "overtime" | "hourly" | "fixed";
export type BillingLineStatus = "pending" | "review" | "approved" | "invoiced";

// Invoice (Faktura)
export interface Invoice {
  id: string;
  customerId: string;
  billingContactId: string | null;
  period: string;
  invoiceNumber: string | null;
  fortnoxInvoiceId: string | null;
  totalAmount: number;
  status: InvoiceStatus;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: BillingLine[];
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

// Task (Uppgift)
export interface Task {
  id: string;
  caseId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "pending" | "in_progress" | "done";

// User (Användare/Konsult)
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  workspace: Workspace | null;
  isActive: boolean;
  createdAt: string;
}

export type UserRole = "admin" | "consultant" | "owner";

// Knowledge Base Article (Kunskapsartikel)
export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  authorId: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// AI Chat Message
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: "customer" | "case" | "document";
  id: string;
  title: string;
}

// Form Types
export interface CustomerFormData {
  fortnoxNumber: string;
  name: string;
  orgNumber?: string;
  status: CustomerStatus;
  workspace: Workspace;
  address?: string;
  postalCode?: string;
  city?: string;
}

export interface CaseFormData {
  customerId: string;
  agreementId?: string;
  billingContactId?: string;
  title: string;
  type: CaseType;
  priority: Priority;
  description?: string;
  deadline?: string;
}

export interface JournalEntryFormData {
  entryDate: string;
  entryType: JournalEntryType;
  minutes: number;
  description: string;
  invoiceText?: string;
  billingType: BillingType;
}

export interface AgreementFormData {
  customerId: string;
  type: AgreementType;
  name: string;
  hourlyRate?: number;
  overtimeRate?: number;
  fixedAmount?: number;
  includedMinutes?: number;
  validFrom: string;
  validTo?: string;
}

// Dashboard KPIs
export interface DashboardKPIs {
  activeCustomers: number;
  activeCases: number;
  pendingTasks: number;
  monthlyRevenue: number;
  timebankUtilization: number;
  overdueItems: number;
}

// Filter/Query types
export interface CustomerFilters {
  status?: CustomerStatus;
  workspace?: Workspace;
  search?: string;
}

export interface CaseFilters {
  status?: CaseStatus;
  type?: CaseType;
  priority?: Priority;
  customerId?: string;
  assigneeId?: string;
  search?: string;
}

export interface BillingFilters {
  period?: string;
  status?: BillingLineStatus;
  customerId?: string;
}
