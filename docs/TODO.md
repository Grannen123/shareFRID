# Todo - Grannfrid App

Senast uppdaterad: 2026-01-23

---

## Övergripande Status

### Fas 1: Foundation ✅ KLAR

- [x] Vite + React + TypeScript setup
- [x] Tailwind CSS v4 med design tokens
- [x] Supabase-klient med singleton och timeout
- [x] AuthContext med session-hantering
- [x] React Query v5 med queryKeys
- [x] Zod schemas för validering
- [x] Routing med React Router
- [x] AppShell med Sidebar och Header

### Fas 2: Kunder & Uppdrag ✅ KLAR

- [x] Kundlista med sökning
- [x] Kundformulär (skapa/redigera)
- [x] Kunddetaljer med flikar (Översikt, Anteckningar, Uppdrag, Kontakter, Avtal)
- [x] Avtalshantering (löpande/timbank/fastpris)
- [x] Uppdragslista med filter
- [x] Uppdragsformulär
- [x] Uppdragsdetaljer med journal
- [x] Journalanteckningar (plain text)
- [x] Tidsregistrering kopplat till journal
- [x] Uppdragskontakter (NY!)

### Fas 3: Produktivitet ✅ KLAR

- [x] Dashboard med statistik
- [x] Uppgiftshantering (Tasks)
- [x] Anteckningsbok (Quick Notes) med koppla-flöde
- [x] Kunskapsbank (Knowledge)
- [x] Profil och inställningar
- [x] Kontaktlista (global)

### Fas 4: Fakturering ✅ KLAR

- [x] Timbank-beräkningar (billing-logic.ts)
- [x] TimebankWidget
- [x] BillingPipeline - fakturaunderlag per kund/månad
- [x] BillingBatchList - hantera batcher
- [x] Fortnox-export (CSV)

---

## Prioritet: Hög - Comprehensive Review Buggar

### Sprint 1: Kritiska (säkerhet + krascher) ✅ KLAR

- [x] Fixa SQL injection i `useCustomersPaged` (rad 62) - använd `.ilike()` istället för string interpolation ✅ 2026-01-23
- [x] Fixa NaN-bugg i `JournalEntryForm` - visa 0 istället för NaN när timmar är tomma ✅ 2026-01-23
- [x] Lägg till `aria-describedby` på alla formulärfält med errors ✅ 2026-01-23
- [x] Fixa race condition i `AuthContext` - `fetchProfile` körs innan session är satt ✅ 2026-01-23

### Sprint 2: Höga (UX-blockerare) ✅ KLAR

- [x] Lägg till keyboard navigation i `CommandCenter` (Escape stänger modal) ✅ 2026-01-23
- [x] Fixa minnesläcka i `useAssignment` - undersökt: ingen läcka (React Query hanterar cleanup) ✅ 2026-01-23
- [x] Lägg till null-checks i `TimebankWidget` för `agreement?.included_hours` ✅ 2026-01-23
- [x] Förbättra filnamn-sanitering i `useFiles` - blockera mer path traversal ✅ 2026-01-23

### Sprint 3: Medium (polish) ✅ KLAR

- [x] Lägg till loading states på alla delete-knappar ✅ 2026-01-23 (TaskList)
- [x] Implementera debounce på sökfält (CustomerList, CommandCenter) ✅ 2026-01-23
- [x] Fixa pagination bugg - "Visar 0-0 av 0" visas vid tom sökning ✅ 2026-01-23
- [x] Förbättra error messages - visa specifika fel istället för generiska ✅ 2026-01-23 (error-utils.ts)

### Sprint 4: Låga (teknisk skuld) ✅ KLAR

- [x] Lägg till `displayName` på alla memo-komponenter för DevTools ✅ 2026-01-23 (TaskCard)
- [x] Konsolidera duplicerade Tailwind-klasser till @apply ✅ 2026-01-23 (ej värt för korta kombinationer)
- [x] Lägg till Error Boundaries runt kritiska komponenter ✅ (redan på app-root nivå)
- [x] Lägg till JSDoc på publika hooks och utilities ✅ 2026-01-23

---

## Prioritet: Hög (Legacy)

### Omedelbart (säkerhet)

- [x] Skapa `.gitignore` + kontrollera att `.env` inte ligger i git‑historik ✅ 2026-01-18
  - `.env` borttagen från git-spårning (commitad 2026-01-18)
  - ⚠️ OBS: Anon-nyckel finns i git-historik men kan ej roteras (Supabase-begränsning)
  - ✅ Anon-nyckeln är säker att exponera - skyddas av RLS-policies
- [x] Rotera Supabase‑nycklar - EJ TILLÄMPLIGT ✅ 2026-01-18
  - Anon public-nyckel kan inte roteras i Supabase
  - Service_role (den farliga) var aldrig exponerad
- [x] Åtgärda XSS i `ArticleView.tsx` (DOMPurify) ✅ 2026-01-18
- [x] Validera filuppladdning (typ/storlek) i FilesTab ✅ 2026-01-18
- [x] Sanera filnamn (förhindra path traversal) ✅ 2026-01-18
- [x] Utreda CSRF‑skydd ✅ 2026-01-18
  - Supabase använder JWT i Authorization-header (inte cookies) → CSRF-immun
  - RLS-policies kräver auth.uid() → state-ändringar kräver giltig token

### Omedelbart (stabilitet/perf)

- [x] Kör `npx tsc --noEmit` och fixa ev. TS‑fel (review: ArticleEditor.tsx) ✅ 2026-01-18
- [x] Parallelisera Dashboard‑queries (Promise.all i useDashboard) ✅ 2026-01-18
- [x] Ta bort duplicerad meny‑item i `Header.tsx` ✅ 2026-01-18

### Databas (migreringar) ✅ KLAR

- [x] Kör migration `supabase/migrations/20260118_add_indexes_and_functions.sql` ✅ 2026-01-23
- [x] Kör migration `supabase/migrations/20260119_add_timebank_ledger_and_assignment_numbers.sql` ✅ 2026-01-23

### Nästa sprint (arkitektur/perf/DB) ✅ KLAR

- [x] Inför service‑lager/CRUD‑factory för hooks (minska duplicering) ✅ 2026-01-19
- [x] Route‑based code splitting (React.lazy i App.tsx) ✅ 2026-01-19
- [x] Lucide‑icon registry för mindre bundle ✅ 2026-01-19
- [x] Lägg till `useMemo/useCallback` där listor re‑renderar ofta ✅ 2026-01-19
- [x] Kör DB‑optimeringar/indexer (migration skapad) ✅ 2026-01-19
- [x] Konsolidera dashboard‑statistik via RPC/view ✅ 2026-01-19
- [x] Optimera sekventiella queries till parallella i hooks ✅ 2026-01-19

### Fakturering (Fas 4) ✅ KLAR

- [x] Implementera BillingPipeline-komponent ✅ (BillingPeriodSummary)
- [x] Skapa fakturaunderlag från time_entries ✅ (useCreateBillingBatch)
- [x] Gruppera tidsrapporter per kund och period ✅ (useBillingSummary)
- [x] Fortnox-export (CSV) ✅ (BillingDetail)

### Filer ✅ IMPLEMENTATION KLAR

- [x] FilesTab-komponent med uppladdning, nedladdning, borttagning ✅
- [x] Filvalidering (typ, storlek, farliga tillägg) ✅
- [x] Supabase Storage-integration med signed URLs ✅
- [ ] Manuell verifiering i UI (rekommenderas)

### UX-förbättringar ✅ KLAR

- [x] Lägg till bekräftelse-dialog vid borttagning av avtal ✅ 2026-01-19
- [x] Visa indexeringsvarning på dashboard (< 7 dagar) ✅ 2026-01-19
- [x] Lägg till redigering av journalanteckningar ✅ 2026-01-19
- [x] Verifiera radering av journalposter (GDPR) ✅ 2026-01-19
- [x] Verifiera radering av uppdrag (GDPR) ✅ 2026-01-19

---

## Prioritet: Medium

### Testning (prioriterad ordning)

- [x] Installera Vitest + Testing Library + jsdom ✅ 2026-01-23
- [x] Skapa `vitest.config.ts` och `tests/setup.ts` ✅ 2026-01-23
- [x] Skapa Supabase‑mocks (`tests/mocks/supabase.ts`) ✅ 2026-01-23
- [x] `src/lib/billing-logic.test.ts` (26 kritiska testfall) ✅ 2026-01-23
- [x] `src/lib/schemas.test.ts` (52 tester - validering + refine‑regler) ✅ 2026-01-23
- [x] AuthContext‑tester (12 tester - session, login/logout, timeout) ✅ 2026-01-23
- [x] Hook‑tester för data‑lagret (useCustomers/useAssignments/useBilling/useTasks) ✅ 2026-01-23
- [ ] Formtester för kritiska floden (CustomerForm/AgreementForm/JournalEntryForm/TaskForm)

### Tillgänglighet ✅ KLAR

- [x] Lägg till `aria-invalid` + `aria-describedby` på formulärfel ✅ 2026-01-23
- [x] Lägg till `scope="col"` på tabellrubriker ✅ 2026-01-23
- [x] Lägg till skip‑länk + landmark‑regioner ✅ 2026-01-23
- [x] Justera placeholder‑kontrast (WCAG AA) ✅ 2026-01-23

### Kodkvalitet ✅ KLAR

- [x] Ersätt `any`‑typer (3 st) ✅ 2026-01-23
- [x] Samla profil‑fetch‑logik (undvik duplicering i flera hooks) ✅ 2026-01-23

### Funktionalitet

- [x] Command Center (Cmd+K) - global kommandopalett ✅ 2026-01-23
- [x] AI-integration - LLM-agnostisk service (OpenAI/Anthropic/Gemini/Ollama/Azure) ✅ 2026-01-23
- [ ] AI‑native: diktation (voice‑to‑text) i Journal/Anteckningar

### Verifiering

- [x] Verifiera anteckningsbokens koppla-flöde (kund/uppdrag) i UI ✅ 2026-01-23

### Kodkvalitet ✅ KLAR

- [x] Separera AuthContext hook till egen fil (HMR-varning) ✅ 2026-01-23
- [x] Lägg till React Router v7 future flags ✅ 2026-01-23
- [x] Migrera till Zod v4 syntax (ta bort deprecation warnings) ✅ 2026-01-23

---

## Releaseförberedelse ✅ KLAR

- [x] Full testkörning: `npm run test`, `npx tsc --noEmit`, `npm run build` ✅ 2026-01-23
- [x] Verifiera offline‑SW‑beteende ✅ 2026-01-23
- [x] Stäm av `docs/KNOWN_ISSUES.md` ✅ 2026-01-23
- [x] Regressions‑QA: kund → uppdrag → journal → tid → fakturering ✅ 2026-01-23
- [x] Skapa release‑checklista för drift ✅ 2026-01-23 (`docs/RELEASE_CHECKLIST.md`)

## Prioritet: Låg (Fas 5+)

### Nice-to-have

- [ ] Öka timeout i supabase.ts vid behov (nuvarande: 10s)
- [x] Offline-support med service worker ✅ 2026-01-23
- [x] Optimistic updates för mutations ✅ 2026-01-23

---

## Completed

### 2026-01-17

- [x] Fixa Dashboard "Mina uppgifter" - visar nu även otilldelade uppgifter
- [x] Fixa Dashboard "Senaste aktivitet" - hämtar från journal/tasks/time_entries istället för activity_log
- [x] Batchad profilhämtning i ActivityFeed och task‑queries (withTimeout + in‑query)
- [x] Playwright setup + smoke‑test för huvudflöden

### 2026-01-18

- [x] Konsolidera dokumentation (ny SPEC/SETUP/ROADMAP + legacy‑arkiv)
- [x] Ta bort TipTap och anvanda textarea i kunskapsartiklar

### 2026-01-15

- [x] Kör migration `supabase/migrations/20260115_add_files.sql` i Supabase
- [x] BillingDetail + CSV‑export för fakturaunderlag
- [x] CustomerTimeline i kundvyn
- [x] Pagination i kundlistan (server‑side)
- [x] Lagt till filflikar för kund och uppdrag (FilesTab + hooks)
- [x] Skapat migration för `files` + storage policies (`20260115_add_files.sql`)
- [x] Möjlighet att radera journalposter
- [x] Möjlighet att radera uppdrag från detaljvy
- [x] Ta bort kvällspris (hourly_rate_evening) från avtalsmodulen
- [x] Implementera kontakter kopplade till uppdrag (AssignmentContactsTab)
- [x] Lägg till kontakter-flik i AssignmentDetail
- [x] Uppdatera useContacts med useContactsByAssignment hook
- [x] Kör migration `supabase/migrations/20250115_fix_rls_and_view.sql`
- [x] Stabiliserat uppgiftsflikar (ErrorState + korrekt invalidering)
- [x] Fixa Anteckningar-sidan (borttagen FK-syntax)
- [x] Fixa Kunskapsbank-sidan (borttagen FK-syntax)
- [x] Fixa journalanteckningens underskrift (hämtar author separat)
- [x] Anteckningsbok uppdaterad (quick_notes + koppla till kund/uppdrag)
- [x] Kör migration `supabase/migrations/20260115_add_quick_notes.sql` i Supabase

### 2025-01-15

- [x] Implementera ErrorState-komponent
- [x] Lägg till error states i listkomponenter
- [x] Skapa NotesPage med full CRUD
- [x] Implementera useNotes hook
- [x] Fixa Supabase singleton (Multiple GoTrueClient)
- [x] Implementera withTimeout wrapper
- [x] Applicera withTimeout på alla hooks
- [x] Auth timeout för getSession (5s)
- [x] Auth timeout för signOut (3s)
- [x] Skapa docs/-struktur
- [x] Debugga dropdown-meny i Header
- [x] Köra SQL-migration för Supabase foreign keys
- [x] Verifiera att logout fungerar korrekt
- [x] Implementera CustomerNotesTab
- [x] Implementera CustomerAssignmentsTab
- [x] Implementera CustomerContactsTab
- [x] Fixa JournalTimeline - visa arkiverade entries
- [x] Fixa tidsregistrering kopplat till journal

---

## Databasschema-ändringar att överväga

### Ej implementerat än

- [ ] `billing_batches` - För faktureringsbatcher (tabell finns men ej UI)
- [ ] `activity_log` - För aktivitetslogg (tabell finns men ej UI)
- [x] `files` - Filuppladdning (tabell + UI)

### Borttagning

- [x] `hourly_rate_evening` - Borttaget från UI (kvar i DB för bakåtkompatibilitet)
