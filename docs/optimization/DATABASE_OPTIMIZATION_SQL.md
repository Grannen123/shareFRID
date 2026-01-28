# Grannfrid Database Optimization - SQL Implementation Guide

**Purpose:** Ready-to-run SQL scripts for implementing database optimizations identified in DATABASE_OPTIMIZATION_REPORT.md

---

## Phase 1: Create Essential Indexes

**Execution Time:** ~1-2 minutes
**Impact:** 80-95% latency improvement on filtered queries
**Risk:** MINIMAL - indexes don't modify data

### Script 1.1: Time Entry Indexes

```sql
-- Create composite indexes for common time entry queries
-- These handle filtering on agreement_id + billing_type + date simultaneously

CREATE INDEX CONCURRENTLY idx_time_entries_agreement_billing_date
  ON time_entries(agreement_id, billing_type, date DESC)
  WHERE is_archived = false;

-- For billing queries filtering on customer + export status
CREATE INDEX CONCURRENTLY idx_time_entries_customer_export_billable
  ON time_entries(customer_id, is_exported, is_billable)
  WHERE is_billable = true;

-- For date range queries with export filter
CREATE INDEX CONCURRENTLY idx_time_entries_date_export_billable
  ON time_entries(date DESC, is_exported, is_billable)
  WHERE is_billable = true;

-- Single column indexes for flexibility
CREATE INDEX CONCURRENTLY idx_time_entries_agreement_id
  ON time_entries(agreement_id);

CREATE INDEX CONCURRENTLY idx_time_entries_customer_id
  ON time_entries(customer_id);

CREATE INDEX CONCURRENTLY idx_time_entries_is_exported
  ON time_entries(is_exported);
```

### Script 1.2: Agreement Indexes

```sql
-- For filtering by customer and status (common in list views)
CREATE INDEX CONCURRENTLY idx_agreements_customer_status
  ON agreements(customer_id, status);

-- For indexation alerts (status + date filter)
CREATE INDEX CONCURRENTLY idx_agreements_status_indexation
  ON agreements(status, next_indexation)
  WHERE next_indexation IS NOT NULL;

-- Single column for flexibility
CREATE INDEX CONCURRENTLY idx_agreements_status
  ON agreements(status);
```

### Script 1.3: Task Indexes

```sql
-- For task list sorting and filtering
CREATE INDEX CONCURRENTLY idx_tasks_due_date_priority
  ON tasks(due_date DESC NULLS LAST, priority DESC);

-- For assignee view (my tasks)
CREATE INDEX CONCURRENTLY idx_tasks_assigned_to
  ON tasks(assigned_to);

-- For customer task list
CREATE INDEX CONCURRENTLY idx_tasks_customer_id
  ON tasks(customer_id)
  WHERE customer_id IS NOT NULL;

-- For assignment task list
CREATE INDEX CONCURRENTLY idx_tasks_assignment_id
  ON tasks(assignment_id)
  WHERE assignment_id IS NOT NULL;

-- For status filtering
CREATE INDEX CONCURRENTLY idx_tasks_status
  ON tasks(status);
```

### Script 1.4: Journal Entry Indexes

```sql
-- For journal entry list (most common query)
CREATE INDEX CONCURRENTLY idx_journal_entries_assignment_archived
  ON journal_entries(assignment_id, is_archived);

-- For activity feed (recent entries)
CREATE INDEX CONCURRENTLY idx_journal_entries_created_at
  ON journal_entries(created_at DESC)
  WHERE is_archived = false;

-- For author filtering in activity feed
CREATE INDEX CONCURRENTLY idx_journal_entries_created_by
  ON journal_entries(created_by);
```

### Script 1.5: Assignment Indexes

```sql
-- For customer assignment list
CREATE INDEX CONCURRENTLY idx_assignments_customer_id
  ON assignments(customer_id);

-- For active assignment queries
CREATE INDEX CONCURRENTLY idx_assignments_status
  ON assignments(status);

-- Combined for dashboard queries
CREATE INDEX CONCURRENTLY idx_assignments_customer_status
  ON assignments(customer_id, status);
```

### Script 1.6: Customer & Billing Indexes

```sql
-- For customer status filtering
CREATE INDEX CONCURRENTLY idx_customers_status
  ON customers(status);

-- For billing batch period queries
CREATE INDEX CONCURRENTLY idx_billing_batches_period_year_month
  ON billing_batches(period_year, period_month);

-- For billing batch status
CREATE INDEX CONCURRENTLY idx_billing_batches_status
  ON billing_batches(status);
```

### Verify Indexes Created

```sql
-- Check that all indexes were created successfully
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('time_entries', 'agreements', 'tasks', 'journal_entries', 'assignments', 'customers', 'billing_batches')
ORDER BY tablename, indexname;

-- Count total indexes
SELECT COUNT(*) as total_indexes FROM pg_indexes WHERE schemaname = 'public';
```

---

## Phase 2: Create Dashboard Aggregation Function

**Execution Time:** ~5 minutes
**Impact:** 80-90% latency improvement on dashboard load, eliminates 6 N+1 queries
**Risk:** MINIMAL - read-only function

### Script 2.1: Dashboard Stats RPC

```sql
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
      CURRENT_DATE + INTERVAL '30 days' as indexation_cutoff,
      CURRENT_DATE + INTERVAL '7 days' as indexation_alert_cutoff
  )
  SELECT
    -- Active customers count
    (SELECT COUNT(*) FROM customers WHERE status = 'active'),

    -- Active assignments count
    (SELECT COUNT(*) FROM assignments
     WHERE status IN ('active', 'pending')),

    -- Pending tasks count
    (SELECT COUNT(*) FROM tasks
     WHERE status != 'done'),

    -- Upcoming indexations (within 30 days)
    (SELECT COUNT(*) FROM agreements
     WHERE status = 'active'
       AND next_indexation IS NOT NULL
       AND next_indexation <= (SELECT indexation_cutoff FROM date_range)),

    -- Hours this month (SUM instead of fetching all rows)
    (SELECT COALESCE(SUM(hours), 0)::NUMERIC FROM time_entries
     WHERE date >= (SELECT month_start FROM date_range)
       AND date <= (SELECT month_end FROM date_range)),

    -- Unbilled hours (SUM instead of fetching all rows)
    (SELECT COALESCE(SUM(hours), 0)::NUMERIC FROM time_entries
     WHERE is_exported = false
       AND is_billable = true)
  FROM date_range
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO service_role;
```

### Script 2.2: Billing Summary Aggregation Function

**Purpose:** Replace the N+1 pattern in useBilling.ts `useBillingSummary()`

```sql
CREATE OR REPLACE FUNCTION get_billing_summary(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_number TEXT,
  total_hours NUMERIC,
  timebank_hours NUMERIC,
  overtime_hours NUMERIC,
  hourly_hours NUMERIC,
  total_amount NUMERIC,
  entry_count INTEGER
) AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01');
  end_date := (start_date + INTERVAL '1 month - 1 day')::DATE;

  RETURN QUERY
  SELECT
    te.customer_id,
    c.name,
    c.customer_number,
    SUM(te.hours)::NUMERIC,
    SUM(CASE WHEN te.billing_type = 'timebank' THEN te.hours ELSE 0 END)::NUMERIC,
    SUM(CASE WHEN te.billing_type = 'overtime' THEN te.hours ELSE 0 END)::NUMERIC,
    SUM(CASE WHEN te.billing_type = 'hourly' THEN te.hours ELSE 0 END)::NUMERIC,
    SUM(te.hours * te.hourly_rate)::NUMERIC,
    COUNT(*)::INTEGER
  FROM time_entries te
  JOIN customers c ON te.customer_id = c.id
  WHERE te.is_billable = true
    AND te.is_exported = false
    AND te.date >= start_date
    AND te.date <= end_date
  GROUP BY te.customer_id, c.name, c.customer_number
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_billing_summary(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_billing_summary(INTEGER, INTEGER) TO service_role;
```

### Script 2.3: Timebank Status Calculation Function

**Purpose:** Replace manual aggregation in useTimebank.ts

```sql
CREATE OR REPLACE FUNCTION get_timebank_status(
  p_agreement_id UUID
)
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
  -- Fetch agreement details
  SELECT type, period, included_hours INTO v_agreement_type, v_period, v_included_hours
  FROM agreements
  WHERE id = p_agreement_id;

  IF v_agreement_type != 'timebank' OR v_included_hours IS NULL THEN
    RETURN;
  END IF;

  -- Calculate period start
  IF v_period = 'monthly' THEN
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  ELSE
    v_period_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;
  END IF;

  -- Calculate hours used this period
  SELECT COALESCE(SUM(hours), 0) INTO v_hours_used
  FROM time_entries
  WHERE agreement_id = p_agreement_id
    AND billing_type = 'timebank'
    AND date >= v_period_start;

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
```

### Script 2.4: Activity Feed Function

**Purpose:** Replace parallel queries + client-side mapping in useRecentActivity()

```sql
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
    -- Journal entries
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

    -- Tasks
    SELECT
      'task-' || t.id,
      'task',
      t.id,
      CASE WHEN t.status = 'done' THEN 'completed' ELSE 'created' END,
      CASE WHEN t.status = 'done' THEN t.id::UUID ELSE t.created_by END,
      CASE WHEN t.status = 'done' AND t.completed_at IS NOT NULL
        THEN t.completed_at ELSE t.created_at END,
      t.title,
      NULL
    FROM tasks t

    UNION ALL

    -- Time entries
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
```

### Script 2.5: Verify Functions Created

```sql
-- List all created functions
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_dashboard_stats',
    'get_billing_summary',
    'get_timebank_status',
    'get_recent_activity'
  )
ORDER BY p.proname;

-- Test dashboard function (should return 1 row)
SELECT * FROM get_dashboard_stats();

-- Test billing function (should return results)
SELECT * FROM get_billing_summary(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);

-- Test activity function (should return recent activities)
SELECT * FROM get_recent_activity(10);
```

---

## Phase 3: Create Materialized Views for Reporting

**Execution Time:** ~5 minutes
**Impact:** 50-70% improvement on complex reporting queries
**Risk:** LOW - read-only views

### Script 3.1: Billing Summary View

```sql
-- Materialized view for faster billing analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_billing_summary_current_month AS
WITH date_range AS (
  SELECT
    DATE_TRUNC('month', CURRENT_DATE)::DATE as month_start,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE as month_end
)
SELECT
  te.customer_id,
  c.customer_number,
  c.name as customer_name,
  SUM(te.hours)::NUMERIC as total_hours,
  SUM(CASE WHEN te.billing_type = 'timebank' THEN te.hours ELSE 0 END)::NUMERIC as timebank_hours,
  SUM(CASE WHEN te.billing_type = 'overtime' THEN te.hours ELSE 0 END)::NUMERIC as overtime_hours,
  SUM(te.hours * te.hourly_rate)::NUMERIC as total_amount,
  COUNT(DISTINCT te.date)::INTEGER as work_days,
  MAX(te.date)::DATE as latest_entry_date,
  MIN(te.date)::DATE as earliest_entry_date
FROM time_entries te
JOIN customers c ON te.customer_id = c.id
JOIN date_range dr ON te.date >= dr.month_start AND te.date <= dr.month_end
WHERE te.is_billable = true
  AND te.is_exported = false
GROUP BY te.customer_id, c.customer_number, c.name;

-- Create index on materialized view for faster lookups
CREATE INDEX idx_mv_billing_summary_customer_id
  ON mv_billing_summary_current_month(customer_id);

-- Schedule refresh (daily, off-peak hours)
-- This would typically be done via pg_cron extension
-- SELECT cron.schedule('refresh_billing_summary', '0 2 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_billing_summary_current_month');

GRANT SELECT ON mv_billing_summary_current_month TO authenticated;
```

### Script 3.2: Unbilled Hours Summary View

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_unbilled_hours_summary AS
SELECT
  customer_id,
  c.customer_number,
  c.name as customer_name,
  SUM(hours)::NUMERIC as total_hours,
  SUM(hours * hourly_rate)::NUMERIC as total_amount,
  COUNT(*)::INTEGER as entry_count,
  MAX(date)::DATE as latest_entry_date,
  MIN(date)::DATE as earliest_entry_date
FROM time_entries
JOIN customers c ON customer_id = c.id
WHERE is_exported = false
  AND is_billable = true
GROUP BY customer_id, c.customer_number, c.name;

CREATE INDEX idx_mv_unbilled_hours_customer_id
  ON mv_unbilled_hours_summary(customer_id);

GRANT SELECT ON mv_unbilled_hours_summary TO authenticated;
```

### Script 3.3: Timebank Status View

```sql
-- Track current timebank status for all agreements
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timebank_current_status AS
WITH period_data AS (
  SELECT
    a.id as agreement_id,
    a.customer_id,
    a.included_hours,
    CASE
      WHEN a.period = 'monthly'
      THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
      ELSE DATE_TRUNC('year', CURRENT_DATE)::DATE
    END as period_start,
    CASE
      WHEN a.period = 'monthly'
      THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
      ELSE (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE
    END as period_end
  FROM agreements a
  WHERE a.type = 'timebank'
    AND a.status = 'active'
)
SELECT
  p.agreement_id,
  p.customer_id,
  c.customer_number,
  c.name as customer_name,
  p.included_hours,
  COALESCE(SUM(te.hours), 0)::NUMERIC as hours_used,
  GREATEST(0, p.included_hours - COALESCE(SUM(te.hours), 0))::NUMERIC as hours_remaining,
  GREATEST(0, COALESCE(SUM(te.hours), 0) - p.included_hours)::NUMERIC as overtime_hours,
  LEAST(100, (COALESCE(SUM(te.hours), 0)::NUMERIC / NULLIF(p.included_hours, 0) * 100))::NUMERIC as percent_used,
  COALESCE(SUM(te.hours), 0) > p.included_hours as is_overtime
FROM period_data p
JOIN customers c ON p.customer_id = c.id
LEFT JOIN time_entries te ON (
  te.agreement_id = p.agreement_id
  AND te.billing_type = 'timebank'
  AND te.date >= p.period_start
  AND te.date <= p.period_end
)
GROUP BY p.agreement_id, p.customer_id, c.customer_number, c.name, p.included_hours;

CREATE INDEX idx_mv_timebank_agreement_id
  ON mv_timebank_current_status(agreement_id);

CREATE INDEX idx_mv_timebank_customer_id
  ON mv_timebank_current_status(customer_id);

GRANT SELECT ON mv_timebank_current_status TO authenticated;
```

---

## Phase 4: Query Performance Analysis Scripts

### Script 4.1: Identify Slow Queries

```sql
-- Enable query logging if not already enabled
-- In Supabase dashboard: Project Settings > Database > Query Performance

-- Find queries taking over 1 second
SELECT
  query,
  calls,
  total_time,
  max_time,
  mean_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND mean_time > 1000  -- Over 1 second
ORDER BY total_time DESC
LIMIT 20;

-- Find most frequently called queries
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 20;
```

### Script 4.2: Index Usage Analysis

```sql
-- Find unused indexes (candidates for deletion)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
ORDER BY indexname;

-- Find indexes with poor selectivity
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  CASE
    WHEN idx_tup_read = 0 THEN 0
    ELSE (idx_tup_fetch::FLOAT / idx_tup_read) * 100
  END as selectivity_percent
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY selectivity_percent DESC;
```

### Script 4.3: Table Size Analysis

```sql
-- Find largest tables (candidates for partitioning)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Time entries specific (likely to grow largest)
SELECT
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('public.time_entries')) as total_size
FROM time_entries;
```

---

## Maintenance & Monitoring Scripts

### Script M.1: Index Maintenance

```sql
-- Rebuild fragmented indexes (run periodically)
REINDEX TABLE CONCURRENTLY time_entries;
REINDEX TABLE CONCURRENTLY agreements;
REINDEX TABLE CONCURRENTLY tasks;
REINDEX TABLE CONCURRENTLY journal_entries;

-- Analyze table statistics (run after large data loads)
ANALYZE time_entries;
ANALYZE agreements;
ANALYZE tasks;
ANALYZE customers;
```

### Script M.2: Vacuum Dead Rows

```sql
-- Clean up dead rows (run nightly)
-- Full vacuum locks table, so use VACUUM ANALYZE instead
VACUUM ANALYZE time_entries;
VACUUM ANALYZE journal_entries;
VACUUM ANALYZE time_entries;
```

### Script M.3: Monitor Index Health

```sql
-- Check if any indexes need maintenance
SELECT
  schemaname,
  tablename,
  indexname,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_tup_read = 0 THEN 'NO_LOOKUPS'
    ELSE 'ACTIVE'
  END as status,
  idx_scan as scans_count,
  pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY status, indexname;
```

---

## Deployment Checklist

- [ ] Back up database before running any scripts
- [ ] Test scripts in staging environment first
- [ ] Run Phase 1 (indexes) during low-traffic period
- [ ] Run Phase 2 (functions) after Phase 1 testing
- [ ] Create Phase 3 (views) - can refresh during low traffic
- [ ] Update React Query hooks to use new RPC functions
- [ ] Test with production data volumes
- [ ] Monitor query performance post-deployment
- [ ] Schedule weekly maintenance scripts
- [ ] Document all custom functions in CLAUDE.md

---

## Rollback Procedures

### If indexes cause problems:

```sql
-- Drop specific index
DROP INDEX CONCURRENTLY idx_time_entries_agreement_billing_date;

-- Or drop all custom indexes
DROP INDEX CONCURRENTLY idx_time_entries_agreement_id;
DROP INDEX CONCURRENTLY idx_time_entries_customer_id;
DROP INDEX CONCURRENTLY idx_time_entries_is_exported;
-- ... etc
```

### If functions cause problems:

```sql
-- Drop specific function
DROP FUNCTION IF EXISTS get_dashboard_stats();

-- Or drop all custom functions
DROP FUNCTION IF EXISTS get_dashboard_stats();
DROP FUNCTION IF EXISTS get_billing_summary(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_timebank_status(UUID);
DROP FUNCTION IF EXISTS get_recent_activity(INTEGER);
```

---

**Last Updated:** 2026-01-18
**Status:** Ready for Implementation
**Next Review:** After Phase 1 deployment (measure improvement)
