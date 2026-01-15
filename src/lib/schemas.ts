import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  org_number: z.string().optional(),
  email: z.string().email('Ogiltig e-post').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  antal_lagenheter: z.number().int().positive().optional(),
  customer_type: z.enum(['brf', 'kommunalt_fastighetsbolag', 'privat_fastighetsbolag', 'forvaltningsbolag', 'stiftelse', 'samfallighet', 'ovrig']).optional(),
  status: z.enum(['active', 'prospekt', 'vilande']).default('active'),
});

export const agreementSchema = z.object({
  customer_id: z.string().uuid(),
  type: z.enum(['hourly', 'timebank', 'fixed']),
  hourly_rate: z.number().positive('Timpris måste vara positivt'),
  hourly_rate_evening: z.number().positive().optional(),
  overtime_rate: z.number().positive().optional(),
  included_hours: z.number().int().positive().optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  billing_advance: z.boolean().default(false),
  fixed_amount: z.number().positive().optional(),
  billing_month: z.number().int().min(1).max(12).optional(),
  valid_from: z.string(),
  valid_to: z.string().optional(),
  next_indexation: z.string().optional(),
}).refine((data) => {
  if (data.type === 'timebank') {
    return data.included_hours && data.period && data.overtime_rate;
  }
  return true;
}, { message: 'Timbank kräver inkluderade timmar, period och övertidspris' })
.refine((data) => {
  if (data.type === 'fixed') {
    return data.fixed_amount && data.period;
  }
  return true;
}, { message: 'Fastpris kräver belopp och period' });

export const assignmentSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1, 'Titel krävs'),
  description: z.string().optional(),
  type: z.enum(['case', 'project']),
  category: z.enum(['disturbance', 'illegal_sublet', 'screening', 'renovation_coordination', 'investigation', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const journalSchema = z.object({
  content: z.string().min(1, 'Innehåll krävs'),
  hours: z.number().min(0).optional(),
  billing_comment: z.string().optional(),
  is_extra_billable: z.boolean().default(false),
  entry_type: z.enum(['call', 'email', 'meeting', 'site_visit', 'note']).default('note'),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Titel krävs'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contact_type: z.enum(['customer', 'assignment', 'standalone']).default('customer'),
  is_invoice_recipient: z.boolean().default(false),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
});

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1, 'Titel krävs'),
  content: z.string().min(1, 'Innehåll krävs'),
  category: z.enum(['knowledge', 'policy', 'routine']),
  tags: z.array(z.string()).optional(),
  is_published: z.boolean().default(true),
});

export const profileSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  phone: z.string().optional(),
  title: z.string().optional(),
  default_hourly_rate: z.number().positive().optional(),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
});

export const quickNoteSchema = z.object({
  content: z.string().min(1, 'Innehåll krävs'),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
});

export const customerNoteSchema = z.object({
  content: z.string().min(1, 'Innehåll krävs'),
  is_pinned: z.boolean().default(false),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type AgreementFormData = z.infer<typeof agreementSchema>;
export type AssignmentFormData = z.infer<typeof assignmentSchema>;
export type JournalFormData = z.infer<typeof journalSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type KnowledgeArticleFormData = z.infer<typeof knowledgeArticleSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type QuickNoteFormData = z.infer<typeof quickNoteSchema>;
export type CustomerNoteFormData = z.infer<typeof customerNoteSchema>;
