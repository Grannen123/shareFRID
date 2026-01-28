# Arkitektur - Grannfrid App

## Översikt

Grannfrid 2.0 är en CRM/produktivitetsapp för bostadskonsulter. Appen hjälper konsulter att hantera störningsärenden, andrahandsuthyrning och liknande ärenden för BRF:er.

## Tech Stack

| Lager         | Teknologi                 | Version         |
| ------------- | ------------------------- | --------------- |
| Frontend      | React                     | 18.3.1          |
| Språk         | TypeScript                | 5.9.3           |
| Byggverktyg   | Vite                      | 7.3.1           |
| Styling       | Tailwind CSS              | 4.x (CSS-first) |
| State         | TanStack React Query      | 5.x             |
| Forms         | React Hook Form + Zod     | -               |
| Routing       | React Router              | 6.x             |
| UI Components | Radix UI                  | -               |
| Icons         | Lucide React              | -               |
| Toasts        | Sonner                    | -               |
| Rich Text     | Plain text                | -               |
| Backend       | Supabase                  | -               |
| Database      | PostgreSQL (via Supabase) | -               |
| Auth          | Supabase Auth             | -               |

## Mappstruktur

```
src/
├── components/
│   ├── layout/          # AppShell, Sidebar, Header
│   ├── shared/          # LoadingSpinner, EmptyState, ErrorState
│   └── ui/              # Primitiva UI-komponenter (Button, Card, etc.)
├── contexts/
│   └── AuthContext.tsx  # Autentisering och användarhantering
├── features/            # Domänspecifika komponenter
│   ├── assignments/     # Uppdragshantering
│   ├── billing/         # Fakturering
│   ├── contacts/        # Kontakthantering
│   ├── customers/       # Kundhantering
│   ├── dashboard/       # Dashboard widgets
│   ├── files/           # Filhantering (kund/uppdrag)
│   ├── knowledge/       # Kunskapsbank
│   ├── profile/         # Användarprofil
│   └── tasks/           # Uppgiftshantering
├── hooks/               # React Query hooks
│   ├── useAgreements.ts
│   ├── useAssignments.ts
│   ├── useBilling.ts
│   ├── useContacts.ts
│   ├── useCustomerNotes.ts
│   ├── useCustomerTimeline.ts
│   ├── useCustomers.ts
│   ├── useDashboard.ts
│   ├── useFiles.ts
│   ├── useJournal.ts
│   ├── useKnowledge.ts
│   ├── useNotes.ts
│   ├── useProfile.ts
│   ├── useTasks.ts
│   ├── useTimebank.ts
│   └── useTimeEntries.ts
├── lib/
│   ├── billing-logic.ts # Timbank-beräkningar
│   ├── constants.ts     # Svenska labels och konstanter
│   ├── queryKeys.ts     # React Query cache keys
│   ├── schemas.ts       # Zod validering
│   └── supabase.ts      # Supabase-klient (singleton)
├── pages/               # Route-komponenter
│   ├── AssignmentsPage.tsx
│   ├── BillingPage.tsx
│   ├── ContactsPage.tsx
│   ├── CustomersPage.tsx
│   ├── DashboardPage.tsx
│   ├── KnowledgePage.tsx
│   ├── LoginPage.tsx
│   ├── NotesPage.tsx
│   ├── ProfilePage.tsx
│   └── TasksPage.tsx
├── types/
│   └── database.ts      # TypeScript typer för databas
├── App.tsx              # Huvudkomponent med routing
├── main.tsx             # Entry point med providers
└── index.css            # Tailwind + custom CSS
```

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   UI Layer  │ ──> │  React Query │ ──> │  Supabase   │
│ (Components)│ <── │    Hooks     │ <── │  (Backend)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │                    │
       │                   │                    │
       ▼                   ▼                    ▼
  ┌─────────┐       ┌──────────┐        ┌──────────┐
  │ Zod     │       │ Query    │        │ RLS      │
  │ Schemas │       │ Keys     │        │ Policies │
  └─────────┘       └──────────┘        └──────────┘
```

## Viktiga Patterns

### 1. React Query med Timeout

Alla Supabase-queries wrappas med `withTimeout()` för att förhindra oändlig laddning. När det är möjligt avbryts även requesten med `abortSignal()`:

```typescript
import { supabase, withTimeout } from "@/lib/supabase";

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const { data, error } = await withTimeout(
        supabase.from("customers").select("*"),
        10000, // 10s timeout
      );
      if (error) throw error;
      return data;
    },
  });
}
```

### 2. Supabase Singleton

En enda Supabase-instans används globalt för att undvika auth-konflikter:

```typescript
const globalScope = globalThis as { __supabase?: SupabaseClient };
const supabaseClient = globalScope.__supabase ?? createClient(...);
if (!globalScope.__supabase) {
  globalScope.__supabase = supabaseClient;
}
export const supabase = supabaseClient;
```

### 3. Auth med Timeout

AuthContext har timeouts för att säkerställa att UI:t inte blockeras:

```typescript
// 5s timeout på getSession()
const timeoutId = setTimeout(() => {
  console.warn("Auth initialization timeout");
  setIsLoading(false);
}, 5000);

// 3s timeout på signOut()
await Promise.race([
  supabase.auth.signOut(),
  new Promise((_, reject) => setTimeout(() => reject(), 3000)),
]);
```

### 4. Error States

Komponenter hanterar fel med återanvändbar ErrorState:

```typescript
if (error) {
  return (
    <ErrorState
      title="Kunde inte hämta data"
      message={error.message}
      onRetry={() => refetch()}
      isRetrying={isRefetching}
    />
  );
}
```

## Affärslogik

### Avtalstyper

1. **Löpande (hourly)** - Alla timmar faktureras direkt
2. **Timbank (timebank)** - X timmar ingår, sedan övertid
3. **Fastpris (fixed)** - Fast månadsbelopp

### Timbank-split

När en tidrapport överskrider timbanken:

- Del 1: Resterande timbank-timmar (`billing_type='timebank'`)
- Del 2: Övertidstimmar (`billing_type='overtime'`)

### Workspace-modell

- Single-tenant med workspace som geografisk indelning (Göteborg/Stockholm)
- RLS filtrerar på `auth.uid()`, inte workspace
- Full transparens - alla ser all data

### GDPR-radering

- Journalposter och uppdrag kan raderas vid behov.
- Radering ska även ta bort kopplade filer i Storage.
