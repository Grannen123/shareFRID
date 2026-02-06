/**
 * Zod Validation Schemas for Grannfrid CRM
 *
 * All form validation schemas using Zod for type-safe validation.
 */

import { z } from "zod";

// Common patterns
const phoneRegex = /^(\+46|0)[0-9\s-]{8,15}$/;
const orgNumberRegex = /^[0-9]{6}-[0-9]{4}$/;
const postalCodeRegex = /^[0-9]{3}\s?[0-9]{2}$/;

// Error messages in Swedish
const errorMessages = {
  required: "Detta fält är obligatoriskt",
  email: "Ange en giltig e-postadress",
  phone: "Ange ett giltigt telefonnummer",
  orgNumber: "Ange ett giltigt organisationsnummer (XXXXXX-XXXX)",
  postalCode: "Ange ett giltigt postnummer",
  minLength: (min: number) => `Måste vara minst ${min} tecken`,
  maxLength: (max: number) => `Får vara max ${max} tecken`,
  positiveNumber: "Måste vara ett positivt tal",
  futureDate: "Datumet måste vara i framtiden",
};

// ============================================
// Customer Schemas
// ============================================

export const customerStatusSchema = z.enum(["active", "prospekt", "vilande"]);

export const customerSchema = z.object({
  fortnoxNumber: z
    .string()
    .min(1, errorMessages.required)
    .max(20, errorMessages.maxLength(20)),
  name: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  orgNumber: z
    .string()
    .regex(orgNumberRegex, errorMessages.orgNumber)
    .optional()
    .nullable(),
  status: customerStatusSchema.default("prospekt"),
  address: z
    .string()
    .max(200, errorMessages.maxLength(200))
    .optional()
    .nullable(),
  postalCode: z
    .string()
    .regex(postalCodeRegex, errorMessages.postalCode)
    .optional()
    .nullable(),
  city: z.string().max(100, errorMessages.maxLength(100)).optional().nullable(),
  workspace: z.string().min(1, errorMessages.required),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ============================================
// Contact Schemas
// ============================================

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  role: z.string().max(100, errorMessages.maxLength(100)).optional().nullable(),
  email: z
    .string()
    .email(errorMessages.email)
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(phoneRegex, errorMessages.phone)
    .optional()
    .nullable()
    .or(z.literal("")),
  isPrimary: z.boolean().default(false),
  isBillingContact: z.boolean().default(false),
  customerId: z.string().uuid(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// ============================================
// Agreement Schemas
// ============================================

export const agreementTypeSchema = z.enum([
  "lopande",
  "timbank",
  "fastpris",
  "engangbelopp",
]);
export const agreementStatusSchema = z.enum([
  "active",
  "paused",
  "expired",
  "cancelled",
]);

export const agreementSchema = z
  .object({
    name: z
      .string()
      .min(1, errorMessages.required)
      .max(200, errorMessages.maxLength(200)),
    type: agreementTypeSchema,
    status: agreementStatusSchema.default("active"),
    customerId: z.string().uuid(),
    hourlyRate: z
      .number()
      .positive(errorMessages.positiveNumber)
      .optional()
      .nullable(),
    overtimeRate: z
      .number()
      .positive(errorMessages.positiveNumber)
      .optional()
      .nullable(),
    fixedAmount: z
      .number()
      .positive(errorMessages.positiveNumber)
      .optional()
      .nullable(),
    includedMinutes: z
      .number()
      .int()
      .positive(errorMessages.positiveNumber)
      .optional()
      .nullable(),
    validFrom: z.string().min(1, errorMessages.required),
    validTo: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // Timbank requires includedMinutes
      if (data.type === "timbank" && !data.includedMinutes) {
        return false;
      }
      return true;
    },
    {
      message: "Timbank kräver antal inkluderade minuter",
      path: ["includedMinutes"],
    },
  )
  .refine(
    (data) => {
      // Lopande and timbank require hourlyRate
      if (
        (data.type === "lopande" || data.type === "timbank") &&
        !data.hourlyRate
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Denna avtalstyp kräver timtaxa",
      path: ["hourlyRate"],
    },
  )
  .refine(
    (data) => {
      // Fastpris and engangbelopp require fixedAmount
      if (
        (data.type === "fastpris" || data.type === "engangbelopp") &&
        !data.fixedAmount
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Denna avtalstyp kräver fast belopp",
      path: ["fixedAmount"],
    },
  );

export type AgreementFormData = z.infer<typeof agreementSchema>;

// ============================================
// Case Schemas
// ============================================

export const caseTypeSchema = z.enum([
  "storning",
  "andrahand",
  "ohyra",
  "skadegorelse",
  "olovlig_anvandning",
  "projekt",
  "ovrigt",
]);

export const caseStatusSchema = z.enum(["active", "paused", "closed"]);
export const prioritySchema = z.enum(["low", "medium", "high"]);

export const caseSchema = z.object({
  caseNumber: z
    .string()
    .min(1, errorMessages.required)
    .max(20, errorMessages.maxLength(20)),
  title: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  type: caseTypeSchema,
  status: caseStatusSchema.default("active"),
  priority: prioritySchema.default("medium"),
  customerId: z.string().uuid(),
  agreementId: z.string().uuid().optional().nullable(),
  billingContactId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  description: z
    .string()
    .max(2000, errorMessages.maxLength(2000))
    .optional()
    .nullable(),
  deadline: z.string().optional().nullable(),
  closedReason: z
    .string()
    .max(500, errorMessages.maxLength(500))
    .optional()
    .nullable(),
});

export type CaseFormData = z.infer<typeof caseSchema>;

// ============================================
// Journal Entry Schemas
// ============================================

export const journalEntryTypeSchema = z.enum([
  "samtal",
  "mail",
  "mote",
  "platsbesok",
  "internt",
  "ovrigt",
]);

export const billingTypeSchema = z.enum(["normal", "extra", "intern"]);

export const journalEntrySchema = z.object({
  caseId: z.string().uuid(),
  entryDate: z.string().min(1, errorMessages.required),
  entryType: journalEntryTypeSchema,
  minutes: z
    .number()
    .int()
    .min(1, "Minst 1 minut krävs")
    .max(1440, "Max 24 timmar per dag"),
  description: z
    .string()
    .min(1, errorMessages.required)
    .max(2000, errorMessages.maxLength(2000)),
  invoiceText: z
    .string()
    .max(100, errorMessages.maxLength(100))
    .optional()
    .nullable(),
  billingType: billingTypeSchema.default("normal"),
  consultantId: z.string().uuid().optional().nullable(),
});

export type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

// ============================================
// Task Schemas
// ============================================

export const taskStatusSchema = z.enum(["pending", "in_progress", "done"]);

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  description: z
    .string()
    .max(1000, errorMessages.maxLength(1000))
    .optional()
    .nullable(),
  status: taskStatusSchema.default("pending"),
  priority: prioritySchema.default("medium"),
  caseId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// ============================================
// Knowledge Article Schemas
// ============================================

export const knowledgeCategorySchema = z.enum([
  "juridik",
  "process",
  "mallar",
  "tips",
  "ovrigt",
]);

export const knowledgeArticleSchema = z.object({
  title: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  content: z
    .string()
    .min(1, errorMessages.required)
    .max(50000, errorMessages.maxLength(50000)),
  category: knowledgeCategorySchema,
  tags: z.array(z.string().max(50)).max(10, "Max 10 taggar"),
  isPublished: z.boolean().default(false),
});

export type KnowledgeArticleFormData = z.infer<typeof knowledgeArticleSchema>;

// ============================================
// Invoice Schemas
// ============================================

export const invoiceStatusSchema = z.enum([
  "draft",
  "pending",
  "sent",
  "paid",
  "cancelled",
]);

export const invoiceSchema = z.object({
  customerId: z.string().uuid(),
  billingContactId: z.string().uuid().optional().nullable(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
  invoiceNumber: z.string().max(50).optional().nullable(),
  totalAmount: z.number().min(0),
  status: invoiceStatusSchema.default("draft"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ============================================
// Billing Line Schemas
// ============================================

export const billingLineTypeSchema = z.enum([
  "timebank",
  "overtime",
  "hourly",
  "fixed",
]);
export const billingLineStatusSchema = z.enum([
  "pending",
  "review",
  "approved",
  "invoiced",
]);

export const billingLineSchema = z.object({
  journalEntryId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
  minutes: z.number().int().min(0),
  rate: z.number().min(0).optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  type: billingLineTypeSchema,
  status: billingLineStatusSchema.default("pending"),
  invoiceId: z.string().uuid().optional().nullable(),
  locked: z.boolean().default(false),
});

export type BillingLineFormData = z.infer<typeof billingLineSchema>;

// ============================================
// User Profile Schema
// ============================================

export const userProfileSchema = z.object({
  name: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  email: z.string().email(errorMessages.email),
  phone: z
    .string()
    .regex(phoneRegex, errorMessages.phone)
    .optional()
    .nullable()
    .or(z.literal("")),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

// ============================================
// Settings Schemas
// ============================================

export const workspaceSettingsSchema = z.object({
  name: z.string().min(1, errorMessages.required).max(100),
  defaultHourlyRate: z.number().positive().optional().nullable(),
  defaultOvertimeRate: z.number().positive().optional().nullable(),
  sharepointSiteId: z.string().optional().nullable(),
  sharepointDriveId: z.string().optional().nullable(),
});

export type WorkspaceSettingsFormData = z.infer<typeof workspaceSettingsSchema>;
