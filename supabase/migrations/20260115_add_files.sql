-- Add files table + storage bucket policies

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  assignment_id uuid references assignments(id) on delete cascade,
  journal_entry_id uuid references journal_entries(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.files enable row level security;

-- RLS policy for files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'files'
      AND policyname = 'authenticated_all'
  ) THEN
    CREATE POLICY "authenticated_all" ON public.files
      FOR ALL USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

-- Storage policies for files bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_files_select'
  ) THEN
    CREATE POLICY "authenticated_files_select" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_files_insert'
  ) THEN
    CREATE POLICY "authenticated_files_insert" ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_files_update'
  ) THEN
    CREATE POLICY "authenticated_files_update" ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'files' AND auth.role() = 'authenticated')
      WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated_files_delete'
  ) THEN
    CREATE POLICY "authenticated_files_delete" ON storage.objects
      FOR DELETE
      USING (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;
END $$;
