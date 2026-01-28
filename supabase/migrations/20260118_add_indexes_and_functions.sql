-- Migration: Add Performance Indexes and Dashboard Functions
-- Date: 2026-01-18
-- Purpose: Optimize query performance based on DATABASE_OPTIMIZATION_REPORT.md

-- =============================================================================
-- PHASE 1: Create Essential Indexes
-- =============================================================================

-- Time Entry Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_agreement_billing_date
  ON time_entries(agreement_id, billing_type, date DESC)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_time_entries_customer_export_billable
  ON time_entries(customer_id, is_exported, is_billable)
  WHERE is_billable = true;

CREATE INDEX IF NOT EXISTS idx_time_entries_date_export_billable
  ON time_entries(date DESC, is_exported, is_billable)
  WHERE is_billable = true;

CREATE INDEX IF NOT EXISTS idx_time_entries_agreement_id
  ON time_entries(agreement_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_customer_id
  ON time_entries(customer_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_is_exported
  ON time_entries(is_exported);

-- Agreement Indexes
CREATE INDEX IF NOT EXISTS idx_agreements_customer_status
  ON agreements(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_agreements_status_indexation
  ON agreements(status, next_indexation)
  WHERE next_indexation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agreements_status
  ON agreements(status);

-- Task Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_priority
  ON tasks(due_date DESC NULLS LAST, priority DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
  ON tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_customer_id
  ON tasks(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignment_id
  ON tasks(assignment_id)
  WHERE assignment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks(status);

-- Journal Entry Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_assignment_archived
  ON journal_entries(assignment_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at
  ON journal_entries(created_at DESC)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by
  ON journal_entries(created_by);

-- Assignment Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_customer_id
  ON assignments(customer_id);

CREATE INDEX IF NOT EXISTS idx_assignments_status
  ON assignments(status);

CREATE INDEX IF NOT EXISTS idx_assignments_customer_status
  ON assignments(customer_id, status);

-- Customer & Billing Indexes
CREATE INDEX IF NOT EXISTS idx_customers_status
  ON customers(status);

CREATE INDEX IF NOT EXISTS idx_billing_batches_period_year_month
  ON billing_batches(period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_billing_batches_status
  ON billing_batches(status);

-- =============================================================================
-- PHASE 2: Create Dashboard Aggregation Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  active_customers_count BIGINT,
  active_assignments_count BIGINT,
  pending_tasks_count BIGINT,
  upcoming_indexations_count BIGINT,
  hours_this_month_total NUMERIC,
  unbilled_hours_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT
      DATE_TRUNC('month', CURRENT_DATE)::DATE as month_start,
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE as month_end,
      CURRENT_DATE + INTERVAL '30 days' as indexation_cutoff
  )
  SELECT
    (SELECT COUNT(*) FROM customers WHERE status = 'active'),
    (SELECT COUNT(*) FROM assignments WHERE status IN ('active', 'pending')),
    (SELECT COUNT(*) FROM tasks WHERE status != 'done'),
    (SELECT COUNT(*) FROM agreements
     WHERE status = 'active'
       AND next_indexation IS NOT NULL
       AND next_indexation <= (SELECT indexation_cutoff FROM date_range)),
    (SELECT COALESCE(SUM(hours), 0)::NUMERIC FROM time_entries
     WHERE date >= (SELECT month_start FROM date_range)
       AND date <= (SELECT month_end FROM date_range)),
    (SELECT COALESCE(SUM(hours), 0)::NUMERIC FROM time_entries
     WHERE is_exported = false AND is_billable = true)
  FROM date_range
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO service_role;

-- =============================================================================
-- PHASE 3: Create Timebank Status Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_timebank_status(p_agreement_id UUID)
RETURNS TABLE (
  included_hours NUMERIC,
  hours_used NUMERIC,
  hours_remaining NUMERIC,
  overtime_hours NUMERIC,
  percent_used NUMERIC,
  is_overtime BOOLEAN,
  period_type TEXT,
  period_start DATE
) AS $$
DECLARE
  v_agreement_type TEXT;
  v_period TEXT;
  v_included_hours NUMERIC;
  v_hours_used NUMERIC;
  v_period_start DATE;
BEGIN
  SELECT type, period, agreements.included_hours INTO v_agreement_type, v_period, v_included_hours
  FROM agreements
  WHERE id = p_agreement_id;

  IF v_agreement_type != 'timebank' OR v_included_hours IS NULL THEN
    RETURN;
  END IF;

  IF v_period = 'monthly' THEN
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  ELSE
    v_period_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;
  END IF;

  SELECT COALESCE(SUM(te.hours), 0) INTO v_hours_used
  FROM time_entries te
  WHERE te.agreement_id = p_agreement_id
    AND te.billing_type = 'timebank'
    AND te.date >= v_period_start;

  RETURN QUERY
  SELECT
    v_included_hours,
    v_hours_used,
    GREATEST(0, v_included_hours - v_hours_used),
    GREATEST(0, v_hours_used - v_included_hours),
    LEAST(100, (v_hours_used / NULLIF(v_included_hours, 0) * 100)::NUMERIC),
    v_hours_used > v_included_hours,
    v_period,
    v_period_start;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_timebank_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_timebank_status(UUID) TO service_role;

-- =============================================================================
-- PHASE 4: Create Recent Activity Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id TEXT,
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  performer_name TEXT,
  performed_at TIMESTAMPTZ,
  title TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH activities AS (
    SELECT
      'journal-' || j.id as activity_id,
      'journal_entry' as entity_type,
      j.id as entity_id,
      'created' as action,
      j.created_by as performer_id,
      j.created_at as performed_at,
      COALESCE(a.title, 'Journalanteckning') as title,
      NULL::TEXT as description
    FROM journal_entries j
    LEFT JOIN assignments a ON j.assignment_id = a.id
    WHERE j.is_archived = false

    UNION ALL

    SELECT
      'task-' || t.id,
      'task',
      t.id,
      CASE WHEN t.status = 'done' THEN 'completed' ELSE 'created' END,
      t.created_by,
      CASE WHEN t.status = 'done' AND t.completed_at IS NOT NULL
        THEN t.completed_at ELSE t.created_at END,
      t.title,
      NULL
    FROM tasks t

    UNION ALL

    SELECT
      'time-' || te.id,
      'time_entry',
      te.id,
      'created',
      te.created_by,
      te.created_at,
      te.hours::TEXT || 'h - ' || c.name,
      NULL
    FROM time_entries te
    LEFT JOIN customers c ON te.customer_id = c.id
  )
  SELECT
    activities.activity_id,
    activities.entity_type,
    activities.entity_id,
    activities.action,
    COALESCE(p.name, 'Okänd användare') as performer_name,
    activities.performed_at,
    activities.title,
    activities.description
  FROM activities
  LEFT JOIN profiles p ON activities.performer_id = p.id
  ORDER BY performed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_recent_activity(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity(INTEGER) TO service_role;

-- =============================================================================
-- Verify
-- =============================================================================

-- Test functions (will fail gracefully if tables have no data)
-- SELECT * FROM get_dashboard_stats();
-- SELECT * FROM get_recent_activity(5);
