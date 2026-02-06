import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);

// Database types (generated from Supabase)
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          fortnox_number: string;
          name: string;
          org_number: string | null;
          status: string;
          workspace: string;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["customers"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      contacts: {
        Row: {
          id: string;
          customer_id: string;
          name: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          is_billing_contact: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["contacts"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
      };
      agreements: {
        Row: {
          id: string;
          customer_id: string;
          type: string;
          name: string;
          hourly_rate: number | null;
          overtime_rate: number | null;
          fixed_amount: number | null;
          included_minutes: number | null;
          used_minutes: number;
          valid_from: string;
          valid_to: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["agreements"]["Row"],
          "id" | "created_at" | "updated_at" | "used_minutes"
        >;
        Update: Partial<Database["public"]["Tables"]["agreements"]["Insert"]>;
      };
      cases: {
        Row: {
          id: string;
          case_number: string;
          customer_id: string;
          agreement_id: string | null;
          billing_contact_id: string | null;
          title: string;
          type: string;
          status: string;
          priority: string;
          assignee_id: string | null;
          description: string | null;
          deadline: string | null;
          closed_at: string | null;
          closed_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["cases"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["cases"]["Insert"]>;
      };
      journal_entries: {
        Row: {
          id: string;
          case_id: string;
          entry_date: string;
          entry_type: string;
          minutes: number;
          description: string;
          invoice_text: string | null;
          billing_type: string;
          consultant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["journal_entries"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["journal_entries"]["Insert"]
        >;
      };
      billing_lines: {
        Row: {
          id: string;
          journal_entry_id: string;
          period: string;
          minutes: number;
          rate: number | null;
          amount: number | null;
          type: string;
          status: string;
          invoice_id: string | null;
          locked: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["billing_lines"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["billing_lines"]["Insert"]
        >;
      };
      agreement_ledger: {
        Row: {
          id: string;
          agreement_id: string;
          entry_date: string;
          entry_type: string;
          minutes: number;
          balance_after: number;
          journal_entry_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["agreement_ledger"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["agreement_ledger"]["Insert"]
        >;
      };
      invoices: {
        Row: {
          id: string;
          customer_id: string;
          billing_contact_id: string | null;
          period: string;
          invoice_number: string | null;
          fortnox_invoice_id: string | null;
          total_amount: number;
          status: string;
          sent_at: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["invoices"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          case_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          assignee_id: string | null;
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["tasks"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: string;
          avatar_url: string | null;
          workspace: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["users"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      knowledge_articles: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string;
          tags: string[];
          author_id: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["knowledge_articles"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["knowledge_articles"]["Insert"]
        >;
      };
    };
  };
};
