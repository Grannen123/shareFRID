# Grannfrid 2.0 - Final Review Request

**Kontext:** Vi ska bygga en React-app med Claude Code. Supabase-databasen är redan uppsatt. Vänligen granska dokumentationen nedan och identifiera eventuella problem, inkonsekvenser eller förbättringar INNAN vi startar bygget.

---

## STATUS

| Komponent                          | Status                           |
| ---------------------------------- | -------------------------------- |
| Supabase-projekt                   | ✅ Skapat                        |
| 15 tabeller + 1 view               | ✅ Skapade                       |
| RLS policies                       | ✅ Aktiverade                    |
| Sequences (K-001, C-001, P-001)    | ✅ Skapade                       |
| Triggers (auto-nummer, updated_at) | ✅ Skapade                       |
| Testanvändare                      | ✅ test@grannfrid.se / Test1234! |
| .env-fil                           | ✅ Sparad                        |

---

## FIL 1: CLAUDE.md (Projektregler för AI)

````markdown
# Grannfrid App - Claude Code Instructions

## Projekt

**Grannfrid 2.0** - CRM/produktivitetsapp för bostadskonsulter (Grannfrid AB)
**Språk:** Svenska (UI och kod-kommentarer)
**Målgrupp:** Konsulter som hanterar störningsärenden, andrahandsuthyrning etc. för BRF:er

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **State:** TanStack React Query v5
- **Forms:** React Hook Form + Zod
- **Rich Text:** TipTap
- **UI:** Radix UI primitives + Tailwind CSS
- **Icons:** Lucide React
- **Toasts:** Sonner

## Kritiska Regler

### Tailwind + Färger

```css
/* RÄTT - RGB-format i CSS */
--sage: 135 169 107;

/* RÄTT - i tailwind.config.js */
sage: "rgb(var(--sage) / <alpha-value>)" /* Då fungerar detta: */ className=
  "bg-sage/10 text-sage";
```
````

### React Query

- **ALLTID** använd `queryKeys.ts` för cache-keys
- **ALLTID** invalidera queries vid mutations

### Formulär

- **ALLTID** använd Zod schemas från `src/lib/schemas.ts`
- **ALLTID** använd `react-hook-form` med `@hookform/resolvers/zod`

### Journal Entries

- **ALDRIG** delete - använd `is_archived = true`
- **ALLTID** skapa `time_entry` när `hours > 0`
- **HANTERA** split när timbank överskrids (två entries)

### Komponenter

- `Switch.tsx` - använd vår Radix wrapper, inte direkt import
- `ProfilePage.tsx` - MÅSTE ha useEffect för form-sync
- `KnowledgeList.tsx` - använd button-filter, INTE Radix Tabs

## Affärslogik

### Avtalstyper

1. **Löpande (hourly)** - Alla timmar faktureras direkt
2. **Timbank (timebank)** - X timmar ingår, sedan övertid
3. **Fastpris (fixed)** - Fast månadsbelopp, timmar = statistik

### Timbank-split

```typescript
// Om 3h kvar i timbank och 5h registreras:
// → Skapa 2 time_entries:
//   1. 3h med billing_type='timebank'
//   2. 2h med billing_type='overtime'
```

## Known Gotchas

1. **Tailwind alpha MÅSTE ha RGB-format** - `135 169 107` inte `#87a96b`
2. **line-clamp kräver plugin** - `@tailwindcss/line-clamp` som devDependency
3. **ESM i tailwind.config** - Använd `export default`, inte `module.exports`
4. **Switch wrapper** - Radix Switch har dålig UX, använd vår wrapper
5. **ProfilePage useEffect** - Form måste synkas med server-data via useEffect
6. **KnowledgeList** - Implementera INTE med Radix Tabs (bug), använd buttons
7. **RLS WITH CHECK** - INSERT/UPDATE policies MÅSTE ha WITH CHECK-klausul
8. **Sequences för nummer** - Använd PostgreSQL sequences för K-001, C-001 etc.

````

---

## FIL 2: BYGGPLAN (7 Faser)

### FAS 1: FOUNDATION
- package.json (npm create vite@latest . -- --template react-ts)
- Dependencies: react-router-dom @tanstack/react-query @tanstack/react-query-devtools @supabase/supabase-js react-hook-form @hookform/resolvers zod @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-avatar @radix-ui/react-progress @tiptap/react @tiptap/pm @tiptap/starter-kit lucide-react sonner clsx tailwind-merge date-fns
- DevDeps: tailwindcss postcss autoprefixer @tailwindcss/line-clamp @types/react @types/react-dom
- vite.config.ts (med @/ alias)
- tsconfig.json (med paths)
- tailwind.config.js (ESM, RGB-färger)
- postcss.config.js
- src/index.css (RGB design tokens)
- src/lib/supabase.ts
- src/lib/utils.ts (cn helper)
- src/lib/queryKeys.ts
- src/lib/schemas.ts
- src/lib/constants.ts
- src/types/database.ts

**VERIFIERING:** npm run dev + npx tsc --noEmit

### FAS 2: AUTH + LAYOUT
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

**VERIFIERING:** npm run dev + npx tsc --noEmit

### FAS 3: KUNDER
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

**VERIFIERING:** npm run dev + npx tsc --noEmit

### FAS 4: UPPDRAG + JOURNAL
- src/hooks/useAssignments.ts
- src/hooks/useJournalEntries.ts
- src/features/assignments/AssignmentList.tsx
- src/features/assignments/AssignmentForm.tsx
- src/features/assignments/AssignmentDetail.tsx
- src/features/assignments/JournalEditor.tsx (TIPTAP!)
- src/features/assignments/JournalTimeline.tsx
- src/pages/AssignmentsPage.tsx

**VERIFIERING:** npm run dev + npx tsc --noEmit

### FAS 5: FAKTURERING
- src/lib/billing-logic.ts (med split!)
- src/hooks/useTimeEntries.ts
- src/hooks/useBillingBatches.ts
- src/features/billing/TimebankWidget.tsx
- src/features/billing/BillingPipeline.tsx
- src/features/billing/BillingDetail.tsx
- src/features/billing/ExportDialog.tsx
- src/pages/BillingPage.tsx

**VERIFIERING:** npm run dev + npx tsc --noEmit

### FAS 6: DASHBOARD + TASKS
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

**VERIFIERING:** npm run dev + npx tsc --noEmit

### FAS 7: KONTAKTER + KUNSKAPSBANK + PROFIL
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

**VERIFIERING:** npm run dev + npx tsc --noEmit

---

## FIL 3: DATABASSCHEMA (Redan i Supabase)

### Tabeller
1. **workspaces** - Göteborg, Stockholm
2. **profiles** - Användarprofiler (auto-skapas vid signup)
3. **customers** - Kunder med auto-nummer K-001
4. **customer_notes** - Kundanteckningar
5. **agreements** - Avtal (hourly/timebank/fixed)
6. **assignments** - Uppdrag med auto-nummer C-001/P-001
7. **journal_entries** - Journalanteckningar (soft delete)
8. **time_entries** - Tidsregistreringar
9. **tasks** - Uppgifter
10. **contacts** - Kontakter
11. **quick_notes** - Snabbanteckningar
12. **files** - Filmetadata
13. **billing_batches** - Faktureringsbatcher
14. **knowledge_articles** - Kunskapsbank
15. **activity_log** - Aktivitetslogg

### View
- **timebank_current_status** - Realtidsberäkning av timbank

### Sequences
- customer_number_seq → K-001, K-002...
- assignment_case_seq → C-001, C-002...
- assignment_project_seq → P-001, P-002...

### RLS
- Alla tabeller har RLS aktiverat
- Policies med WITH CHECK för INSERT/UPDATE
- auth.uid() krävs för all access

---

## FIL 4: KRITISKA KODSNUTTAR

### queryKeys.ts
```typescript
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    detail: (id: string) => ['customers', id] as const,
    byWorkspace: (wsId: string) => ['customers', 'workspace', wsId] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    detail: (id: string) => ['assignments', id] as const,
    byCustomer: (customerId: string) => ['assignments', 'customer', customerId] as const,
  },
  journal: {
    byAssignment: (assignmentId: string) => ['journal', assignmentId] as const,
  },
  timeEntries: {
    all: ['timeEntries'] as const,
    byCustomer: (customerId: string) => ['timeEntries', 'customer', customerId] as const,
    byPeriod: (year: number, month: number) => ['timeEntries', 'period', year, month] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    byAssignee: (userId: string) => ['tasks', 'assignee', userId] as const,
  },
  agreements: {
    all: ['agreements'] as const,
    byCustomer: (customerId: string) => ['agreements', 'customer', customerId] as const,
    withIndexation: ['agreements', 'indexation'] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    byCustomer: (customerId: string) => ['contacts', 'customer', customerId] as const,
  },
  knowledge: {
    all: ['knowledge'] as const,
    byCategory: (category: string) => ['knowledge', 'category', category] as const,
  },
  profile: {
    current: ['profile', 'current'] as const,
  },
  customerNotes: {
    byCustomer: (customerId: string) => ['customerNotes', customerId] as const,
  },
} as const;
````

### Billing Split Logic

```typescript
export function calculateBillingWithSplit(
  hoursToAdd: number,
  agreement: Agreement,
  currentUsed: number,
): BillingSplitResult {
  if (agreement.type !== "timebank") {
    return {
      entries: [
        {
          hours: hoursToAdd,
          billingType: agreement.type === "fixed" ? "fixed" : "hourly",
        },
      ],
      newTimebankUsed: currentUsed,
    };
  }

  const includedHours = agreement.included_hours || 0;
  const remaining = Math.max(0, includedHours - currentUsed);

  if (hoursToAdd <= remaining) {
    return {
      entries: [{ hours: hoursToAdd, billingType: "timebank" }],
      newTimebankUsed: currentUsed + hoursToAdd,
    };
  }

  // SPLIT: del timebank, del overtime
  const entries = [];
  if (remaining > 0) {
    entries.push({ hours: remaining, billingType: "timebank" as const });
  }
  const overtime = hoursToAdd - remaining;
  if (overtime > 0) {
    entries.push({ hours: overtime, billingType: "overtime" as const });
  }

  return {
    entries,
    newTimebankUsed: includedHours,
  };
}
```

### Switch Wrapper (Radix fix)

```typescript
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-sage' : 'bg-sand',
        className
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg',
          'ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  );
}
```

### ProfilePage useEffect fix

```typescript
const { data: profile } = useProfile();
const form = useForm<ProfileFormData>({
  resolver: zodResolver(profileSchema),
  defaultValues: { name: "", phone: "", title: "" },
});

// KRITISKT: Synka form när profile laddas
useEffect(() => {
  if (profile) {
    form.reset({
      name: profile.name || "",
      phone: profile.phone || "",
      title: profile.title || "",
      default_hourly_rate: profile.default_hourly_rate || undefined,
      notifications_enabled: profile.notifications_enabled ?? true,
      email_notifications: profile.email_notifications ?? true,
    });
  }
}, [profile, form]);
```

---

## FRÅGOR TILL CHATGPT

1. **Ser du några inkonsekvenser** mellan CLAUDE.md, byggplanen och databasschemat?

2. **Saknas något kritiskt** som kommer orsaka byggfel?

3. **Är fasindelningen logisk?** Kommer beroenden mellan filer att fungera?

4. **React Query v5 syntax** - Är queryKeys-mönstret korrekt för v5?

5. **Tailwind v4 kompatibilitet** - Behövs några justeringar för senaste Tailwind?

6. **TipTap setup** - Är dependencies korrekta för TipTap v2?

7. **Supabase Auth flow** - Ser AuthContext-strukturen rimlig ut?

8. **Timbank split-logik** - Är algoritmen korrekt?

9. **Övriga förbättringar** innan vi startar bygget?

---

**Svara konkret med:**

- 🔴 KRITISKT (måste fixas innan bygge)
- 🟡 VIKTIGT (bör fixas)
- 🟢 FÖRSLAG (nice to have)
