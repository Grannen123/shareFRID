# Supabase Setup Guide - Grannfrid

Komplett steg-för-steg guide för att sätta upp Supabase-projektet.

---

## STEG 1: Skapa Supabase-konto och projekt

1. **Gå till:** https://supabase.com
2. **Klicka:** "Start your project" (eller "Sign in" om du har konto)
3. **Logga in med:** GitHub, Google, eller email
4. **Klicka:** "New Project"
5. **Fyll i:**
   - **Name:** `grannfrid` (eller valfritt)
   - **Database Password:** Välj ett starkt lösenord (SPARA DET!)
   - **Region:** `eu-north-1 (Stockholm)` - välj närmast dig
   - **Pricing Plan:** Free tier fungerar för utveckling
6. **Klicka:** "Create new project"
7. **Vänta:** ~2 minuter medan projektet skapas

---

## STEG 2: Hämta API-credentials

När projektet är klart:

1. **Gå till:** Settings (kugghjulet längst ner i sidomenyn)
2. **Klicka:** "API" i undermenyn
3. **Kopiera dessa värden:**

```
Project URL:     https://XXXXXX.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXX...
```

4. **Skapa `.env`-fil** i projektmappen (`alla mina appar/`):

```bash
# Skapa filen (kör i terminalen)
cd "/Users/jonashalvarsson/Desktop/alla mina appar"

cat > .env << 'EOF'
VITE_SUPABASE_URL=https://XXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXX
EOF
```

**ELLER** skapa filen manuellt med textredigerare.

---

## STEG 3: Aktivera Email Auth

1. **Gå till:** Authentication (i sidomenyn)
2. **Klicka:** "Providers" (underflik)
3. **Kontrollera att "Email" är aktiverad** (ska vara default)
4. **Valfritt - för enklare testning:**
   - Gå till "Email Templates"
   - Under "Confirm signup" - kryssa i "Enable email confirmations" (eller av för snabbare test)

---

## STEG 4: Kör SQL-schemat

Nu ska vi skapa alla tabeller. Kopiera SQL-koden nedan och kör den.

1. **Gå till:** SQL Editor (i sidomenyn, ser ut som en terminal)
2. **Klicka:** "New query"
3. **Kopiera ALLT nedan** och klistra in:

```sql
-- ============================================================================
-- GRANNFRID 2.0 - KOMPLETT DATABASSCHEMA v3
-- Med concurrency-safe sequences och proper RLS
-- ============================================================================

-- Aktivera pgcrypto för gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SEQUENCES för concurrency-safe nummer-generering
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS assignment_case_seq START 1;
CREATE SEQUENCE IF NOT EXISTS assignment_project_seq START 1;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. WORKSPACES
-- ============================================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO workspaces (name, location) VALUES
  ('Göteborg', 'Göteborg'),
  ('Stockholm', 'Stockholm');

-- ============================================================================
-- 2. USER PROFILES
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'readonly')),
  default_hourly_rate NUMERIC(10,2),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Okänd användare'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 3. KUNDER
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  customer_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  org_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  antal_lagenheter INTEGER,
  customer_type TEXT CHECK (customer_type IN ('brf', 'kommunalt_fastighetsbolag', 'privat_fastighetsbolag', 'forvaltningsbolag', 'stiftelse', 'samfallighet', 'ovrig')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'prospekt', 'vilande')),
  responsible_consultant_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Concurrency-safe customer number generation
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := 'K-' || LPAD(nextval('customer_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION generate_customer_number();

-- ============================================================================
-- 4. KUNDANTECKNINGAR
-- ============================================================================
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER customer_notes_updated_at
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. AVTAL
-- ============================================================================
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hourly', 'timebank', 'fixed')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  hourly_rate NUMERIC(10,2) NOT NULL,
  hourly_rate_evening NUMERIC(10,2),
  overtime_rate NUMERIC(10,2),
  included_hours INTEGER,
  period TEXT CHECK (period IN ('monthly', 'yearly')),
  billing_advance BOOLEAN DEFAULT false,
  fixed_amount NUMERIC(10,2),
  billing_month INTEGER CHECK (billing_month BETWEEN 1 AND 12),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  notice_period_months INTEGER DEFAULT 3,
  auto_renewal BOOLEAN DEFAULT true,
  next_indexation DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT timebank_requires_fields CHECK (
    type != 'timebank' OR (included_hours IS NOT NULL AND period IS NOT NULL AND overtime_rate IS NOT NULL)
  ),
  CONSTRAINT fixed_requires_fields CHECK (
    type != 'fixed' OR (fixed_amount IS NOT NULL)
  )
);

CREATE TRIGGER agreements_updated_at
  BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. UPPDRAG
-- ============================================================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES agreements(id),
  assignment_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('case', 'project')),
  category TEXT CHECK (category IN ('disturbance', 'illegal_sublet', 'screening', 'renovation_coordination', 'investigation', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  responsible_consultant_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Concurrency-safe assignment number generation
CREATE OR REPLACE FUNCTION generate_assignment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_number IS NULL THEN
    IF NEW.type = 'project' THEN
      NEW.assignment_number := 'P-' || LPAD(nextval('assignment_project_seq')::TEXT, 3, '0');
    ELSE
      NEW.assignment_number := 'C-' || LPAD(nextval('assignment_case_seq')::TEXT, 3, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_assignment_number
  BEFORE INSERT ON assignments
  FOR EACH ROW EXECUTE FUNCTION generate_assignment_number();

-- ============================================================================
-- 7. JOURNALANTECKNINGAR
-- ============================================================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'tiptap_json')),
  hours NUMERIC(5,2),
  billing_comment TEXT,
  is_extra_billable BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  entry_type TEXT DEFAULT 'note' CHECK (entry_type IN ('call', 'email', 'meeting', 'site_visit', 'note')),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. TIDSREGISTRERINGAR
-- ============================================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES agreements(id),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  description TEXT,
  hourly_rate NUMERIC(10,2),
  billing_type TEXT DEFAULT 'hourly' CHECK (billing_type IN ('timebank', 'overtime', 'hourly', 'fixed', 'internal')),
  is_billable BOOLEAN DEFAULT true,
  is_exported BOOLEAN DEFAULT false,
  export_batch_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. UPPGIFTER
-- ============================================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 10. KONTAKTER
-- ============================================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  contact_type TEXT DEFAULT 'customer' CHECK (contact_type IN ('customer', 'assignment', 'standalone')),
  is_invoice_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. SNABBANTECKNINGAR
-- ============================================================================
CREATE TABLE quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  is_processed BOOLEAN DEFAULT false,
  processed_journal_id UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER quick_notes_updated_at
  BEFORE UPDATE ON quick_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 12. FILER
-- ============================================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. FAKTURERINGSBATCHER
-- ============================================================================
CREATE TABLE billing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'exported', 'locked')),
  total_amount NUMERIC(12,2),
  exported_at TIMESTAMPTZ,
  exported_by UUID REFERENCES auth.users(id),
  fortnox_invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, period_year, period_month)
);

CREATE TRIGGER billing_batches_updated_at
  BEFORE UPDATE ON billing_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 14. KUNSKAPSBANK
-- ============================================================================
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('knowledge', 'policy', 'routine')),
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 15. AKTIVITETSLOGG
-- ============================================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_customers_workspace ON customers(workspace_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_assignments_customer ON assignments(customer_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_journal_assignment ON journal_entries(assignment_id);
CREATE INDEX idx_journal_archived ON journal_entries(is_archived) WHERE is_archived = false;
CREATE INDEX idx_time_entries_customer ON time_entries(customer_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_exported ON time_entries(is_exported) WHERE is_exported = false;
CREATE INDEX idx_time_entries_billing_type ON time_entries(billing_type);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'done';
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_knowledge_category ON knowledge_articles(category);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_agreements_indexation ON agreements(next_indexation) WHERE next_indexation IS NOT NULL;
CREATE INDEX idx_agreements_customer ON agreements(customer_id);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES med WITH CHECK (kritiskt för INSERT/UPDATE)
-- ============================================================================

-- Profiles: endast sin egen profil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Customers: workspace-baserad (förberett för multi-tenant)
-- För MVP: alla autentiserade kan allt
CREATE POLICY "authenticated_select" ON customers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert" ON customers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update" ON customers
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON customers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customer Notes
CREATE POLICY "authenticated_all" ON customer_notes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Agreements
CREATE POLICY "authenticated_all" ON agreements
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Assignments
CREATE POLICY "authenticated_all" ON assignments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Journal Entries
CREATE POLICY "authenticated_all" ON journal_entries
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Time Entries
CREATE POLICY "authenticated_all" ON time_entries
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Tasks
CREATE POLICY "authenticated_all" ON tasks
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Contacts
CREATE POLICY "authenticated_all" ON contacts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Quick Notes
CREATE POLICY "authenticated_all" ON quick_notes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Files
CREATE POLICY "authenticated_all" ON files
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Billing Batches
CREATE POLICY "authenticated_all" ON billing_batches
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Knowledge Articles
CREATE POLICY "authenticated_all" ON knowledge_articles
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Activity Log (endast läsning för icke-admin)
CREATE POLICY "authenticated_select" ON activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- VIEW för Timbank-status (on-the-fly beräkning)
-- ============================================================================
CREATE OR REPLACE VIEW timebank_current_status AS
SELECT
  a.id as agreement_id,
  a.customer_id,
  a.included_hours,
  a.period,
  COALESCE(SUM(
    CASE
      WHEN te.billing_type IN ('timebank', 'overtime')
      AND te.date >= date_trunc(
        CASE WHEN a.period = 'monthly' THEN 'month' ELSE 'year' END,
        CURRENT_DATE
      )
      THEN te.hours
      ELSE 0
    END
  ), 0) as hours_used_this_period,
  a.included_hours - COALESCE(SUM(
    CASE
      WHEN te.billing_type = 'timebank'
      AND te.date >= date_trunc(
        CASE WHEN a.period = 'monthly' THEN 'month' ELSE 'year' END,
        CURRENT_DATE
      )
      THEN te.hours
      ELSE 0
    END
  ), 0) as hours_remaining
FROM agreements a
LEFT JOIN time_entries te ON te.agreement_id = a.id
WHERE a.type = 'timebank' AND a.status = 'active'
GROUP BY a.id, a.customer_id, a.included_hours, a.period;
```

4. **Klicka:** "Run" (grön knapp eller Cmd/Ctrl+Enter)
5. **Verifiera:** Du bör se "Success. No rows returned" (det är OK!)

---

## STEG 5: Verifiera att tabellerna skapades

1. **Gå till:** Table Editor (i sidomenyn)
2. **Kontrollera att dessa tabeller finns:**
   - [ ] workspaces (ska ha 2 rader: Göteborg, Stockholm)
   - [ ] profiles
   - [ ] customers
   - [ ] customer_notes
   - [ ] agreements
   - [ ] assignments
   - [ ] journal_entries
   - [ ] time_entries
   - [ ] tasks
   - [ ] contacts
   - [ ] quick_notes
   - [ ] files
   - [ ] billing_batches
   - [ ] knowledge_articles
   - [ ] activity_log

---

## STEG 6: Skapa din första användare (för test)

1. **Gå till:** Authentication (i sidomenyn)
2. **Klicka:** "Users" (underflik)
3. **Klicka:** "Add user" → "Create new user"
4. **Fyll i:**
   - Email: din-email@example.com
   - Password: valfritt lösenord
   - Auto confirm: JA (kryssruta)
5. **Klicka:** "Create user"

**Alternativt:** Skapa användare via appen när den är byggd.

---

## STEG 7: Konfigurera Site URL (för produktion senare)

1. **Gå till:** Authentication → URL Configuration
2. **Site URL:** Lämna som `http://localhost:5173` för nu
3. **Redirect URLs:** Lägg till:
   - `http://localhost:5173`
   - `http://localhost:5173/*`

---

## SAMMANFATTNING - Checklista

- [ ] Supabase-konto skapat
- [ ] Nytt projekt skapat (region: Stockholm)
- [ ] API-credentials kopierade till `.env`
- [ ] Email Auth aktiverad
- [ ] SQL-schema kört (alla tabeller skapade)
- [ ] Workspaces-tabell har 2 rader
- [ ] (Valfritt) Testanvändare skapad
- [ ] Site URL konfigurerad

---

## FELSÖKNING

### "permission denied for schema public"
- Kör SQL igen, ibland tar det ett par sekunder innan permissions sätts

### "relation already exists"
- Tabellerna finns redan - det är OK! Du kan ignorera felet eller köra:
  ```sql
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO public;
  ```
  ...och sedan köra SQL-schemat igen.

### "RLS policy violation"
- Se till att du är inloggad som en användare innan du försöker läsa/skriva data

---

## NÄSTA STEG

När Supabase är uppsatt, ge mig besked och vi kan starta app-bygget!
