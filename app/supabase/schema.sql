-- Grannfrid CRM Database Schema for Supabase
-- Version: 1.0.0
-- Description: Complete database schema for housing consultant CRM

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'owner')),
    avatar_url TEXT,
    workspace VARCHAR(20) CHECK (workspace IN ('goteborg', 'stockholm')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS TABLE (Kunder)
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fortnox_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    org_number VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'prospekt', 'vilande')),
    workspace VARCHAR(20) NOT NULL CHECK (workspace IN ('goteborg', 'stockholm')),
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by workspace and status
CREATE INDEX idx_customers_workspace ON customers(workspace);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_fortnox ON customers(fortnox_number);

-- ============================================
-- CONTACTS TABLE (Kontakter)
-- ============================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    is_billing_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_customer ON contacts(customer_id);

-- ============================================
-- AGREEMENTS TABLE (Avtal)
-- ============================================
CREATE TABLE agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('hourly', 'timebank', 'fixed', 'onetime')),
    name VARCHAR(255) NOT NULL,
    hourly_rate DECIMAL(10,2),
    overtime_rate DECIMAL(10,2),
    fixed_amount DECIMAL(10,2),
    included_minutes INTEGER, -- For timebank: total minutes included
    used_minutes INTEGER DEFAULT 0, -- For timebank: minutes used
    valid_from DATE NOT NULL,
    valid_to DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agreements_customer ON agreements(customer_id);
CREATE INDEX idx_agreements_status ON agreements(status);

-- ============================================
-- AGREEMENT LEDGER TABLE (Avtals-reskontra för timbank)
-- Tracks all changes to timebank balance
-- ============================================
CREATE TABLE agreement_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('initial', 'usage', 'adjustment', 'rollover')),
    minutes INTEGER NOT NULL, -- Positive = added, Negative = used
    balance_after INTEGER NOT NULL, -- Running balance after this entry
    journal_entry_id UUID, -- Reference to journal entry if usage
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_agreement ON agreement_ledger(agreement_id);
CREATE INDEX idx_ledger_date ON agreement_ledger(entry_date);

-- ============================================
-- CASES TABLE (Ärenden/Uppdrag)
-- ============================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(20) NOT NULL UNIQUE, -- Format: C-YY-NNN or P-YY-NNN
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
    billing_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('case', 'project')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    deadline DATE,
    closed_at TIMESTAMPTZ,
    closed_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_customer ON cases(customer_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_type ON cases(type);
CREATE INDEX idx_cases_assignee ON cases(assignee_id);
CREATE INDEX idx_cases_case_number ON cases(case_number);

-- ============================================
-- JOURNAL ENTRIES TABLE (Journalanteckningar)
-- ============================================
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('call', 'email', 'meeting', 'visit', 'letter', 'admin', 'other')),
    minutes INTEGER NOT NULL CHECK (minutes > 0),
    description TEXT NOT NULL,
    invoice_text VARCHAR(500), -- Text that appears on invoice
    billing_type VARCHAR(20) NOT NULL DEFAULT 'included' CHECK (billing_type IN ('included', 'extra', 'non_billable')),
    consultant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_case ON journal_entries(case_id);
CREATE INDEX idx_journal_date ON journal_entries(entry_date);

-- ============================================
-- BILLING LINES TABLE (Faktureringsrader)
-- Created from journal entries, supports timbank split
-- ============================================
CREATE TABLE billing_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    minutes INTEGER NOT NULL CHECK (minutes > 0),
    rate DECIMAL(10,2), -- NULL for timebank (included)
    amount DECIMAL(10,2), -- Calculated: minutes/60 * rate, or 0 for timebank
    type VARCHAR(20) NOT NULL CHECK (type IN ('timebank', 'overtime', 'hourly', 'fixed')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'approved', 'invoiced')),
    invoice_id UUID, -- Reference to invoice when invoiced
    locked BOOLEAN DEFAULT FALSE, -- True when invoiced
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_journal ON billing_lines(journal_entry_id);
CREATE INDEX idx_billing_period ON billing_lines(period);
CREATE INDEX idx_billing_status ON billing_lines(status);
CREATE INDEX idx_billing_invoice ON billing_lines(invoice_id);

-- ============================================
-- INVOICES TABLE (Fakturor)
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    billing_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    invoice_number VARCHAR(50), -- From Fortnox
    fortnox_invoice_id VARCHAR(100), -- Fortnox reference
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_period ON invoices(period);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Add foreign key to billing_lines for invoice reference
ALTER TABLE billing_lines
ADD CONSTRAINT fk_billing_invoice
FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================
-- TASKS TABLE (Uppgifter)
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ============================================
-- KNOWLEDGE ARTICLES TABLE (Kunskapsartiklar)
-- ============================================
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_category ON knowledge_articles(category);
CREATE INDEX idx_articles_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX idx_articles_published ON knowledge_articles(is_published);

-- ============================================
-- NOTES TABLE (Personliga anteckningar)
-- ============================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user ON notes(user_id);

-- ============================================
-- CASE NUMBER SEQUENCE
-- Separate sequences for cases and projects per year
-- ============================================
CREATE TABLE case_sequences (
    year INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('case', 'project')),
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (year, type)
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate next case number
CREATE OR REPLACE FUNCTION generate_case_number(p_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_number INTEGER;
    v_prefix CHAR(1);
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_prefix := CASE p_type WHEN 'case' THEN 'C' ELSE 'P' END;

    INSERT INTO case_sequences (year, type, last_number)
    VALUES (v_year, p_type, 1)
    ON CONFLICT (year, type)
    DO UPDATE SET last_number = case_sequences.last_number + 1
    RETURNING last_number INTO v_number;

    RETURN v_prefix || '-' || RIGHT(v_year::TEXT, 2) || '-' || LPAD(v_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate timbank split
CREATE OR REPLACE FUNCTION calculate_timbank_split(
    p_agreement_id UUID,
    p_minutes INTEGER,
    p_journal_entry_id UUID
)
RETURNS TABLE (
    timebank_minutes INTEGER,
    overtime_minutes INTEGER,
    new_balance INTEGER
) AS $$
DECLARE
    v_remaining INTEGER;
    v_included INTEGER;
    v_used INTEGER;
BEGIN
    -- Get current agreement state
    SELECT included_minutes, used_minutes
    INTO v_included, v_used
    FROM agreements
    WHERE id = p_agreement_id;

    v_remaining := COALESCE(v_included, 0) - COALESCE(v_used, 0);

    IF v_remaining >= p_minutes THEN
        -- All time fits in timebank
        timebank_minutes := p_minutes;
        overtime_minutes := 0;
    ELSE
        -- Split between timebank and overtime
        timebank_minutes := GREATEST(0, v_remaining);
        overtime_minutes := p_minutes - timebank_minutes;
    END IF;

    new_balance := v_remaining - timebank_minutes;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agreement used_minutes when journal entry is created
CREATE OR REPLACE FUNCTION update_agreement_timbank()
RETURNS TRIGGER AS $$
DECLARE
    v_agreement_id UUID;
    v_split RECORD;
BEGIN
    -- Get the agreement for this case
    SELECT agreement_id INTO v_agreement_id
    FROM cases WHERE id = NEW.case_id;

    IF v_agreement_id IS NOT NULL AND NEW.billing_type = 'included' THEN
        -- Calculate split
        SELECT * INTO v_split
        FROM calculate_timbank_split(v_agreement_id, NEW.minutes, NEW.id);

        -- Update agreement used_minutes
        UPDATE agreements
        SET used_minutes = used_minutes + v_split.timebank_minutes,
            updated_at = NOW()
        WHERE id = v_agreement_id;

        -- Add ledger entry
        INSERT INTO agreement_ledger (
            agreement_id, entry_type, minutes, balance_after, journal_entry_id
        ) VALUES (
            v_agreement_id, 'usage', -v_split.timebank_minutes, v_split.new_balance, NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_entry_timbank
AFTER INSERT ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_agreement_timbank();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agreements_updated_at BEFORE UPDATE ON agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON knowledge_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read most data
-- (In production, you'd want more granular policies based on workspace/role)

CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON customers FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can read contacts" ON contacts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage contacts" ON contacts FOR ALL USING (true);

CREATE POLICY "Authenticated users can read agreements" ON agreements FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage agreements" ON agreements FOR ALL USING (true);

CREATE POLICY "Authenticated users can read ledger" ON agreement_ledger FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ledger" ON agreement_ledger FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can read cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage cases" ON cases FOR ALL USING (true);

CREATE POLICY "Authenticated users can read journal" ON journal_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage journal" ON journal_entries FOR ALL USING (true);

CREATE POLICY "Authenticated users can read billing" ON billing_lines FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage billing" ON billing_lines FOR ALL USING (true);

CREATE POLICY "Authenticated users can read invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage invoices" ON invoices FOR ALL USING (true);

CREATE POLICY "Authenticated users can read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage tasks" ON tasks FOR ALL USING (true);

CREATE POLICY "Anyone can read published articles" ON knowledge_articles FOR SELECT USING (is_published = true);
CREATE POLICY "Authenticated users can manage articles" ON knowledge_articles FOR ALL USING (true);

CREATE POLICY "Users can manage own notes" ON notes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SAMPLE DATA (for development)
-- ============================================

-- Insert sample users
INSERT INTO users (id, email, name, role, workspace) VALUES
    ('00000000-0000-0000-0000-000000000001', 'peter@grannfrid.se', 'Peter Larsson', 'admin', 'goteborg'),
    ('00000000-0000-0000-0000-000000000002', 'anna@grannfrid.se', 'Anna Svensson', 'consultant', 'goteborg'),
    ('00000000-0000-0000-0000-000000000003', 'erik@grannfrid.se', 'Erik Johansson', 'consultant', 'stockholm');

-- Insert sample customers
INSERT INTO customers (id, fortnox_number, name, org_number, status, workspace, address, postal_code, city) VALUES
    ('10000000-0000-0000-0000-000000000001', '10234', 'BRF Solbacken', '769612-3456', 'active', 'goteborg', 'Solbackevägen 12', '41257', 'Göteborg'),
    ('10000000-0000-0000-0000-000000000002', '10235', 'BRF Havsutsikten', '769612-7890', 'active', 'goteborg', 'Havsvägen 45', '41301', 'Göteborg'),
    ('10000000-0000-0000-0000-000000000003', '10240', 'HSB Kungsbacka', '769612-1234', 'active', 'goteborg', 'Kungsgatan 10', '43430', 'Kungsbacka'),
    ('10000000-0000-0000-0000-000000000004', '20100', 'BRF Södermalm', '769612-5678', 'active', 'stockholm', 'Götgatan 100', '11862', 'Stockholm');

-- Insert sample contacts
INSERT INTO contacts (customer_id, name, role, email, phone, is_primary, is_billing_contact) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Anders Karlsson', 'Styrelseordförande', 'anders@solbacken.se', '070-123 45 67', true, true),
    ('10000000-0000-0000-0000-000000000001', 'Maria Nilsson', 'Sekreterare', 'maria@solbacken.se', '070-234 56 78', false, false),
    ('10000000-0000-0000-0000-000000000002', 'Eva Lindqvist', 'Ordförande', 'eva@havsutsikten.se', '070-345 67 89', true, true),
    ('10000000-0000-0000-0000-000000000003', 'Erik Svensson', 'Förvaltare', 'erik@hsbkungsbacka.se', '070-456 78 90', true, true);

-- Insert sample agreements
INSERT INTO agreements (id, customer_id, type, name, hourly_rate, overtime_rate, included_minutes, valid_from, status) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'timebank', 'Grundavtal 2026', 1100, 1200, 600, '2026-01-01', 'active'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'hourly', 'Löpande konsultation', 1100, NULL, NULL, '2026-01-01', 'active'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'timebank', 'Årsavtal 2026', 1000, 1100, 1200, '2026-01-01', 'active');

-- Initialize agreement ledger for timbank agreements
INSERT INTO agreement_ledger (agreement_id, entry_type, minutes, balance_after, description) VALUES
    ('20000000-0000-0000-0000-000000000001', 'initial', 600, 600, 'Initialt saldo 2026'),
    ('20000000-0000-0000-0000-000000000003', 'initial', 1200, 1200, 'Initialt saldo 2026');

-- Initialize case sequences
INSERT INTO case_sequences (year, type, last_number) VALUES
    (2026, 'case', 47),
    (2026, 'project', 8);
