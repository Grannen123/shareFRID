# Setup – Grannfrid App

## Förutsättningar

- Node.js 18+
- Supabase‑projekt

## 1) Miljövariabler

Skapa `.env` i projektroten:

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## 2) Kör databasmigrationer

Alla SQL‑migreringar ligger i `supabase/migrations/`.

Kör dem i Supabase SQL Editor i ordning (filnamn):

- `20250115_fix_rls_and_view.sql`
- `20260115_add_quick_notes.sql`
- `20260115_add_files.sql`
- `add_foreign_keys.sql` (om ej redan körd)

Efter schema‑ändringar:

```sql
NOTIFY pgrst, 'reload schema';
```

## 3) Starta appen

```bash
npm install
npm run dev
```

## 4) Test

E2E smoke‑test:

```bash
npm run test:e2e
```

## Noteringar

- `files` kräver Supabase Storage bucket `files` + policies (ingår i migration).
- Timeout‑hantering är obligatorisk för alla Supabase‑queries (`withTimeout`).
