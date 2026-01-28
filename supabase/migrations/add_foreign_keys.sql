-- Grannfrid App - Foreign Key Migration
-- Kör detta i Supabase SQL Editor för att fixa relationer
-- Datum: 2025-01-15

-- ============================================================
-- 1. TASKS -> PROFILES (assigned_to)
-- ============================================================
-- Kontrollera först om foreign key redan finns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_assigned_to_fkey'
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 2. CUSTOMER_NOTES -> PROFILES (created_by)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_notes_created_by_fkey'
    AND table_name = 'customer_notes'
  ) THEN
    ALTER TABLE customer_notes
    ADD CONSTRAINT customer_notes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 3. ACTIVITY_LOG -> PROFILES (performed_by)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activity_log_performed_by_fkey'
    AND table_name = 'activity_log'
  ) THEN
    ALTER TABLE activity_log
    ADD CONSTRAINT activity_log_performed_by_fkey
    FOREIGN KEY (performed_by) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 4. JOURNAL_ENTRIES -> PROFILES (created_by)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_entries_created_by_fkey'
    AND table_name = 'journal_entries'
  ) THEN
    ALTER TABLE journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 5. KNOWLEDGE_ARTICLES -> PROFILES (created_by)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'knowledge_articles_created_by_fkey'
    AND table_name = 'knowledge_articles'
  ) THEN
    ALTER TABLE knowledge_articles
    ADD CONSTRAINT knowledge_articles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- Verifiera att alla foreign keys skapades
-- ============================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name;
