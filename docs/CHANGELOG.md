# Changelog - Grannfrid App

Alla viktiga ändringar i projektet dokumenteras här.

## [Unreleased]

### 2026-01-23 - UX Review Implementation

#### Tillagt (Loading States)

- **Skeleton screens** - Ersatt alla LoadingSpinner med content-shaped skeletons
  - KnowledgeList.tsx - Grid-layout skeleton för artikelkort
  - ContactList.tsx - Tabell-skeleton för kontaktlista
  - NotesPage.tsx - Lista-skeleton för anteckningar
  - ArticleView.tsx - Artikel-layout skeleton
  - ArticleEditor.tsx - Formulär-skeleton
  - ProfileForm.tsx - Profil-layout skeleton

#### Tillagt (Dashboard)

- **QuickActions.tsx** - Snabbåtgärder för dashboard
  - "Ny kund" - Öppnar kundformulär
  - "Nytt uppdrag" - Öppnar uppdragsformulär
  - "Ny uppgift" - Öppnar uppgiftsformulär
  - "Registrera tid" - Navigerar till uppdrag

#### Tillagt (Global Search)

- **CMD+K shortcut** - Global sökning via CommandPalette
  - Header.tsx - Integrerat CommandPaletteHint och CommandPalette
  - Keyboard listener för CMD+K / CTRL+K

#### Tillagt (Navigation)

- **Breadcrumbs** - Lagt till i AssignmentDetail.tsx
  - Visas i både loading och main view

#### Förbättrat (Formulär)

- **LoginPage.tsx** - Förbättrad validering
  - E-post: Kräver giltig e-postadress
  - Lösenord: Minimum 6 tecken

#### Förbättrat (Modaler)

- **ArticleView.tsx** - Ersatt window.confirm med ConfirmDialog
  - Konsekvent UI för destruktiva åtgärder

#### Förbättrat (Informationsdensitet)

- **CustomerList.tsx** - pageSize ökad från 20 till 25
- **MyTasksWidget.tsx** - Visar 8 uppgifter istället för 5

#### Förbättrat (Tabeller)

- **Table.tsx** - Förbättrad hover state implementation
  - hoverable prop kontrollerar cursor och bakgrund
  - Bättre visuell feedback vid rad-hover

---

### 2026-01-23 - AI Native Review & Skill Installation

#### Tillagt (AI Planning)

- **docs/AI_NATIVE_REVIEW.md** - Komplett AI-möjlighetsanalys för Grannfrid
  - 12 features analyserade med AI-potential
  - Provider-agnostisk arkitektur (OpenAI, Anthropic, Azure, Google, Local)
  - Implementation roadmap i 4 faser
  - AI-assisterad ärendehantering som huvudfunktion

#### Tillagt (Claude Skills)

- **.claude/skills/ai-native-app-review/** - AI app review skill installerad
  - SKILL.md - Huvudskill för app-analys
  - references/ai-patterns.md - Detaljerade AI-implementationsmönster

#### AI-Assisterad Ärendehantering (Planerad)

- **Transformativ ny funktion**: Skapa kunder, uppdrag och kontakter från ostrukturerad text
  - Input: Mail, telefonanteckningar, copy-paste
  - Output: Strukturerad data med AI-genererade uppgiftslistor
  - Provider-agnostiskt interface (AIProvider, AIServiceFactory)
  - Fuzzy matching mot befintliga kunder

---

### 2026-01-23 - Design System Integration

#### Integrerat (PageHeader)

- **CustomerList.tsx** - Ersatt CardHeader med PageHeader + SkeletonTable för loading
- **AssignmentList.tsx** - Ersatt CardHeader med PageHeader + SkeletonTable för loading
- **TaskList.tsx** - Lagt till PageHeader + SkeletonList för loading

#### Integrerat (Breadcrumbs)

- **CustomerDetail.tsx** - Lagt till breadcrumbs för navigation istället för back-knapp
  - Breadcrumbs visas även under loading och error states
  - SkeletonCard används för loading state

#### Integrerat (FormField)

- **CustomerForm.tsx** - Migrerat till FormField-komponenten
  - Renare kod med inbyggd label, hint och error-hantering
  - Hints tillagda för org.nummer och telefon

#### Integrerat (Table Density)

- **CustomerList.tsx** - Table med density="comfortable" och hoverable
- **AssignmentList.tsx** - Table med density="comfortable" och hoverable

#### Fixat

- **Sidebar.tsx** - Copyright-år dynamiskt med `new Date().getFullYear()`

#### Borttaget (Imports)

- LoadingPage/LoadingSpinner ersatta med Skeleton-varianter
- CardHeader/CardTitle ersatta med PageHeader där applicable
- ArrowLeft-ikon ersatt med Breadcrumbs

---

### 2026-01-23 - Design System Fas 2: Layout & UX Components

#### Tillagt (Layout Komponenter)

- **FormField.tsx** - Komplett formulärfält med label, input, hint och felmeddelande
  - Automatisk `aria-describedby` för tillgänglighet
  - Stöd för required/optional indikatorer
  - Integrerar med useFormValidation hook

- **PageHeader.tsx** - Konsekvent sidhuvud-layout
  - Title, description, actions, badge
  - PageHeaderTabs och PageHeaderTab subkomponenter för fliknavigering
  - Stöd för back-knapp

- **Container.tsx** - Innehållsbredd-begränsning
  - Varianter: sm (640px), md (768px), lg (1024px), xl (1280px), full
  - ContentArea för vertikal spacing
  - SplitLayout för sidebar-layouter

- **Breadcrumbs.tsx** - Brödsmula-navigering
  - Automatisk kollapsning vid fler än 4 objekt
  - Home-ikon som första element
  - generateBreadcrumbs() helper för routes

- **Skeleton.tsx** - Loading placeholder-komponenter
  - 8 varianter: base, text, avatar, button, card, table, list, KPI
  - Stöd för pulse och wave animationer
  - Anpassningsbara rader och kolumner

#### Tillagt (Form Validation)

- **useFormValidation.ts** - Form state och validering med Zod
  - validateOnChange/validateOnBlur options
  - getFieldProps() för enkel input-bindning
  - isDirty, isValid, reset, clearErrors
  - Svenska valideringsmönster:
    - email, phone (+46/0-format)
    - postalCode (XXX XX)
    - orgNumber (XXXXXX-XXXX)
    - required, minLength, maxLength, url

#### Tillagt (Keyboard Shortcuts)

- **Cmd+A** - Markera alla objekt i listor
  - Dispatchar 'select-all-items' CustomEvent
  - Integrerat med useBulkSelect hook

- **Escape** - Avmarkera och stäng
  - Dispatchar 'clear-selection' CustomEvent
  - Stänger även öppna dialoger

#### Ändrat (Table.tsx)

- **Density variants** via TableContext
  - dense: kompakta rader (py-2, text-xs)
  - comfortable: standard (py-3, text-sm) - default
  - spacious: rymliga rader (py-4, text-base)
  - striped och hoverable options

#### Ändrat (BulkActionBar.tsx)

- **useBulkSelect** lyssnar nu på keyboard events
  - enableKeyboardShortcuts option (default: true)
  - Automatisk select all/clear selection

#### Verifierat

- TypeScript kompilerar utan fel
- Production build lyckas

---

### 2026-01-23 - Komplett Design System Implementation

#### Tillagt (Design System)

- **8px Spacing System**
  - Komplett spacing-skala i `@theme {}` (0-16 units)
  - Konsekvent användning genom alla komponenter

- **Typografi-Hierarki**
  - Major Third scale (1.25 ratio) för font-storlekar
  - Display-typsnitt (Lora) för rubriker
  - Body-typsnitt (Inter) för brödtext

- **WCAG AA Kontrastfixar**
  - Sage: rgb(108 145 79) - 4.5:1 kontrast på vit bakgrund
  - Ash: rgb(75 70 65) - 7.1:1 kontrast för sekundär text
  - Gold: rgb(180 130 20) - WCAG AA compliant
  - Terracotta: rgb(194 90 62) - WCAG AA compliant
  - Lavender: rgb(120 108 156) - WCAG AA compliant

- **Interaktionsfeedback**
  - `Button.tsx`: `loading` prop med Spinner-komponent
  - `Button.tsx`: `leftIcon`/`rightIcon` props
  - Förbättrade hover/active states med transitions
  - `Spinner.tsx`: Ny loading-indikator-komponent

- **Card Variants**
  - `default` - statiskt kort
  - `interactive` - klickbart med hover-effekt
  - `highlighted` - betonat kort med sage-bakgrund
  - `compact` - mindre padding för kompakta layouter
  - Nya padding-options: none/sm/md/lg

- **Keyboard Shortcuts**
  - `useKeyboardShortcuts.ts`: Hook för tangentbordsgenvägar
  - Vim-style sekvenser: `g → h` (dashboard), `g → c` (kunder), etc.
  - `⌘K` för Command Palette
  - `⌘⇧N` för ny kund
  - `/` för sökfokus

- **Command Palette**
  - `CommandPalette.tsx`: Komplett implementation med @radix-ui/react-dialog
  - Navigeringskommandon, åtgärder, hjälp
  - Tangentbordsnavigering med piltangenter
  - Sökfunktion

- **Bulk Actions**
  - `BulkActionBar.tsx`: Komponent för bulk-åtgärder
  - `useBulkSelect` hook med toggle/toggleAll/selectRange
  - Integrerat i CustomerList med export och bulk-delete
  - Checkbox med indeterminate state

- **EmptyState Components**
  - `EmptyState.tsx`: Återanvändbar tom-tillstånds-komponent
  - Presets för kunder, uppdrag, uppgifter, timmar, journalposter
  - Stöd för primary/secondary actions

- **Design Tokens i TypeScript**
  - `tokens.ts`: Typsäker åtkomst till design tokens

#### Ändrat

- **KPICards.tsx**: Kompaktare layout med sekundära KPIs
- **Checkbox.tsx**: Stöd för `indeterminate` prop
- **index.css**: Komplett omskrivning med design tokens

#### Verifierat

- TypeScript kompilerar utan fel
- Production build lyckas

---

### 2026-01-23 - Release-förberedelse och Testtäckning

#### Tillagt (Tester)

- **Hook-tester för data-lagret** (42 nya tester)
  - `useCustomers.test.ts` - 8 tester (fetch, paging, search, SQL escape)
  - `useTasks.test.ts` - 13 tester (CRUD, assignee, toggle status)
  - `useBilling.test.ts` - 9 tester (batches, summary, status update)
  - `useAssignments.test.ts` - 12 tester (CRUD, active filter, close)

- **E2E-tester**
  - `notes-flow.spec.ts` - Anteckningsbokens koppla-flöde
  - `regression-flow.spec.ts` - Huvudflöde: navigation genom alla sidor

#### Tillagt (Dokumentation)

- **JSDoc på publika hooks/utilities**
  - `useCustomers.ts` - Dokumenterat alla 6 hooks
  - `useTasks.ts` - Dokumenterat alla 8 hooks
  - `billing-logic.ts` - Dokumenterat alla funktioner + filöversikt
  - `queryKeys.ts` - Dokumenterat usage med exempel
  - `supabase.ts` - Dokumenterat withTimeout med exempel

- **Release-checklista** (`docs/RELEASE_CHECKLIST.md`)
  - Pre-release kontroller (test, build, säkerhet)
  - Deploy-instruktioner (Vercel/Netlify + manuell)
  - Post-deploy verifiering
  - Rollback-plan

#### Verifierat

- **Tailwind-konsolidering**: Analyserat - ej värt @apply för korta kombinationer
- **Service Worker**: `public/sw.js` implementerad korrekt
  - Network-first strategy
  - Supabase API exkluderat från cache
  - SPA-fallback till index.html
- **Alla 132 tester passerar** (`npm run test`)
- **TypeScript kompilerar utan fel** (`npx tsc --noEmit`)
- **Production build lyckas** (`npm run build`)
- **E2E regression passerar** (`npx playwright test tests/regression-flow.spec.ts`, 3/3)
- **E2E anteckningsbok passerar** (`npx playwright test tests/notes-flow.spec.ts`, 3/3)
- **Testsumma:** 138 tester passerar totalt

---

### 2026-01-23 - Sprint 3+4 Polish och UX-förbättringar

#### Tillagt (Hooks & Utilities)

- **useDebounce hook** (`src/hooks/useDebounce.ts`)
  - Generisk hook för att debounce värden
  - Default delay: 300ms
  - Används i CustomerList för sökoptimering

- **Error translation utility** (`src/lib/error-utils.ts`)
  - `translateError()` konverterar Supabase-fel till svenska
  - Hanterar timeout, network, auth, RLS och constraint-fel
  - Returnerar användarvänliga meddelanden

#### Ändrat (UX-förbättringar)

- **CustomerList.tsx**
  - Implementerat debounce på sökfält (300ms fördröjning)
  - Fixat pagination-text: visar inget istället för "Visar 0-0 av 0" vid tom sökning
  - Minskar onödiga API-anrop vid snabb inmatning

- **TaskList.tsx**
  - Loading states på delete-knappar med Loader2-spinner
  - `deletingTaskId` state för att tracka vilken uppgift som raderas
  - `displayName` på TaskCard memo-komponent för bättre DevTools-debugging
  - Disabled-state på delete-knapp under radering

#### Verifierat

- **Error Boundaries** - Redan implementerat på app-root nivå i App.tsx

---

### 2026-01-23 - Uppgiftsredigering, Klarmarkering och Comprehensive Review

#### Tillagt (Uppgifter)

- **Redigering av uppgifter** (`src/features/tasks/TaskList.tsx`)
  - Pencil-knapp på varje uppgiftskort öppnar TaskForm i edit-läge
  - Använder befintlig `useUpdateTask` hook
  - Formulär förifylls med uppgiftens nuvarande värden

- **Klarmarkering av uppgifter**
  - Cirkel/CheckCircle2-knapp för att toggla done-status
  - Klara uppgifter visas med genomstrykning och reducerad opacity (60%)
  - Grön checkmark (sage) på klara uppgifter
  - Klickbar för att återaktivera uppgifter

- **Status-cykling**
  - Statusikonen är nu klickbar för att cykla: pending → in_progress → done → pending
  - Tooltip visar nästa status

#### Ändrat (TaskList.tsx)

- Ny state: `editingTask` för att hålla uppgift som redigeras
- Nya memoized callbacks: `handleUpdate`, `handleEdit`, `handleMarkDone`
- `TaskCard` utökad med edit/done-knappar
- `TaskGroup` och `TaskCard` interfaces utökade med `onMarkDone` och `onEdit`
- TaskCard memo-optimerad för bättre prestanda

#### Genomfört (Comprehensive Review)

- **70+ problem identifierade** genom kod- och visuell granskning
  - 5 kritiska (SQL injection, NaN-bugg)
  - 15 höga (minnesläckor, race conditions)
  - 30+ medium (tillgänglighet, UX)
  - 20+ låga (kodstil, dokumentation)

#### Fixat (Sprint 1+2 buggar)

- **SQL injection i useCustomersPaged** (`src/hooks/useCustomers.ts`)
  - Förbättrad escape av söksträngar med backslash-escape
  - Säkrare hantering av SQL wildcards (%, \_)

- **NaN-bugg i JournalEntryForm** (`src/features/assignments/JournalEntryForm.tsx`)
  - Fixat `watch("hours")` som returnerade NaN vid tomt fält
  - Nu visas 0 istället för NaN i timbank-varningen

- **aria-describedby på formulärfält**
  - CustomerForm: name och email-fält har nu errorId för skärmläsare
  - TaskForm: title-fält har nu errorId
  - JournalEntryForm: content-fält har nu errorId

- **Race condition i AuthContext** (`src/contexts/AuthContext.tsx`)
  - Förhindrar dubblering mellan getSession() och onAuthStateChange INITIAL_SESSION
  - Profile-fetch väntas nu innan isLoading sätts till false

- **Keyboard navigation i CommandCenter** (`src/components/command/CommandCenter.tsx`)
  - Escape-hantering förbättrad med preventDefault och stopPropagation

- **Null-checks i billing-logic.ts**
  - `timebankStatusFromView()` hanterar nu null-värden från databasvy

- **Filnamn-sanitering i useFiles.ts**
  - Lägger till URL-dekodning för att fånga %2f, %2e etc.
  - Null-byte injection blockeras
  - Unicode-normalisering (NFC) för homoglyph-skydd
  - Upprepade understreck tas bort

---

### 2026-01-23 - Kodkvalitet, Tester och Förbättringar

#### Tillagt (Tester)

- **schemas.test.ts** - 52 enhetstester för Zod-validering
  - Testar alla scheman: customer, agreement, assignment, journal, task, contact, knowledgeArticle, profile, quickNote, customerNote
  - Validerar required fields, enum-värden, defaults, UUID-format

- **AuthContext.test.tsx** - 12 enhetstester för autentisering
  - Testar useAuth hook, signIn, signOut, session initialization, refreshProfile
  - Mockar Supabase auth och profiles-tabellen

#### Förbättrat (Tillgänglighet)

- **WCAG-förbättringar på formulärkomponenter**
  - Input.tsx, Textarea.tsx: `aria-invalid`, `aria-describedby` för felhantering
  - Table.tsx: TableHead har nu `scope="col"` som default
  - Placeholder-kontrast ökad (text-ash istället för text-ash/60) i Input, Textarea, SearchInput, Select

#### Förbättrat (Kodkvalitet)

- **Typsäkerhet** - Ersatt `any`-typer i useBilling.ts med explicita interfaces
  - `TimeEntryWithCustomer` för time entries med kundrelation
  - `BillingBatchUpdate` för status-uppdateringar

- **AuthContext refaktorering**
  - useAuth hook nu också tillgänglig via `@/hooks/useAuth`
  - AuthContext synkar nu med React Query cache vid refreshProfile
  - Exporterar AuthContext och AuthContextType för externt bruk

- **React Router v7-förberedelse**
  - Lagt till future flags: `v7_startTransition`, `v7_relativeSplatPath`

#### Tillagt (Infrastruktur)

- **Offline-support** med service worker
  - `public/sw.js`: Network-first strategi med cache-fallback
  - `src/lib/serviceWorker.ts`: Registrering med update-hantering
  - Cachar statiska assets (JS, CSS, bilder, fonts)
  - SPA-fallback för HTML-requests
  - Exkluderar Supabase API-anrop från cache

- **Optimistic updates** för snabbare UI
  - useToggleTaskStatus använder nu optimistic update
  - Omedelbar UI-uppdatering vid statusändring
  - Automatisk rollback vid serverfel

---

### 2026-01-23 - Testning, Tillgänglighet, Command Center och AI-integration

#### Tillagt (Testning)

- **Vitest setup** - Komplett testinfrastruktur
  - `vitest.config.ts` med React plugin, jsdom, path alias
  - `tests/setup.ts` med mocks för matchMedia, ResizeObserver, IntersectionObserver
  - `tests/mocks/supabase.ts` för Supabase client mocking
  - Test scripts: `npm run test`, `npm run test:run`, `npm run test:coverage`

- **billing-logic.test.ts** - 26 enhetstester för affärslogik
  - `calculateTimebankStatus` (6 tester)
  - `timebankStatusFromView` (2 tester)
  - `calculateBillingWithSplit` för hourly/fixed/timebank (11 tester)
  - `getPeriodStartDate` (2 tester)
  - `isIndexationWarningNeeded` (5 tester)

#### Tillagt (Tillgänglighet)

- **SkipLink** (`src/components/layout/SkipLink.tsx`)
  - Skip-länk för tangentbordsnavigering
  - Synlig vid fokus, hoppar till huvudinnehåll

- **Landmark-regioner**
  - `AppShell.tsx`: `<main id="main-content" role="main">`
  - `Sidebar.tsx`: `<nav role="navigation">` med aria-labels
  - `Header.tsx`: `role="banner"` och aria-labels på knappar

#### Tillagt (Command Center)

- **CommandCenter** (`src/components/command/CommandCenter.tsx`)
  - Global kommandopalett öppnas med Cmd+K / Ctrl+K
  - 12 fördefinierade kommandon i tre kategorier (navigation, action, user)
  - Sökfiltrering med nyckelord
  - Tangentbordsnavigering (piltangenter, Enter, Escape)
  - Responsiv design med tillgänglighetsattribut

#### Tillagt (AI-integration)

- **LLM-agnostisk AI-service** (`src/lib/ai/`)
  - `types.ts`: Interfaces för AIProvider, AIConfig, AICompletionRequest/Response
  - `ai-service.ts`: Multi-provider support
    - OpenAI (GPT-4, GPT-3.5)
    - Anthropic (Claude)
    - Google Gemini
    - Ollama (lokala modeller)
    - Azure OpenAI
    - Custom OpenAI-compatible endpoints
  - Fördefinierade prompts: cleanupNote, summarizeJournal, suggestNextSteps, translateToFormal
  - Miljövariabelkonfiguration för enkel setup

---

### 2026-01-23 - Databasmigreringar körda

#### Utfört (via Supabase MCP)

- **Migration 1: `add_indexes_and_functions_v2`** kördes framgångsrikt
  - 36 nya prestandaindex skapade
  - RPC-funktioner: `get_dashboard_stats()`, `get_timebank_status()`, `get_recent_activity()`
  - Anpassningar: Tog bort `is_archived`-filter (kolumn saknas i time_entries)

- **Migration 2: `add_timebank_ledger_and_assignment_numbers_v2`** kördes framgångsrikt
  - Timebank ledger-tabell med triggers för insert/update/delete
  - Backfill av befintliga timebank-timmar
  - Assignment numbering med sequence (`C-001`, `P-001`)
  - Anpassningar: Ändrade `polname` till `policyname` i pg_policies-query

- **Schema reload** kördes: `NOTIFY pgrst, 'reload schema'`

#### Verifierat

- `get_dashboard_stats()` returnerar korrekt data (2 aktiva kunder, 2 uppdrag, 2 väntande uppgifter)
- `assignment_sequence` tabell seedat korrekt (case: last_number = 2)
- Alla 36 index skapade och aktiva

---

### 2026-01-19 - Timbank-ledger + uppdragsnummer

#### Tillagt (Databas)

- **Timbank-ledger** (`supabase/migrations/20260119_add_timebank_ledger_and_assignment_numbers.sql`)
  - Ny tabell `timebank_ledger` med append-only transaktioner
  - Triggers på `time_entries` för insert/update/delete
  - Backfill av befintliga timebank-timmar
  - `timebank_current_status` uppdaterad att läsa från ledger
- **Uppdragsnummer (sequence + trigger)**
  - Ny tabell `assignment_sequence`
  - Trigger `trg_assignment_number` genererar `C-001`/`P-001`
  - Seedar sekvens från befintliga uppdrag

#### Noterat

- Migrationen måste köras i Supabase innan ledger/nummer är aktiva.

---

### 2026-01-19 - UX-förbättringar och Journalredigering

#### Tillagt

- **Bekräftelse-dialog för avtalsradering** (`src/features/customers/CustomerDetail.tsx`)
  - Röd "Ta bort"-knapp på avtalskort
  - ConfirmDialog med varning innan radering
  - Använder befintlig `useDeleteAgreement` hook

- **Redigering av journalanteckningar**
  - Ny hook `useUpdateJournalEntry` (`src/hooks/useJournal.ts`)
  - Ny komponent `JournalEditDialog` (`src/features/assignments/JournalEditDialog.tsx`)
  - "Redigera"-alternativ i dropdown-menyn på journalposter
  - Hanterar time_entries-uppdatering vid ändrade timmar (radera + skapa nya)

#### Verifierat

- Filhantering (uppladdning, nedladdning, borttagning) - fullt funktionell
- Indexeringsvarning på dashboard - redan implementerad med färgkodning
- GDPR-radering av journalposter - `useDeleteJournalEntry` med fil-cleanup
- GDPR-radering av uppdrag - `useDeleteAssignment` med fil-cleanup

---

### 2026-01-19 - Arkitektur, Performance och Databas

#### Tillagt (Arkitektur)

- **Route-based code splitting** (`src/App.tsx`)
  - Alla sidor lazy-loadas med React.lazy()
  - Suspense wrapper med LoadingPage fallback
  - Minskar initial bundle-storlek

- **Lucide icon registry** (`src/lib/icons.ts`)
  - Centraliserat icon-register för bättre tree-shaking
  - Exporterar Icons-objekt och individuella ikoner
  - Type-safe IconName typ

- **CRUD Factory** (`src/lib/crud-factory.ts`)
  - Generiskt factory för React Query hooks
  - Minskar boilerplate för list/detail/create/update/delete
  - Inbyggd toast-hantering och query-invalidering

#### Tillagt (Database)

- **Prestandaindex** (`supabase/migrations/20260118_add_indexes_and_functions.sql`)
  - 15+ nya index för vanliga query-patterns
  - Idempotenta (IF NOT EXISTS)

- **Dashboard RPC-funktion** (`get_dashboard_stats()`)
  - En databasanrop istället för 6 parallella
  - Returnerar all statistik i ett svar

- **Timebank RPC-funktion** (`get_timebank_status()`)
  - Beräknar timbank-status direkt i databasen
  - Hanterar månads- och årsperioder

- **Activity RPC-funktion** (`get_recent_activity()`)
  - Aggregerar journal, tasks, time_entries i en query
  - Inkluderar performer-namn via JOIN

#### Ändrat (Performance)

- **TaskList.tsx** - Optimerad med useMemo, useCallback och memo()
  - Memoizerade filteredTasks och groupedTasks
  - Callbacks för statusChange och delete
  - TaskCard wrapped i memo()

- **useBilling.ts** - Paralleliserade batch+entries queries
  - Promise.all istället för sekventiella anrop

- **useDashboard.ts** - Använder nu RPC-funktion
  - Primärt: ett anrop via get_dashboard_stats()
  - Fallback: parallella queries om RPC saknas

---

### 2026-01-18 - Säkerhet och stabilitet

#### Tillagt (Säkerhet)

- **.gitignore** - Skapad med fullständig exkluderingslista
  - `.env` filer, node_modules, dist, test-results etc.
- **.env borttagen från git-spårning** - `git rm --cached .env` + commit
  - Anon-nyckel i historik men säker (skyddas av RLS)
  - Service_role (den farliga) var aldrig exponerad
- **DOMPurify** - Installerad och integrerad för XSS-skydd
- **Filuppladdningsvalidering** (`src/lib/constants.ts`, `src/hooks/useFiles.ts`)
  - Max filstorlek: 25 MB
  - Vitlistade MIME-typer (dokument, bilder, video, arkiv)
  - Blockerade farliga tillägg (.exe, .bat, .php etc.)
  - Detekterar dubbla tillägg (t.ex. "virus.pdf.exe")
- **FilesTab UI-validering** (`src/features/files/FilesTab.tsx`)
  - `accept`-filter i filväljaren
  - Klientvalidering för storlek och filtyp innan uppladdning
- **Förbättrad filnamnssanering** (`sanitizeFileName`)
  - Förhindrar path traversal (.., /, \)
  - Tar bort kontrolltecken och Windows-förbjudna tecken
  - Begränsar filnamnslängd till 200 tecken

#### Fixat

- **ArticleView.tsx** - XSS-sårbarhet åtgärdad
  - `dangerouslySetInnerHTML` använder nu DOMPurify.sanitize()
  - Endast säkra HTML-taggar tillåts (p, br, strong, em, ul, ol, li, h1-h4, a)
- **ArticleEditor.tsx** - Korrigerade regex-syntax (dubbla backslashes → enkla)
- **Header.tsx** - Tog bort duplicerad meny-item

#### Ändrat

- **useDashboard.ts** - Paralleliserade Dashboard-queries med Promise.all
  - `useDashboardStats()`: 6 sekventiella queries → 6 parallella (snabbare laddning)
  - `useRecentActivity()`: 4 sekventiella queries → 3 parallella + 1 profilhämtning
- **docs/KNOWN_ISSUES.md** - Ny post om `.env` i git-historik
- **supabase/migrations/20260118_add_indexes_and_functions.sql** - Tog bort `CONCURRENTLY` för att fungera i transaktionella migreringar

#### Säkerhetsnoteringar

- **CSRF-skydd**: Supabase använder JWT i Authorization-header → CSRF-immun
- **RLS**: Alla state-ändringar kräver giltig auth.uid() via RLS-policies

---

### 2026-01-18 - Dokumentationskonsolidering

#### Tillagt

- **docs/SPEC.md** - Komplett produkt-/funktionsspec ("the grand plan") v4.0
  - 12 sektioner med fullständig dokumentation
  - Syfte, målgrupp, kärnbehov
  - Alla avtalstyper med detaljerad beskrivning
  - Timbank-split logik
  - Komplett datamodell med tabellbeskrivningar
  - Teknisk arkitektur och kritiska patterns
  - Design tokens och färgpalett
  - Säkerhet och GDPR
  - Faktureringsflöde med diagram
  - Uppdaterad enligt aktuella beslut (TipTap borta, GDPR-radering)
- **docs/SETUP.md** - Setup + Supabase + migreringar
- **docs/ROADMAP.md** - Planerade förbättringar (inkl. fakturering + avtalstjänster)
- **docs/INDEX.md** - Dokumentationsindex
- **docs/legacy/README.md** - Kort oversikt over arkiverade dokument

#### Ändrat

- **CLAUDE.md** - Uppdaterade referenser till nya kanoniska dokument, borttagen Ralph Wiggum-sektion
- **docs/ARCHITECTURE.md** - Uppdaterad tech stack (ingen TipTap) + GDPR‑radering
- **docs/ROADMAP.md** - Utökad med detaljerad faktureringsplan och avtalstjänster från legacy-specar
- **Knowledge** - ArticleEditor anvander nu textarea (ingen TipTap)
- **docs/TODO.md** - Prioriterad testlista baserad på TESTING_INDEX
- **docs/TODO.md** - Prioriterad åtgärdslista från Comprehensive Review (säkerhet/perf/DB)

#### Flyttat till legacy

- **GRANNFRID_FINAL_SPEC_V3.md** → `docs/legacy/`
- **CLAUDE_CODE_BYGGPLAN_V2.md** → `docs/legacy/`
- **SUPABASE_SETUP_GUIDE.md** → `docs/legacy/`
- **docs/FAKTURERING_IMPLEMENTATIONSPLAN.md** → `docs/legacy/`
- **docs/AVTALSTJANSTER_SPEC.md** → `docs/legacy/`

### 2026-01-17 - Medverkande konsulter + omstrukturering

#### Tillagt (Dokumentation)

- **docs/legacy/FAKTURERING_IMPLEMENTATIONSPLAN.md** utökad med:
  - **Engångsavtal (onetime)** - Ny avtalstyp för engångsuppdrag
  - **excluded_months** - Fält för att hoppa över faktureringsmånader (t.ex. juli)
  - **Valideringsregler** - Zod-schemas med obligatoriska fält per avtalstyp
    - Timbank MÅSTE ha `overtime_rate`
    - Fastpris/onetime MÅSTE ha `hourly_rate` för extraarbete
  - **Fas 8: Medverkande konsulter** - NY! Flera konsulter på samma journalpost
    - `time_entry_participants` tabell för medverkande konsulter
    - UI-komponent: ParticipantSelector för att välja medverkande
    - Max 2-3 medverkande konsulter per journalpost
    - Fakturarader visar alla konsultnamn summerat
    - Varje konsult får sin egen time_entry för korrekt produktionskredit
  - **Fas 9: Inkluderade tjänster** flyttad till separat modul (ej faktureringslogik)

- **docs/legacy/AVTALSTJANSTER_SPEC.md** - NY fil!
  - Komplett specifikation för inkluderade tjänster/åtaganden
  - Databasschema (`agreement_services`, `service_completions`)
  - UI-komponenter: ServiceChecklistItem, ServiceProgressBadge
  - Periodberäkning för monthly/quarterly/yearly frekvens
  - Integration med kundvy och faktureringsvyn (varning, ej blockering)

#### Ändrat

- **Faktureringsmodeller** sektion förtydligad med obligatoriska fält
- **Sprint 7** ändrad till Medverkande konsulter (Fas 8)
- **Sprint 8** ändrad till Inkluderade tjänster (separat modul)
- **Projektavtal** förtydligat: använd `fixed` med `period='monthly'` och `valid_to` satt
- **Inkluderade tjänster** - Tydliggjort att det handlar om avtalsleverans, INTE faktureringslogik

---

### 2026-01-17 - Dashboard widgets fix

#### Fixat

- **ActivityFeed** (`src/hooks/useDashboard.ts`)
  - Ändrade `useRecentActivity()` från att läsa `activity_log`-tabellen (som saknar triggers)
  - Hämtar nu aktiviteter direkt från `journal_entries`, `tasks` och `time_entries`
  - Kombinerar och sorterar efter datum
  - Visar nu "Test Konsult skapade en journalanteckning" etc.
- **MyTasksWidget** (`src/hooks/useTasks.ts`)
  - Ändrade `useMyTasks()` från `.eq('assigned_to', user.id)` (bara egna uppgifter)
  - Till `.or(\`assigned_to.eq.${user.id},assigned_to.is.null\`)` (egna + otilldelade)
  - Dashboard visar nu både tilldelade och otilldelade uppgifter
- **Profilhämtning batchad** (`src/hooks/useDashboard.ts`, `src/hooks/useTasks.ts`)
  - Undviker N+1‑queries genom `profiles.in('id', ...)`
  - `withTimeout()` används även för profilhämtning

#### Teknisk insikt

- `activity_log`-tabellen existerar men saknar triggers för automatisk loggning
- Workaround: Hämta aktivitet direkt från respektive tabell istället

#### Tillagt

- **Playwright setup** (`playwright.config.ts`, `tests/smoke.spec.ts`)
  - Smoke‑test för login, kundvy, filer, billing och pagination
  - Test‑script: `npm run test:e2e`
  - Automatisk baseURL‑detektion via `scripts/run-e2e.mjs`

---

### 2026-01-15 - Billing detail + kundtimeline + pagination

#### Tillagt

- **BillingDetail** (`src/features/billing/BillingDetail.tsx`)
  - Dialog med batchdetaljer och CSV‑export
- **CustomerTimeline** (`src/features/customers/CustomerTimeline.tsx`)
  - Visar senaste aktivitet baserat på uppdrag/uppgifter/anteckningar/filer
- **Pagination för kunder** (`src/hooks/useCustomers.ts`, `src/features/customers/CustomerList.tsx`)
  - Server‑side pagination med sökfilter och totals

#### Ändrat

- **BillingBatchList** - Ny action för att visa underlag
- **CustomerDetail** - "Senaste aktivitet" visar nu CustomerTimeline

### 2026-01-15 - Filer + GDPR-radering

#### Tillagt

- **FilesTab** (`src/features/files/FilesTab.tsx`)
  - Filhantering för kund/uppdrag: uppladdning, nedladdning, borttagning
- **useFiles hooks** (`src/hooks/useFiles.ts`)
  - Queries och mutations för files + Supabase Storage
- **Files migration** (`supabase/migrations/20260115_add_files.sql`)
  - `files`-tabell + RLS + storage bucket/policies

#### Ändrat

- **AssignmentDetail** (`src/features/assignments/AssignmentDetail.tsx`)
  - Ny flik: Filer
  - Ny GDPR-radering av uppdrag (confirm + redirect)
- **CustomerDetail** (`src/features/customers/CustomerDetail.tsx`)
  - Ny flik: Filer
- **JournalTimeline** (`src/features/assignments/JournalTimeline.tsx`)
  - Ny action: Ta bort journalpost
- **GDPR-radering**
  - Tar bort kopplade filer i Supabase Storage vid radering av uppdrag/journalpost

### 2026-01-15 - Anteckningsbok med koppling + batchad journal-underskrift

#### Tillagt

- **Quick Notes-hooks** (`src/hooks/useQuickNotes.ts`)
  - Skapa, ta bort och koppla anteckningar till kund/uppdrag
- **Quick notes migration** (`supabase/migrations/20260115_add_quick_notes.sql`)
  - Skapar `quick_notes` + trigger + RLS policy
- **Anteckningsbok** (`src/pages/NotesPage.tsx`)
  - Anteckningar kan sparas utan kund
  - "Koppla"-flöde som skickar anteckning till kund (customer_notes) eller uppdrag (journal_entries)
  - Tidfält vid koppling till uppdrag (valfritt, sparas som `created_at`)

#### Ändrat

- **useJournal.ts** - Batchhämtning av författare via `profiles.in('id', ...)`
  - Minskar antalet requests och stabiliserar underskrifter

### 2026-01-15 - Fixade FK-joins för Anteckningar, Kunskapsbank och Journal-underskrift

#### Fixat

- **useNotes.ts** - Borttagen explicit FK-syntax för author (`profiles!customer_notes_created_by_fkey`)
  - Anteckningar-sidan fungerar nu korrekt
- **useKnowledge.ts** - Borttagen explicit FK-syntax i `useKnowledgeArticles` och `useKnowledgeArticle`
  - Kunskapsbank-sidan fungerar nu korrekt
- **useJournal.ts** - Lade till separat hämtning av author-information
  - Journalanteckningar visar nu korrekt författarnamn istället för "Okänd"
  - Använder samma Promise.all-pattern som useTasks

#### Teknisk detalj

Supabase PostgREST FK-join syntax (`profiles!tablename_column_fkey`) fungerar inte tillförlitligt.
Workaround: Hämta relaterad data separat via Promise.all efter huvudqueryn.

---

### 2026-01-15 - Implementerade saknade kundvyflikar + FK-syntax fix

#### Tillagt

- **CustomerAssignmentsTab** (`src/features/customers/CustomerAssignmentsTab.tsx`)
  - Visar kundens uppdrag grupperade efter status (Aktiva/Avslutade)
  - Navigerar till uppdragsdetaljvy vid klick
  - Knapp för att skapa nytt uppdrag
- **CustomerContactsTab** (`src/features/customers/CustomerContactsTab.tsx`)
  - Visar kundens kontaktpersoner
  - CRUD-funktionalitet: skapa, redigera, ta bort kontakter
  - Stöd för fakturamottagare-markering
  - Inline-formulär i dialog

#### Ändrat

- **useCustomerNotes.ts** - Borttagen explicit FK-syntax (`profiles!customer_notes_created_by_fkey`)
- **useJournal.ts** - Borttagen explicit FK-syntax (`profiles!journal_entries_created_by_fkey`)
- **CustomerDetail.tsx** - Ersatt placeholder-text med riktiga komponenter för Uppdrag/Kontakter-flikar

#### Fixat

- Kundanteckningar kunde inte sparas (FK-syntax orsakade schema-fel)
- Journalanteckningar kunde inte sparas (FK-syntax orsakade schema-fel)
- "Uppdrag kommer i Fas 4..." placeholder ersatt med fungerande lista
- "Kontakter kommer i Fas 7..." placeholder ersatt med fungerande CRUD

---

### 2026-01-15 - Robustare timeout och auth-fallbacks + Schema-fix

#### Ändrat

- **withTimeout() förstärkt** (`src/lib/supabase.ts`)
  - Tvingar alltid timeout via `Promise.race` och aborterar request om möjligt
  - Använder returnerade builder från `abortSignal()` för korrekt signal
- **AuthContext timeout-flöde** (`src/contexts/AuthContext.tsx`)
  - `getSession()` använder `withTimeout(5000)` och rensar state vid timeout/ingen session
  - `signIn()` använder `withTimeout(10000)` för att undvika hängande login
  - `fetchProfile()` fångar timeout-fel och faller tillbaka till null
- **Header avatar-fallback** (`src/components/layout/Header.tsx`)
  - Initialer baseras på profilnamn → user metadata → e-postprefix
- **useTasks.ts** - Borttagen explicit FK-syntax för assignee-join (temporär workaround)
- **useDashboard.ts** - Borttagen explicit FK-syntax för performer-join (temporär workaround)

#### Fixat

- Oändliga laddningar när `abortSignal()` inte applicerades korrekt på query builders
- "U"-avatar när profil saknas/times out (fallback till user metadata/e-post)
- Uppgiftslistor uppdateras nu korrekt efter create/update/delete/toggle
- Uppgiftsflikar visar ErrorState istället för tyst failure
- "Could not find a relationship" fel på Dashboard (FK-syntax borttagen temporärt)
- Körde `NOTIFY pgrst, 'reload schema'` i Supabase för att uppdatera PostgREST-cache

### 2025-01-15 - Stabilisering av Supabase-anslutning och Error Handling

#### Tillagt (Dokumentation)

- **docs/-struktur** - CHANGELOG, KNOWN_ISSUES, TODO, ARCHITECTURE, SESSION_LOG
- **.claude/rules/** - Modulära regler för documentation, supabase, react-query, tailwind
- **Import-syntax** i CLAUDE.md för att referera till andra filer
- **Review Checklist** för att säkerställa dokumentationsuppdatering

#### Tillagt

- **ErrorState-komponent** (`src/components/shared/ErrorState.tsx`)
  - Återanvändbar komponent för felvisning med retry-funktionalitet
  - Stöd för olika varianter (default, compact)
  - Visar felmeddelande och retry-knapp

- **NotesPage** (`src/pages/NotesPage.tsx`)
  - Ny sida för att hantera kundanteckningar
  - Sök-, skapa-, redigera-, ta bort- och fastnåla-funktionalitet
  - Kopplad till kunddatabas

- **useNotes hook** (`src/hooks/useNotes.ts`)
  - `useAllNotes()` - Hämtar alla anteckningar med kundinfo
  - `useCreateNote()` - Skapar ny anteckning
  - `useUpdateNote()` - Uppdaterar anteckning
  - `useDeleteNote()` - Tar bort anteckning

- **Query key för notes** (`src/lib/queryKeys.ts`)
  - Lagt till `notes: { all: ['notes'] as const }`

#### Tillagt (Supabase)

- **RLS- och view-fix migration** (`supabase/migrations/20250115_fix_rls_and_view.sql`)
  - Aktiverar RLS på `public.workspaces` och lägger SELECT-policy för `authenticated`
  - Sätter `security_invoker` på `public.timebank_current_status`

#### Ändrat

- **Supabase-klient singleton** (`src/lib/supabase.ts`)
  - Implementerat singleton-pattern för att undvika "Multiple GoTrueClient instances"
  - Global fetch wrapper borttagen för att undvika auth-konflikter
  - Exporterar `withTimeout()` utility för query-wrapping
  - `withTimeout()` använder nu `abortSignal` när det stöds för att avbryta hängande requests

- **withTimeout wrapper applicerad på alla hooks** (av Codex)
  - `useDashboard.ts` - Dashboard-statistik
  - `useProfile.ts` - Användarprofil
  - `useCustomers.ts` - Kundhantering
  - `useAssignments.ts` - Uppdragshantering
  - `useTasks.ts` - Uppgiftshantering
  - `useContacts.ts` - Kontakthantering
  - `useKnowledge.ts` - Kunskapsbank
  - `useBilling.ts` - Fakturering
  - `useAgreements.ts` - Avtalshantering
  - `useCustomerNotes.ts` - Kundanteckningar
  - `useTimebank.ts` - Timbank
  - `useTimeEntries.ts` - Tidrapportering
  - `useJournal.ts` - Journalhantering

- **Error states i listkomponenter**
  - `CustomerList.tsx` - Kundlista med error state
  - `AssignmentList.tsx` - Uppdragslista med error state
  - `TaskList.tsx` - Uppgiftslista med error state

- **Error states i fler vyer**
  - `ActivityFeed.tsx`, `IndexationAlert.tsx`, `KPICards.tsx`, `MyTasksWidget.tsx`
  - `BillingBatchList.tsx`, `BillingPeriodSummary.tsx`
  - `ProfileForm.tsx`, `KnowledgeList.tsx`, `ArticleView.tsx`, `ArticleEditor.tsx`
  - `ContactList.tsx`, `AssignmentDetail.tsx`

- **CustomerDetail edit-route**
  - `/customers/:id/edit` öppnar nu edit-modal och redirectar till detaljvy

- **Kundskapande workspace-id**
  - Skapar kunder med `profile.workspace_id` (fallback till Göteborg om saknas)

- **AuthContext förbättringar** (`src/contexts/AuthContext.tsx`)
  - 5s timeout på `getSession()` för att undvika hängande laddning
  - 3s timeout på `signOut()` för snabbare utloggning
  - State rensas omedelbart vid logout för snabb UI-respons

#### Fixat

- React Query-queries hänger inte längre oändligt vid nätverksproblem
- Appen visar nu ErrorState istället för evig laddningsspinner
- "Multiple GoTrueClient instances" varning eliminerad genom singleton-pattern
- Switch-varning (uncontrolled → controlled) i ProfileForm åtgärdad
- Supabase schema-relationer åtgärdade via SQL-migration (joins fungerar igen)

---

## [Fas 1] - Initial Setup (Pre-Claude)

### Grundläggande struktur

- React 18 + TypeScript + Vite setup
- Tailwind CSS v4 med custom tema (sage, terracotta, sand, etc.)
- Supabase integration (Auth + PostgreSQL)
- TanStack React Query v5 för state management
- React Router v6 för routing
- Radix UI primitives för UI-komponenter

### Implementerade features

- Autentisering (login/logout)
- Dashboard med KPI-kort
- Kundhantering (CRUD)
- Avtalshantering
- Uppdragshantering
- Uppgiftshantering
- Kontakthantering
- Kunskapsbank
- Fakturering
- Timbank
- Profilsida
