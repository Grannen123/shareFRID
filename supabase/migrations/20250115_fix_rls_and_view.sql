-- Fix RLS warning for public.workspaces and make timebank_current_status view use invoker rights

-- Ensure RLS is enabled on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read workspaces (needed for customer creation flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspaces'
      AND policyname = 'workspaces_select_authenticated'
  ) THEN
    CREATE POLICY "workspaces_select_authenticated"
      ON public.workspaces
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END$$;

-- Ensure the view respects the caller's RLS policies
ALTER VIEW public.timebank_current_status SET (security_invoker = true);
