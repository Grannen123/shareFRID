# Kända Problem - Grannfrid App

## Aktiva Problem

### Hög Prioritet

#### 1. Supabase-anslutning kan vara långsam

- **Beskrivning:** Ibland tar det upp till 10s innan data visas
- **Plats:** Alla hooks som använder `withTimeout()`
- **Symptom:** Laddningsspinner visas länge, sedan antingen data eller error
- **Möjlig orsak:** Nätverkslatens, Supabase-serverns svarstid, free tier cold starts
- **Workaround:** Vänta på timeout, ErrorState visas med retry-knapp
- **Status:** Timeout implementerad, fungerar som förväntat

#### 2. .env ligger i git-historik (credential-risk)

- **Beskrivning:** `.env` har varit versionerad tidigare och innehaller Supabase-credentials
- **Plats:** Git-historik (commit 12e34acf...)
- **Symptom:** Nycklar kan exponeras om repo delas
- **Möjlig orsak:** Saknad `.gitignore` vid start
- **Workaround:** Rotera Supabase-nycklar + rensa historik (filter-repo/BFG) och `git rm --cached .env`
- **Status:** `.gitignore` tillagd, historik kvar

---

### Medium Prioritet

#### 3. HMR invaliderar AuthContext

- **Beskrivning:** Vid hot module reload visas varning om inkompatibel "useAuth" export
- **Plats:** `src/contexts/AuthContext.tsx`
- **Symptom:** Konsollvarning, sidan laddas om helt istället för HMR
- **Möjlig orsak:** Context + hook i samma fil bryter Fast Refresh-regler
- **Workaround:** Ignorera varningen, fungerar efter full reload
- **Status:** Kosmetiskt problem, påverkar inte produktion

### Låg Prioritet

#### 4. React Router Future Flag Warnings

- **Beskrivning:** Varningar om v7_startTransition och v7_relativeSplatPath
- **Plats:** Konsollen vid sidladdning
- **Symptom:** Två varningar vid varje navigation
- **Möjlig orsak:** React Router v6 förbereder för v7
- **Workaround:** Lägg till future flags i BrowserRouter
- **Status:** Kosmetiskt, påverkar inte funktionalitet

---

## Lösta Problem

### 2026-01-17

#### Dashboard "Senaste aktivitet" visar ingen aktivitet

- **Beskrivning:** ActivityFeed visade "Ingen aktivitet registrerad ännu" trots att aktivitet fanns
- **Plats:** `src/hooks/useDashboard.ts`, `src/features/dashboard/ActivityFeed.tsx`
- **Orsak:** `useRecentActivity()` läste från `activity_log`-tabellen som saknar automatiska triggers
- **Lösning:** Ändrade hook till att hämta direkt från `journal_entries`, `tasks` och `time_entries`
- **Verifierad:** 2026-01-17
- **Commit:** (pending)

#### Dashboard "Mina uppgifter" visar inga uppgifter

- **Beskrivning:** MyTasksWidget visade "Du har inga öppna uppgifter" trots att uppgifter fanns
- **Plats:** `src/hooks/useTasks.ts`, `src/features/dashboard/MyTasksWidget.tsx`
- **Orsak:** `useMyTasks()` filtrerade endast på `assigned_to = user.id`, visade inte otilldelade uppgifter
- **Lösning:** Ändrade filter till `.or(\`assigned_to.eq.${user.id},assigned_to.is.null\`)`
- **Verifierad:** 2026-01-17
- **Commit:** (pending)

### 2026-01-15

#### Filer kräver DB-migration + storage policies

- **Beskrivning:** Filflikar krävde `files`-tabell och storage bucket/policies
- **Plats:** `src/features/files/FilesTab.tsx`, `src/hooks/useFiles.ts`
- **Symptom:** Fel vid uppladdning/nedladdning
- **Lösning:** `supabase/migrations/20260115_add_files.sql` körd + `NOTIFY pgrst, 'reload schema'`
- **Verifierad:** 2026-01-15
- **Commit:** (pending)

#### CustomerDetail placeholder för "Senaste aktivitet"

- **Beskrivning:** Fliken visade placeholder-text
- **Plats:** `src/features/customers/CustomerDetail.tsx`
- **Symptom:** "Senaste aktivitet kommer i Fas 4..."
- **Lösning:** Ersatt med `CustomerTimeline`
- **Verifierad:** 2026-01-15
- **Commit:** (pending)

#### withTimeout kunde missa timeout

- **Beskrivning:** Requests kunde hänga om `abortSignal()` returnerade en ny builder som inte användes
- **Plats:** `src/lib/supabase.ts`
- **Symptom:** Laddningsspinner visades oändligt utan ErrorState
- **Orsak:** `abortSignal()` return value ignorerades, ingen `Promise.race`-timeout
- **Lösning:** Använder returnerad builder + `Promise.race` med explicit timeout
- **Verifierad:** 2026-01-15
- **Commit:** (pending)

#### Uppgiftsflikar saknade felhantering och stale data

- **Beskrivning:** Task-flikar kunde visa gamla data efter mutationer och saknade ErrorState vid fel
- **Plats:** `src/features/customers/CustomerTasksTab.tsx`, `src/features/assignments/AssignmentTasksTab.tsx`, `src/hooks/useTasks.ts`
- **Symptom:** Uppgifter uppdaterades inte i kund/uppdrag-vyer, fel gav tyst failure
- **Orsak:** Invalidering täckte inte alla task-queries, ingen ErrorState i tabbarna
- **Lösning:** `invalidateQueries` med `exact: false` på `tasks` + ErrorState i tabbarna
- **Verifierad:** 2026-01-15
- **Commit:** (pending)

#### Stale auth-state efter timeout/ingen session

- **Beskrivning:** `user` kunde ligga kvar efter HMR eller misslyckad session
- **Plats:** `src/contexts/AuthContext.tsx`
- **Symptom:** Skyddade vyer visades trots timeout eller saknad session
- **Orsak:** State rensades inte när `getSession()` gav `null`
- **Lösning:** Rensar `user/session/profile` när ingen session hittas eller timeout uppstår
- **Verifierad:** 2026-01-15
- **Commit:** (pending)

#### Avatar visar "U" trots inloggad användare

- **Beskrivning:** Initialer föll tillbaka till "U" när profil saknades eller timeoutade
- **Plats:** `src/components/layout/Header.tsx`
- **Symptom:** Avatar-fallback visade fel initial
- **Orsak:** Fallback använde endast `profile.name`
- **Lösning:** Fallback använder profilnamn → user metadata → e-postprefix
- **Verifierad:** 2026-01-15
- **Commit:** (pending)

### 2025-01-15

#### Multiple GoTrueClient instances

- **Beskrivning:** Varning om flera Supabase auth-instanser
- **Lösning:** Implementerade singleton-pattern i `supabase.ts`
- **Commit:** (pending)

#### React Query hänger oändligt

- **Beskrivning:** isLoading förblev true när Supabase inte svarade
- **Lösning:** `withTimeout()` wrapper på alla Supabase-queries
- **Commit:** (pending)

#### Auth initialization blockerar appen

- **Beskrivning:** Om getSession() hängde, laddade aldrig appen
- **Lösning:** 5s timeout i AuthContext som fortsätter utan session
- **Commit:** (pending)

#### Dropdown-meny i Header öppnas inte

- **Beskrivning:** Avatar-knappen i header borde öppna en dropdown med profil/inställningar/logout
- **Symptom:** Klick på avatar gjorde ingenting synligt
- **Lösning:** Fungerade efter full page reload (HMR-relaterat problem)
- **Verifierad:** 2025-01-15 - Dropdown öppnas och visar profil/inställningar/logout
- **Commit:** (pending)

#### Supabase schema-relationer saknas

- **Beskrivning:** Fel "Could not find a relationship between X and Y" vid queries med joins
- **Drabbade tabeller:** tasks, customer_notes, activity_log, journal_entries, knowledge_articles
- **Orsak:** Foreign keys saknades för kolumner som refererade till `profiles`
- **Lösning 1:** SQL-migration `supabase/migrations/add_foreign_keys.sql` skapades och kördes i Supabase Dashboard
- **Foreign keys skapade:**
  - `tasks_assigned_to_fkey` → profiles(id)
  - `customer_notes_created_by_fkey` → profiles(id)
  - `activity_log_performed_by_fkey` → profiles(id)
  - `journal_entries_created_by_fkey` → profiles(id)
  - `knowledge_articles_created_by_fkey` → profiles(id)
- **Lösning 2:** PostgREST schema cache uppdaterades med `NOTIFY pgrst, 'reload schema';`
- **Lösning 3:** Borttagen explicit FK-syntax (`profiles!table_fkey`) från alla hooks
  - `useTasks.ts` - hämtar assignee separat via Promise.all
  - `useDashboard.ts` - borttagen performer-join
  - `useCustomerNotes.ts` - borttagen author-join
  - `useJournal.ts` - hämtar author separat i en batch-query via `profiles.in('id', ...)`
  - `useNotes.ts` - borttagen author-join
  - `useKnowledge.ts` - borttagen author-join i båda funktionerna
- **Verifierad:** 2026-01-15 - Alla sidor fungerar utan schema-fel
- **Commit:** (pending)

#### Switch "uncontrolled to controlled" varning

- **Beskrivning:** Varning i konsollen om att Switch-komponenter ändras från uncontrolled till controlled
- **Plats:** `src/features/profile/ProfileForm.tsx`
- **Orsak:** Boolean-fält (notifications_enabled, email_notifications) hade undefined som initial value
- **Lösning:** Explicit `defaultValues` med `false` för boolean-fälten i useForm
- **Verifierad:** 2025-01-15
- **Commit:** (pending)

#### Supabase RLS/view-varningar

- **Beskrivning:** Supabase flaggade för RLS avstängt på `workspaces` och SECURITY DEFINER-view för `timebank_current_status`
- **Plats:** Supabase Security Advisor
- **Orsak:** RLS ej aktiverat + view körde som definer istället för invoker
- **Lösning:** SQL-migration `supabase/migrations/20250115_fix_rls_and_view.sql` kördes i Supabase Dashboard
- **Åtgärder:**
  - `ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;`
  - Policy `workspaces_select_authenticated` skapad för authenticated users
  - `ALTER VIEW public.timebank_current_status SET (security_invoker = true);`
- **Verifierad:** 2025-01-15 - Migration kördes med "Success. No rows returned"
- **Commit:** (pending)
