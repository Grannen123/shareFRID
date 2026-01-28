export type CustomerType =
  | "brf"
  | "kommunalt_fastighetsbolag"
  | "privat_fastighetsbolag"
  | "forvaltningsbolag"
  | "stiftelse"
  | "samfallighet"
  | "ovrig";

export type CustomerStatus = "active" | "prospekt" | "vilande";

export type AgreementType = "hourly" | "timebank" | "fixed";
export type AgreementStatus = "draft" | "active" | "expired" | "terminated";
export type AgreementPeriod = "monthly" | "yearly";

export type AssignmentType = "case" | "project";
export type AssignmentStatus = "active" | "paused" | "closed";
export type AssignmentCategory =
  | "disturbance"
  | "illegal_sublet"
  | "screening"
  | "renovation_coordination"
  | "investigation"
  | "other";

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "done";

export type BillingType =
  | "timebank"
  | "overtime"
  | "hourly"
  | "fixed"
  | "internal";
export type BatchStatus = "draft" | "review" | "exported" | "locked";

export type EntryType = "call" | "email" | "meeting" | "site_visit" | "note";

export type KnowledgeCategory = "knowledge" | "policy" | "routine";

export type UserRole = "admin" | "consultant" | "readonly";

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface Profile {
  id: string;
  workspace_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  role: UserRole;
  default_hourly_rate: number | null;
  notifications_enabled: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  customer_number: string;
  name: string;
  org_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  antal_lagenheter: number | null;
  customer_type: CustomerType | null;
  status: CustomerStatus;
  responsible_consultant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Agreement {
  id: string;
  customer_id: string;
  type: AgreementType;
  status: AgreementStatus;
  hourly_rate: number;
  hourly_rate_evening: number | null;
  overtime_rate: number | null;
  included_hours: number | null;
  period: AgreementPeriod | null;
  billing_advance: boolean;
  fixed_amount: number | null;
  billing_month: number | null;
  valid_from: string;
  valid_to: string | null;
  notice_period_months: number;
  auto_renewal: boolean;
  next_indexation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  customer_id: string;
  agreement_id: string | null;
  assignment_number: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  category: AssignmentCategory | null;
  status: AssignmentStatus;
  priority: Priority;
  responsible_consultant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  assignment_id: string;
  content: string;
  content_type: "text" | "tiptap_json";
  hours: number | null;
  billing_comment: string | null;
  is_extra_billable: boolean;
  is_pinned: boolean;
  entry_type: EntryType;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  customer_id: string;
  assignment_id: string | null;
  agreement_id: string | null;
  journal_entry_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  hourly_rate: number | null;
  billing_type: BillingType;
  is_billable: boolean;
  is_exported: boolean;
  export_batch_id: string | null;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  customer_id: string | null;
  assignment_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  customer_id: string | null;
  assignment_id: string | null;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  contact_type: "customer" | "assignment" | "standalone";
  is_invoice_recipient: boolean;
  created_at: string;
}

export interface QuickNote {
  id: string;
  content: string;
  customer_id: string | null;
  assignment_id: string | null;
  is_processed: boolean;
  processed_journal_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BillingBatch {
  id: string;
  batch_id: string;
  customer_id: string;
  period_year: number;
  period_month: number;
  status: BatchStatus;
  total_amount: number | null;
  exported_at: string | null;
  exported_by: string | null;
  fortnox_invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[] | null;
  is_published: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  performed_by: string;
  performed_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
}

export interface FileRecord {
  id: string;
  customer_id: string | null;
  assignment_id: string | null;
  journal_entry_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

// ============================================================================
// EXTENDED TYPES (med relationer)
// ============================================================================

export interface CustomerWithAgreement extends Customer {
  agreement: Agreement | null;
}

export interface AssignmentWithCustomer extends Assignment {
  customer: Customer;
}

export interface JournalEntryWithAuthor extends JournalEntry {
  author: Profile;
}

export interface TaskWithRelations extends Task {
  customer?: Customer;
  assignment?: Assignment;
  assignee?: Profile;
}

export interface CustomerNoteWithAuthor extends CustomerNote {
  author: Profile;
}

export interface AgreementWithCustomer extends Agreement {
  customer: Customer;
}

// Timbank status från view
export interface TimebankCurrentStatus {
  agreement_id: string;
  customer_id: string;
  included_hours: number;
  period: AgreementPeriod;
  hours_used_this_period: number;
  hours_remaining: number;
}
