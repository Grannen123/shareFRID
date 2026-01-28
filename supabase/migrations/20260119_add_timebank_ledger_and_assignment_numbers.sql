-- Migration: Timebank ledger + assignment numbers
-- Date: 2026-01-19
-- Purpose: Add append-only timebank ledger and deterministic assignment numbering.

-- =============================================================================
-- TIMEBANK LEDGER
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timebank_tx_type') THEN
    CREATE TYPE timebank_tx_type AS ENUM ('time_deduction', 'manual_adjustment');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.timebank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  transaction_type timebank_tx_type NOT NULL,
  -- Negative hours for deduction, positive for credit/adjustment.
  hours NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  reference_id UUID,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timebank_ledger_agreement_period
  ON public.timebank_ledger(agreement_id, period_start, period_end, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timebank_ledger_reference_id
  ON public.timebank_ledger(reference_id);

ALTER TABLE public.timebank_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE polname = 'timebank_ledger_select_authenticated'
      AND tablename = 'timebank_ledger'
  ) THEN
    CREATE POLICY "timebank_ledger_select_authenticated"
      ON public.timebank_ledger
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Helper: insert ledger entry based on agreement period
CREATE OR REPLACE FUNCTION public.timebank_ledger_add_entry(
  p_agreement_id UUID,
  p_entry_date DATE,
  p_hours NUMERIC,
  p_tx_type timebank_tx_type,
  p_reference_id UUID,
  p_created_by UUID,
  p_note TEXT
) RETURNS void AS $$
DECLARE
  v_agreement_type TEXT;
  v_period TEXT;
  v_period_start DATE;
  v_period_end DATE;
  v_entry_date DATE;
BEGIN
  IF p_agreement_id IS NULL OR p_hours IS NULL OR p_hours = 0 THEN
    RETURN;
  END IF;

  SELECT type, period
    INTO v_agreement_type, v_period
  FROM agreements
  WHERE id = p_agreement_id;

  IF v_agreement_type != 'timebank' OR v_period IS NULL THEN
    RETURN;
  END IF;

  v_entry_date := COALESCE(p_entry_date, CURRENT_DATE);

  IF v_period = 'monthly' THEN
    v_period_start := DATE_TRUNC('month', v_entry_date)::DATE;
    v_period_end := (DATE_TRUNC('month', v_entry_date) + INTERVAL '1 month - 1 day')::DATE;
  ELSE
    v_period_start := DATE_TRUNC('year', v_entry_date)::DATE;
    v_period_end := (DATE_TRUNC('year', v_entry_date) + INTERVAL '1 year - 1 day')::DATE;
  END IF;

  INSERT INTO public.timebank_ledger (
    agreement_id,
    transaction_type,
    hours,
    period_start,
    period_end,
    reference_id,
    created_by,
    note
  ) VALUES (
    p_agreement_id,
    p_tx_type,
    p_hours,
    v_period_start,
    v_period_end,
    p_reference_id,
    p_created_by,
    p_note
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger: INSERT time_entries -> ledger
CREATE OR REPLACE FUNCTION public.timebank_ledger_on_time_entry_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.billing_type != 'timebank' THEN
    RETURN NEW;
  END IF;

  PERFORM public.timebank_ledger_add_entry(
    NEW.agreement_id,
    NEW.date,
    -NEW.hours,
    'time_deduction',
    NEW.id,
    NEW.created_by,
    'time_entry'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: UPDATE time_entries -> ledger adjustment
CREATE OR REPLACE FUNCTION public.timebank_ledger_on_time_entry_update()
RETURNS trigger AS $$
BEGIN
  IF (OLD.billing_type IS NOT DISTINCT FROM NEW.billing_type)
     AND (OLD.agreement_id IS NOT DISTINCT FROM NEW.agreement_id)
     AND (OLD.hours IS NOT DISTINCT FROM NEW.hours)
     AND (OLD.date IS NOT DISTINCT FROM NEW.date) THEN
    RETURN NEW;
  END IF;

  IF OLD.billing_type = 'timebank' THEN
    PERFORM public.timebank_ledger_add_entry(
      OLD.agreement_id,
      OLD.date,
      OLD.hours,
      'manual_adjustment',
      OLD.id,
      OLD.created_by,
      'reversal:update'
    );
  END IF;

  IF NEW.billing_type = 'timebank' THEN
    PERFORM public.timebank_ledger_add_entry(
      NEW.agreement_id,
      NEW.date,
      -NEW.hours,
      'time_deduction',
      NEW.id,
      NEW.created_by,
      'update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: DELETE time_entries -> ledger adjustment
CREATE OR REPLACE FUNCTION public.timebank_ledger_on_time_entry_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.billing_type = 'timebank' THEN
    PERFORM public.timebank_ledger_add_entry(
      OLD.agreement_id,
      OLD.date,
      OLD.hours,
      'manual_adjustment',
      OLD.id,
      OLD.created_by,
      'reversal:delete'
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_timebank_ledger_insert') THEN
    CREATE TRIGGER trg_timebank_ledger_insert
      AFTER INSERT ON public.time_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.timebank_ledger_on_time_entry_insert();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_timebank_ledger_update') THEN
    CREATE TRIGGER trg_timebank_ledger_update
      AFTER UPDATE ON public.time_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.timebank_ledger_on_time_entry_update();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_timebank_ledger_delete') THEN
    CREATE TRIGGER trg_timebank_ledger_delete
      AFTER DELETE ON public.time_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.timebank_ledger_on_time_entry_delete();
  END IF;
END $$;

-- Backfill ledger from existing time_entries (timebank only)
INSERT INTO public.timebank_ledger (
  agreement_id,
  transaction_type,
  hours,
  period_start,
  period_end,
  reference_id,
  created_by,
  created_at,
  note
)
SELECT
  te.agreement_id,
  'time_deduction',
  -te.hours,
  CASE
    WHEN a.period = 'monthly' THEN DATE_TRUNC('month', te.date)::DATE
    ELSE DATE_TRUNC('year', te.date)::DATE
  END AS period_start,
  CASE
    WHEN a.period = 'monthly' THEN (DATE_TRUNC('month', te.date) + INTERVAL '1 month - 1 day')::DATE
    ELSE (DATE_TRUNC('year', te.date) + INTERVAL '1 year - 1 day')::DATE
  END AS period_end,
  te.id,
  te.created_by,
  te.created_at,
  'backfill:time_entries'
FROM public.time_entries te
JOIN public.agreements a ON a.id = te.agreement_id
WHERE te.billing_type = 'timebank'
  AND a.type = 'timebank'
  AND NOT EXISTS (
    SELECT 1
    FROM public.timebank_ledger l
    WHERE l.reference_id = te.id
      AND l.transaction_type = 'time_deduction'
  );

-- Replace view to use ledger as source of truth
CREATE OR REPLACE VIEW public.timebank_current_status AS
WITH period_bounds AS (
  SELECT
    a.id AS agreement_id,
    a.customer_id,
    a.included_hours,
    a.period,
    CASE
      WHEN a.period = 'monthly' THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
      ELSE DATE_TRUNC('year', CURRENT_DATE)::DATE
    END AS period_start,
    CASE
      WHEN a.period = 'monthly' THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
      ELSE (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE
    END AS period_end
  FROM public.agreements a
  WHERE a.type = 'timebank'
)
SELECT
  p.agreement_id,
  p.customer_id,
  p.included_hours,
  p.period,
  COALESCE(SUM(CASE WHEN l.transaction_type IN ('time_deduction', 'manual_adjustment') THEN -l.hours ELSE 0 END), 0)
    AS hours_used_this_period,
  GREATEST(
    0,
    p.included_hours
    - COALESCE(SUM(CASE WHEN l.transaction_type IN ('time_deduction', 'manual_adjustment') THEN -l.hours ELSE 0 END), 0)
  ) AS hours_remaining
FROM period_bounds p
LEFT JOIN public.timebank_ledger l
  ON l.agreement_id = p.agreement_id
  AND l.period_start = p.period_start
  AND l.period_end = p.period_end
GROUP BY p.agreement_id, p.customer_id, p.included_hours, p.period;

ALTER VIEW public.timebank_current_status SET (security_invoker = true);

-- =============================================================================
-- ASSIGNMENT NUMBERING (SEQUENCE + TRIGGER)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.assignment_sequence (
  assignment_type TEXT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

-- Seed sequence from existing assignments
INSERT INTO public.assignment_sequence (assignment_type, last_number)
SELECT
  type,
  COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(assignment_number, '[^0-9]', '', 'g'), '')::INT),
    0
  ) AS last_number
FROM public.assignments
GROUP BY type
ON CONFLICT (assignment_type)
DO UPDATE SET last_number = EXCLUDED.last_number;

CREATE OR REPLACE FUNCTION public.generate_assignment_number()
RETURNS trigger AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INT;
BEGIN
  IF NEW.assignment_number IS NOT NULL AND NEW.assignment_number <> '' THEN
    RETURN NEW;
  END IF;

  v_prefix := CASE NEW.type
    WHEN 'case' THEN 'C'
    WHEN 'project' THEN 'P'
    ELSE 'U'
  END;

  INSERT INTO public.assignment_sequence (assignment_type, last_number)
  VALUES (NEW.type, 1)
  ON CONFLICT (assignment_type)
  DO UPDATE SET last_number = public.assignment_sequence.last_number + 1
  RETURNING last_number INTO v_next_number;

  NEW.assignment_number := v_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assignment_number') THEN
    CREATE TRIGGER trg_assignment_number
      BEFORE INSERT ON public.assignments
      FOR EACH ROW
      EXECUTE FUNCTION public.generate_assignment_number();
  END IF;
END $$;
