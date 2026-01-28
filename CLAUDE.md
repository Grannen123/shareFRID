# Grannfrid App

> CRM för bostadskonsulter. Svenska UI. Se `docs/SPEC.md` för fullständig spec.

## Quick Start

```bash
npm run dev        # Starta på port 5173
npm run build      # Produktionsbygge
npx tsc --noEmit   # Typkontroll
```

**Testanvändare:** `test@grannfrid.se` / `Test1234!`

## Tech Stack

React 18 · TypeScript · Vite · Supabase · TanStack Query v5 · Tailwind v4 · Radix UI · Zod

## Projektstruktur

```
src/
├── components/ui/     # Primitiva komponenter
├── features/          # Domän-komponenter per feature
├── hooks/             # React Query hooks (useCustomers, etc.)
├── lib/
│   ├── queryKeys.ts   # Cache-nycklar (KRITISKT!)
│   ├── schemas.ts     # Zod validering
│   ├── supabase.ts    # Client + withTimeout()
│   └── billing-logic.ts
├── pages/             # Route-komponenter
└── contexts/          # AuthContext
```

## Dokumentation

| Fil                    | Syfte                |
| ---------------------- | -------------------- |
| `docs/SPEC.md`         | Kanonisk produktspec |
| `docs/ARCHITECTURE.md` | Teknisk arkitektur   |
| `docs/CHANGELOG.md`    | Ändringslogg         |
| `docs/TODO.md`         | Planerade uppgifter  |

## Kritiska Regler

### 1. Supabase Timeout (OBLIGATORISKT)

```typescript
// RÄTT - alla queries MÅSTE ha timeout
const { data, error } = await withTimeout(
  supabase.from("customers").select("*"),
);

// FEL - kan hänga oändligt
const { data } = await supabase.from("customers").select("*");
```

### 2. React Query v5 Syntax

```typescript
// RÄTT - object signature
useQuery({ queryKey: queryKeys.customers.all, queryFn: ... })
useMutation({ mutationFn: ..., onSuccess: ... })

// FEL - v4 syntax fungerar INTE
useQuery(['customers'], fetchFn)
```

### 3. QueryKeys

Använd ALLTID `src/lib/queryKeys.ts` för cache-nycklar:

```typescript
queryKeys.customers.all;
queryKeys.customers.detail(id);
queryKeys.assignments.byCustomer(customerId);
```

### 4. Felhantering

```typescript
mutationFn: async (data) => {
  const { error } = await withTimeout(supabase.from('x').insert(data));
  if (error) throw error; // ALDRIG tysta bort!
},
onError: (e) => toast.error('Fel: ' + e.message),
onSuccess: () => {
  toast.success('Sparat!');
  queryClient.invalidateQueries({ queryKey: ... });
}
```

### 5. Tailwind Färger (RGB-format)

```css
--sage: 135 169 107; /* RÄTT */
--sage: #87a96b; /* FEL - alpha fungerar inte */
```

## Affärslogik

### Avtalstyper

- **hourly** - Alla timmar faktureras direkt
- **timebank** - X timmar ingår, sedan övertid
- **fixed** - Fast belopp, timmar för statistik

### Timbank-split

När journalpost överskrider timbanken → skapa 2 time_entries:

1. Resterande timbank-timmar (`billing_type='timebank'`)
2. Övertidstimmar (`billing_type='overtime'`)

Se `src/lib/billing-logic.ts` för implementation.

## Known Gotchas

1. **AuthContext** - `getSession()` MÅSTE anropas vid mount (annars loggas ut vid refresh)
2. **Supabase singleton** - Använd `globalThis.__supabase` för att undvika "Multiple GoTrueClient"
3. **withTimeout()** - Obligatorisk på ALLA Supabase-anrop
4. **React Query v5** - Object signature, INTE array syntax
5. **Tailwind v4** - CSS-first config via `@theme {}` i CSS
6. **Switch.tsx** - Använd vår wrapper, inte Radix direkt
7. **KnowledgeList** - Använd buttons, INTE Radix Tabs

## Sessionsrutin

### Efter kodändring

1. Uppdatera `docs/CHANGELOG.md`
2. Uppdatera `docs/TODO.md` vid nya/avklarade tasks
3. Uppdatera `docs/KNOWN_ISSUES.md` vid buggar

### Innan session avslutas

```
[ ] CHANGELOG.md uppdaterad
[ ] TODO.md uppdaterad
[ ] SESSION_LOG.md uppdaterad
```

## Supabase

- RLS aktiverat på alla tabeller
- Policies kräver `auth.uid() IS NOT NULL`
- Kundnummer: K-001 (sequence)
- Ärendenummer: C-001 / P-001 (sequences)

## Vid Problem

1. **Typfel** → `npx tsc --noEmit`
2. **Import @/** → Kolla `vite.config.ts`
3. **Tailwind-färg** → RGB-format i CSS
4. **RLS-fel** → Kontrollera inloggning
5. **Cache-fel** → Invalidera rätt queryKey
