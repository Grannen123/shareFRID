# Grannfrid 2.0 - Claude Code Byggplan V2

**Version:** 2.0 (Uppdaterad med V3-spec och Ralph Wiggum-metod)
**Datum:** 2026-01-15
**Syfte:** Steg-för-steg instruktioner för att bygga appen med Claude Code

---

## VÄLJ DIN BYGGMETOD

### Metod A: Ralph Wiggum (Rekommenderad för "overnight build")
- Automatiserad loop som bygger hela appen
- Du kan gå iväg och låta den jobba
- Bäst om du har tid att vänta
- **Uppskattad tid:** 2-4 timmar automatiskt

### Metod B: Sessionsbaserad (Manuell kontroll)
- 6 separata sessioner med verifiering mellan
- Du styr varje steg
- Bäst om du vill följa med i realtid
- **Uppskattad tid:** 4-6 timmar med pauser

### Metod C: En enda stor prompt
- Allt i ett svep
- Riskabelt men snabbt om det fungerar
- **Uppskattad tid:** 2-3 timmar

---

## METOD A: RALPH WIGGUM (Automatiserad Loop)

### Vad är Ralph Wiggum?
En iterativ AI-utvecklingsmetod som kör en loop som automatiskt återmatar samma prompt tills appen är klar. Perfekt för att bygga medan du sover eller gör annat.

### Steg 1: Installera Ralph Wiggum Plugin

```bash
# Kontrollera om pluginet finns
claude plugin list

# Om det inte finns, installera det
claude plugin install ralph-wiggum
```

### Steg 2: Förbered miljön

```bash
# Gå till projektmappen
cd /Users/jonashalvarsson/Desktop/alla\ mina\ appar

# Skapa .env-fil (du måste fylla i credentials)
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
EOF
```

### Steg 3: Kör Ralph-loopen

```bash
/ralph-loop "
# GRANNFRID BUILD INSTRUCTIONS

## LÄSS FÖRST
1. /Users/jonashalvarsson/Desktop/alla mina appar/GRANNFRID_FINAL_SPEC_V3.md (huvudspec)
2. /Users/jonashalvarsson/Desktop/alla mina appar/CLAUDE.md (regler och mönster)

## PROJEKTMAPP
/Users/jonashalvarsson/Desktop/alla mina appar (bygg här, INTE i undermapp)

## ITERATIONSLOGIK
- Du kommer köras i en loop - varje iteration ser du filerna du skapat
- Läs git log och filändringar för att veta var du är
- Om du ser att FAS X är klar (alla filer finns + npm run dev OK), gå till FAS X+1
- FIXA ALLA FEL innan du går vidare till nästa fas

## VERIFIERING PER FAS (KRITISKT!)
Efter att du skapat alla filer i en fas MÅSTE du:
1. Kör: npm run dev
2. Om fel: FIXA FELET, kör igen
3. Kör: npx tsc --noEmit
4. Om typfel: FIXA TYPFELEN, kör igen
5. ENDAST när båda passerar utan fel → nästa fas

## FAS 1: FOUNDATION
Skapa dessa filer (kontrollera först om de redan finns):
- package.json (npm create vite@latest . -- --template react-ts)
- Installera: react-router-dom @tanstack/react-query @supabase/supabase-js react-hook-form @hookform/resolvers zod @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-label @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-checkbox @tiptap/react @tiptap/pm @tiptap/starter-kit lucide-react sonner clsx tailwind-merge date-fns
- DevDeps: tailwindcss @tailwindcss/postcss @tanstack/react-query-devtools @types/react @types/react-dom
  (OBS: INTE @tailwindcss/line-clamp, INTE autoprefixer, devtools är devDep!)
- vite.config.ts (med @/ alias)
- tsconfig.json (med paths)
- postcss.config.js (Tailwind v4: {'@tailwindcss/postcss': {}})
- src/index.css (RGB design tokens)
- src/lib/supabase.ts
- src/lib/utils.ts (cn helper)
- src/lib/queryKeys.ts
- src/lib/schemas.ts
- src/lib/constants.ts
- src/types/database.ts
VERIFIERING: npm run dev + npx tsc --noEmit

## FAS 2: AUTH + LAYOUT
- src/contexts/AuthContext.tsx
- src/components/ui/Button.tsx
- src/components/ui/Card.tsx
- src/components/ui/Input.tsx
- src/components/ui/Textarea.tsx
- src/components/ui/Select.tsx
- src/components/ui/Badge.tsx
- src/components/ui/Switch.tsx (Radix wrapper!)
- src/components/ui/Dialog.tsx
- src/components/ui/Avatar.tsx
- src/components/ui/ProgressBar.tsx
- src/components/ui/SearchInput.tsx
- src/components/shared/LoadingSpinner.tsx
- src/components/shared/EmptyState.tsx
- src/components/layout/Sidebar.tsx
- src/components/layout/Header.tsx
- src/components/layout/AppShell.tsx
- src/pages/LoginPage.tsx
- src/App.tsx (Router + QueryClient + Auth)
- src/main.tsx
VERIFIERING: npm run dev + npx tsc --noEmit

## FAS 3: KUNDER
- src/hooks/useCustomers.ts
- src/hooks/useAgreements.ts
- src/hooks/useCustomerNotes.ts
- src/features/customers/CustomerList.tsx
- src/features/customers/CustomerForm.tsx
- src/features/customers/CustomerDetail.tsx
- src/features/customers/CustomerTimeline.tsx
- src/features/customers/CustomerNotesTab.tsx
- src/features/customers/AgreementForm.tsx
- src/pages/CustomersPage.tsx
VERIFIERING: npm run dev + npx tsc --noEmit

## FAS 4: UPPDRAG + JOURNAL
- src/hooks/useAssignments.ts
- src/hooks/useJournalEntries.ts
- src/features/assignments/AssignmentList.tsx
- src/features/assignments/AssignmentForm.tsx
- src/features/assignments/AssignmentDetail.tsx
- src/features/assignments/JournalEditor.tsx (TIPTAP!)
- src/features/assignments/JournalTimeline.tsx
- src/pages/AssignmentsPage.tsx
VERIFIERING: npm run dev + npx tsc --noEmit

## FAS 5: FAKTURERING
- src/lib/billing-logic.ts (med split!)
- src/hooks/useTimeEntries.ts
- src/hooks/useBillingBatches.ts
- src/features/billing/TimebankWidget.tsx
- src/features/billing/BillingPipeline.tsx
- src/features/billing/BillingDetail.tsx
- src/features/billing/ExportDialog.tsx
- src/pages/BillingPage.tsx
VERIFIERING: npm run dev + npx tsc --noEmit

## FAS 6: DASHBOARD + TASKS
- src/hooks/useTasks.ts
- src/features/tasks/TaskList.tsx
- src/features/tasks/TaskForm.tsx
- src/features/dashboard/KPICards.tsx
- src/features/dashboard/ActivityFeed.tsx
- src/features/dashboard/TaskWidget.tsx
- src/features/dashboard/IndexationAlert.tsx
- src/features/dashboard/DashboardView.tsx
- src/pages/DashboardPage.tsx
- src/pages/TasksPage.tsx
VERIFIERING: npm run dev + npx tsc --noEmit

## FAS 7: KONTAKTER + KUNSKAPSBANK + PROFIL
- src/hooks/useContacts.ts
- src/hooks/useKnowledge.ts
- src/hooks/useProfile.ts
- src/features/contacts/ContactList.tsx
- src/features/contacts/ContactForm.tsx
- src/features/knowledge/KnowledgeList.tsx (buttons, INTE Radix Tabs!)
- src/features/knowledge/ArticleView.tsx
- src/features/knowledge/ArticleEditor.tsx
- src/features/profile/ProfilePage.tsx (useEffect för form sync!)
- src/pages/ContactsPage.tsx
- src/pages/KnowledgePage.tsx
- src/pages/ProfilePage.tsx
- src/pages/NotesPage.tsx
VERIFIERING: npm run dev + npx tsc --noEmit

## ESCAPE HATCH (OM DU FASTNAR)
Om du försökt fixa samma fel i 3+ iterationer:
1. Skriv en fil: STUCK_REPORT.md med:
   - Vilket fel som uppstår
   - Vad du försökt
   - Var felet finns
2. Fortsätt med nästa fil/fas om möjligt
3. Återkom till problemet senare

## SLUTVERIFIERING
Innan du säger dig klar:
1. Alla filer i FAS 1-7 finns
2. npm run dev startar utan fel
3. npx tsc --noEmit ger 0 errors
4. Kontrollera att alla routes finns i App.tsx

## NÄR ALLT ÄR KLART
Output EXAKT denna text (inget annat):
<promise>GRANNFRID_COMPLETE</promise>
" --completion-promise "GRANNFRID_COMPLETE" --max-iterations 150
```

### Steg 4: Övervaka (valfritt)

```bash
# I en annan terminal, följ output
tail -f ~/.claude/logs/ralph.log

# Eller kör /cancel-ralph om du behöver stoppa
/cancel-ralph
```

### När Ralph är klar
1. Verifiera att appen startar: `cd grannfrid-final && npm run dev`
2. Öppna http://localhost:5173
3. Testa login och navigation

---

## METOD B: SESSIONSBASERAD (6 Sessioner)

### SESSION 1: Foundation + Config
**Uppskattad tid:** 30-45 min
**Mål:** Projekt uppsatt med alla configs

```
Läs /Users/jonashalvarsson/Desktop/alla mina appar/GRANNFRID_FINAL_SPEC_V3.md

Initiera Vite React TypeScript-projekt i NUVARANDE MAPP (inte undermapp).

1. Kör: npm create vite@latest . -- --template react-ts (i nuvarande mapp)
2. (Stanna i samma mapp)
3. Installera ALLA dependencies enligt specen DEL 0 (SNABBSTART)
   - Inkludera TipTap: @tiptap/react @tiptap/pm @tiptap/starter-kit
   - DevDeps: tailwindcss @tailwindcss/postcss (INTE line-clamp - ingår i core!)
4. Skapa vite.config.ts med @/ alias enligt DEL 4
5. Uppdatera tsconfig.json med paths enligt DEL 4
6. Skapa postcss.config.js enligt DEL 3 (Tailwind v4: {'@tailwindcss/postcss': {}})
7. Ersätt src/index.css med Tailwind v4 config (@import "tailwindcss" + @theme {})
8. Skapa src/lib/supabase.ts
9. Skapa src/lib/utils.ts med cn() helper
10. Skapa src/lib/queryKeys.ts enligt DEL 0.3
11. Skapa src/lib/schemas.ts enligt DEL 0.4
12. Skapa src/lib/constants.ts enligt DEL 10
13. Skapa src/types/database.ts enligt DEL 6

Kör: npm run dev
Fixa eventuella fel.
```

**Verifikation:**
- [ ] `npm run dev` startar utan fel
- [ ] `npx tsc --noEmit` ger inga typfel
- [ ] Tailwind fungerar (testa med en enkel className)

---

### SESSION 2: Auth + Layout + UI-komponenter
**Uppskattad tid:** 45-60 min
**Mål:** Inloggning och grundläggande navigation

```
Fortsätt i grannfrid-final.

1. Skapa src/contexts/AuthContext.tsx med:
   - AuthProvider component
   - useAuth hook
   - login, logout, signUp funktioner
   - Session-hantering

2. Skapa UI-komponenter i src/components/ui/:
   - Button.tsx (enligt specen)
   - Card.tsx (CardHeader, CardTitle, CardContent)
   - Input.tsx
   - Textarea.tsx
   - Select.tsx
   - Badge.tsx
   - Switch.tsx (Radix wrapper enligt DEL 8.1)
   - Dialog.tsx
   - Tabs.tsx
   - Avatar.tsx
   - ProgressBar.tsx
   - SearchInput.tsx
   - ConfirmDialog.tsx
   - AlertBanner.tsx

3. Skapa src/components/shared/:
   - LoadingSpinner.tsx
   - EmptyState.tsx
   - ErrorBoundary.tsx

4. Skapa src/components/layout/:
   - Sidebar.tsx (navigation med lucide-react ikoner)
   - Header.tsx (med profil-dropdown)
   - AppShell.tsx (kombinerar Sidebar + Header + main content)

5. Skapa src/pages/LoginPage.tsx

6. Uppdatera src/App.tsx:
   - BrowserRouter
   - QueryClientProvider
   - AuthProvider
   - Toaster (sonner)
   - Routes för alla pages

7. Uppdatera src/main.tsx

Kör: npm run dev
Testa att login-sidan visas.
```

**Verifikation:**
- [ ] Login-sida visas på /
- [ ] Kan logga in (kräver Supabase-setup)
- [ ] Efter login → AppShell med sidebar
- [ ] Sidebar-navigation fungerar

---

### SESSION 3: Kunder + Avtal
**Uppskattad tid:** 60-90 min
**Mål:** Full CRUD för kunder och avtal

```
Fortsätt i grannfrid-final.

1. Skapa hooks med React Query (använd queryKeys.ts):
   - src/hooks/useCustomers.ts (enligt DEL 9)
   - src/hooks/useAgreements.ts
   - src/hooks/useCustomerNotes.ts

2. Skapa src/features/customers/:
   - CustomerList.tsx
     - Tabell med kunder
     - Sök med SearchInput
     - Pagination (limit 20)
   - CustomerForm.tsx
     - Använd react-hook-form + Zod schema
     - Alla fält inkl. antal_lagenheter
   - CustomerDetail.tsx
     - Flikar: Översikt, Uppdrag, Kontakter, Ekonomi, Anteckningar
   - CustomerTimeline.tsx
     - Aggregerar journal, tasks, notes
   - CustomerNotesTab.tsx
     - Lista kundanteckningar
     - Skapa ny anteckning
   - AgreementForm.tsx
     - Dynamiska fält beroende på avtalstyp
     - Inkl. hourly_rate_evening

3. Skapa src/pages/CustomersPage.tsx

Kör: npm run dev
```

**Verifikation:**
- [ ] Kundlista visas
- [ ] Kan skapa ny kund
- [ ] Kundnummer auto-genereras (K-001)
- [ ] Kan lägga till avtal
- [ ] Kan se kunddetaljer med flikar

---

### SESSION 4: Uppdrag + Journal
**Uppskattad tid:** 60-90 min
**Mål:** Uppdragshantering med TipTap journal

```
Fortsätt i grannfrid-final.

1. Skapa hooks:
   - src/hooks/useAssignments.ts
   - src/hooks/useJournalEntries.ts

2. Skapa src/features/assignments/:
   - AssignmentList.tsx
     - Tabell med filter (status, prioritet, kund)
   - AssignmentForm.tsx
     - Välj kund från dropdown
     - Typ, kategori, prioritet
   - AssignmentDetail.tsx
     - Header med nummer, titel, status
     - Flikar: Journal, Uppgifter, Kontakter, Filer, Översikt
   - JournalEditor.tsx (VIKTIGT - enligt DEL 8.2)
     - TipTap editor
     - Timmar-input
     - Entry type dropdown
     - Extra billable switch
     - Billing comment (visas när hours > 0)
   - JournalTimeline.tsx
     - Grupperat per datum
     - Pinnade överst
     - Arkiverade döljs (men kan visas)

3. Skapa src/pages/AssignmentsPage.tsx

Kör: npm run dev
Testa att skapa uppdrag och journalanteckning.
```

**Verifikation:**
- [ ] Kan skapa uppdrag
- [ ] Uppdragsnummer auto-genereras (C-001, P-001)
- [ ] TipTap editor fungerar
- [ ] Kan spara journalanteckning med timmar
- [ ] Journal visas i timeline

---

### SESSION 5: Fakturering + Timbank
**Uppskattad tid:** 60-90 min
**Mål:** Faktureringspipeline med timbank-logik

```
Fortsätt i grannfrid-final.

1. Skapa src/lib/billing-logic.ts enligt DEL 7:
   - calculateTimebankStatus()
   - timebankStatusFromView()
   - calculateBillingWithSplit() (VIKTIGT: hanterar split)
   - checkIndexationAlerts()

2. Skapa hooks:
   - src/hooks/useTimeEntries.ts
   - src/hooks/useBillingBatches.ts

3. UPPDATERA JournalEditor.tsx:
   - När journal sparas med timmar → skapa time_entry
   - Använd calculateBillingWithSplit() för att avgöra billing_type
   - Hantera split (skapa 2 entries om gräns passeras)

4. Skapa src/features/billing/:
   - TimebankWidget.tsx
     - ProgressBar
     - Visa "55/100 timmar"
     - Färgkod baserat på procent
   - BillingPipeline.tsx
     - Lista kunder med öppet underlag
     - Klicka för detaljer
   - BillingDetail.tsx
     - Tabell med fakturarader
     - Redigera/ta bort rad
   - ExportDialog.tsx
     - CSV-export
     - Markera som exporterad

5. Skapa src/pages/BillingPage.tsx

Kör: npm run dev
```

**Verifikation:**
- [ ] Journaltimmar skapar time_entries
- [ ] billing_type sätts korrekt
- [ ] Timbank-kund visar progress bar
- [ ] Split fungerar (del timebank, del overtime)
- [ ] Kan exportera till CSV

---

### SESSION 6: Dashboard + Tasks + Övrigt
**Uppskattad tid:** 60-90 min
**Mål:** Komplett MVP

```
Fortsätt i grannfrid-final.

1. Skapa hooks:
   - src/hooks/useTasks.ts
   - src/hooks/useContacts.ts
   - src/hooks/useKnowledge.ts
   - src/hooks/useProfile.ts

2. Skapa src/features/tasks/:
   - TaskList.tsx (gruppering: Försenade, Idag, Vecka, Senare)
   - TaskForm.tsx

3. Skapa src/features/dashboard/:
   - KPICards.tsx (4 kort)
   - ActivityFeed.tsx
   - TaskWidget.tsx
   - IndexationAlert.tsx (DEL 9 i specen)
   - DashboardView.tsx

4. Skapa src/features/contacts/:
   - ContactList.tsx
   - ContactForm.tsx

5. Skapa src/features/knowledge/:
   - KnowledgeList.tsx (UTAN Radix Tabs-bug, enligt DEL 8.4)
   - ArticleView.tsx
   - ArticleEditor.tsx

6. Skapa src/features/profile/:
   - ProfilePage.tsx (MED useEffect fix, enligt DEL 8.3)

7. Skapa pages:
   - src/pages/DashboardPage.tsx
   - src/pages/TasksPage.tsx
   - src/pages/ContactsPage.tsx
   - src/pages/KnowledgePage.tsx
   - src/pages/ProfilePage.tsx
   - src/pages/NotesPage.tsx

8. POLISH:
   - Loading states överallt
   - Empty states
   - Error boundaries
   - Kontrollera alla routes i App.tsx

Kör: npm run dev
Testa hela flödet end-to-end.
```

**Verifikation:**
- [ ] Dashboard visar KPI:er
- [ ] IndexationAlert visas om <7 dagar
- [ ] Tasks grupperas korrekt
- [ ] Profil kan redigeras
- [ ] Kunskapsbank fungerar
- [ ] Hela flödet: Login → Dashboard → Kund → Uppdrag → Journal → Faktura

---

## METOD C: EN ENDA STOR PROMPT

**Varning:** Riskabelt men kan fungera med V3-specen.

```
Läs /Users/jonashalvarsson/Desktop/alla mina appar/GRANNFRID_FINAL_SPEC_V3.md

Bygg HELA Grannfrid-appen i mappen "grannfrid-final".

Följ specen EXAKT. Bygg i denna ordning:
1. Skapa projekt + installera ALLA dependencies (inkl. TipTap)
2. Konfigurera vite.config.ts, tsconfig.json, tailwind.config.js
3. Skapa index.css med RGB design tokens
4. Skapa alla lib/ filer (supabase, utils, queryKeys, schemas, constants, billing-logic)
5. Skapa types/database.ts
6. Skapa AuthContext
7. Skapa alla UI-komponenter (inkl. Switch wrapper)
8. Skapa AppShell + Sidebar + Header
9. Skapa alla hooks (med React Query + queryKeys)
10. Skapa alla features (customers, assignments, billing, tasks, dashboard, contacts, knowledge, profile)
11. Skapa alla pages
12. Konfigurera routing i App.tsx

VIKTIGT:
- Använd RGB-färger för Tailwind alpha (bg-sage/10)
- JournalEditor MÅSTE använda TipTap
- ProfilePage MÅSTE ha useEffect för form-sync
- KnowledgeList får INTE använda Radix Tabs fel
- Billing-logic MÅSTE hantera split

Kör "npm run dev" efter varje stor del och fixa fel.
```

---

## FÖRE BYGGSTART: CHECKLISTA

### 1. Supabase Setup
- [ ] Skapa Supabase-projekt på https://supabase.com
- [ ] Kör SQL-schemat från GRANNFRID_FINAL_SPEC_V3.md (DEL 5)
- [ ] Aktivera Email Auth i Authentication → Providers
- [ ] Kopiera Project URL och anon key

### 2. Miljövariabler
```bash
# Skapa .env i grannfrid-final/
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Git Setup (rekommenderat)
```bash
cd /Users/jonashalvarsson/Desktop/alla\ mina\ appar/grannfrid-final
git init
git add .
git commit -m "Initial setup"
```

---

## EFTER BYGGSTART: FELSÖKNING

### Vanliga fel och lösningar

**"Cannot find module '@/...'"**
- Kontrollera vite.config.ts har alias
- Kontrollera tsconfig.json har paths

**"bg-sage/10 fungerar inte"**
- Kontrollera att CSS-variabler är i RGB-format (135 169 107)
- Kontrollera tailwind.config.js använder `rgb(var(--sage) / <alpha-value>)`

**"Switch fungerar inte"**
- Använd vår egen Switch.tsx wrapper, inte direkt från @radix-ui

**"Profil visar tomma fält"**
- Kontrollera att useEffect synkar form med profile data

**TypeScript-fel**
- Kör `npx tsc --noEmit` för att se alla fel
- Fixa ett i taget

**Supabase RLS-fel**
- Kontrollera att du är inloggad
- Kontrollera att policies har WITH CHECK

---

## EFTER APPEN ÄR BYGGD

### Deploy till Vercel
```bash
npm install -g vercel
cd grannfrid-final
vercel
```

### Konfigurera Supabase Auth
1. Supabase Dashboard → Authentication → URL Configuration
2. Lägg till din Vercel-URL som Site URL
3. Lägg till callback URL: `https://your-app.vercel.app/auth/callback`

### Skapa testdata
1. Skapa 3-5 kunder med olika avtalstyper
2. Skapa 10+ uppdrag
3. Lägg till journalanteckningar med timmar
4. Testa faktureringspipelinen

---

## FRAMTIDA FÖRBÄTTRINGAR (Post-MVP)

1. **AI-rensning av anteckningar** - Gemini Flash
2. **AI-genererad faktureringskommentar**
3. **Cmd+K Command Palette**
4. **Snabbanteckningar (Quick Notes)**
5. **Dark mode**
6. **Fortnox-integration**
7. **Real-time updates** (Supabase subscriptions)
8. **Offline support** (PWA)

---

Lycka till med byggandet! 🚀
