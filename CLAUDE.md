# Grannfrid App - Claude Code Instructions

## Projekt
**Grannfrid 2.0** - CRM/produktivitetsapp för bostadskonsulter (Grannfrid AB)
**Språk:** Svenska (UI och kod-kommentarer)
**Målgrupp:** Konsulter som hanterar störningsärenden, andrahandsuthyrning etc. för BRF:er

---

## Projektmapp (KRITISKT!)

```
ABSOLUT SÖKVÄG: /Users/jonashalvarsson/Desktop/alla mina appar
BYGG HÄR - skapa INTE undermappar!

Kommando: npm create vite@latest . -- --template react-ts
(notera punkten = nuvarande mapp)
```

---

## Viktiga Filer

| Fil | Beskrivning |
|-----|-------------|
| `GRANNFRID_FINAL_SPEC_V3.md` | **Huvudspecifikation** - läs denna för all kod |
| `CLAUDE_CODE_BYGGPLAN_V2.md` | Byggplan med Ralph Wiggum-instruktioner |
| `src/` | Källkod för appen (byggs i samma mapp) |

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **State:** TanStack React Query v5 (object signature!)
- **Forms:** React Hook Form + Zod
- **Rich Text:** TipTap v2
- **UI:** Radix UI primitives + Tailwind CSS v4 (CSS-first config)
- **Icons:** Lucide React
- **Toasts:** Sonner

---

## Kritiska Regler

### Tailwind + Färger
```css
/* RÄTT - RGB-format i CSS */
--sage: 135 169 107;

/* RÄTT - i tailwind.config.js */
sage: 'rgb(var(--sage) / <alpha-value>)'

/* Då fungerar detta: */
className="bg-sage/10 text-sage"
```

### React Query v5
- **ALLTID** använd `queryKeys.ts` för cache-keys
- **ALLTID** invalidera queries vid mutations
- **VIKTIGT:** React Query v5 kräver **object signature**:
```typescript
// RÄTT (v5)
useQuery({ queryKey: [...], queryFn: async () => {...} })
useMutation({ mutationFn: async () => {...}, onSuccess: () => {...} })
queryClient.invalidateQueries({ queryKey: [...] })

// FEL (v4 syntax)
useQuery([...], async () => {...})  // FUNGERAR INTE I V5!
```
- Se `src/lib/queryKeys.ts` för factory pattern

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
- `KnowledgeList.tsx` - använd button-filter, INTE Radix Tabs (Radix Tabs är OK i andra komponenter)

### AuthContext (KRITISKT)
AuthContext MÅSTE implementera dessa tre funktioner korrekt:

```typescript
// 1. getSession() vid mount - hämta befintlig session
const { data: { session } } = await supabase.auth.getSession();

// 2. onAuthStateChange() - lyssna på auth-ändringar
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
});

// 3. Hämta profil från profiles-tabellen när user finns
if (user) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  setProfile(data);
}
```

**Vanligt fel:** Glömma `getSession()` → användare loggas ut vid page refresh.

### Felhantering (STANDARD)
```typescript
// ALLTID i mutations
mutationFn: async (data) => {
  const { data: result, error } = await supabase.from('x').insert(data);
  if (error) throw error;  // Kasta error, fånga INTE tyst!
  return result;
},
onError: (error) => {
  toast.error('Något gick fel: ' + error.message);
},
onSuccess: () => {
  toast.success('Sparat!');
  queryClient.invalidateQueries({ queryKey: [...] });
}
```

**Regler:**
- **ALDRIG** tysta bort errors med tomma catch-block
- **ALLTID** visa toast.error() vid fel
- **ALLTID** logga till console.error() i development

---

## Projektstruktur

```
alla mina appar/           # <- Projektrot
├── CLAUDE.md              # Denna fil
├── GRANNFRID_FINAL_SPEC_V3.md
├── CLAUDE_CODE_BYGGPLAN_V2.md
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
├── .env                   # Supabase credentials
├── src/
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── queryKeys.ts     # React Query keys (KRITISKT!)
│   │   ├── schemas.ts       # Zod validation
│   │   ├── billing-logic.ts # Timbank-beräkningar
│   │   └── constants.ts     # Svenska labels
│   ├── types/database.ts    # TypeScript types
│   ├── contexts/AuthContext.tsx
│   ├── hooks/               # React Query hooks
│   ├── components/
│   │   ├── ui/              # Primitiva komponenter
│   │   ├── layout/          # AppShell, Sidebar, Header
│   │   └── shared/          # LoadingSpinner, EmptyState
│   ├── features/            # Domän-komponenter
│   └── pages/               # Route-komponenter
```

---

## Kommandon

```bash
# Utveckling
npm run dev              # Starta dev server (port 5173)
npm run build            # Produktionsbygge
npx tsc --noEmit         # Typkontroll utan output

# Om fel uppstår
npm install              # Installera om dependencies
rm -rf node_modules && npm install  # Clean install
```

---

## Supabase

### Credentials (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### RLS
- Alla tabeller har RLS aktiverat
- Policies använder `WITH CHECK` för INSERT/UPDATE
- `auth.uid()` krävs för all access

### Auto-genererade nummer
- Kunder: `K-001`, `K-002` (via sequence)
- Ärenden: `C-001` (case), `P-001` (project)

---

## Affärslogik

### Workspace/Multitenancy-modell
Grannfrid är en **single-tenant applikation** med workspace som organisatorisk indelning:
- **Två workspaces:** Göteborg och Stockholm (geografiska kontor)
- **Workspace används för:** Rapportering och filtrering (inte åtkomstkontroll)
- **RLS filtrerar på:** `auth.uid()` (inloggad användare), INTE workspace_id
- **Konsultansvarig:** Varje kund har en `responsible_consultant_id` för ägandeskap
- **I praktiken:** Alla inloggade användare ser all data (litet team, full transparens)

### Avtalstyper
1. **Löpande (hourly)** - Alla timmar faktureras direkt
2. **Timbank (timebank)** - X timmar ingår, sedan övertid
3. **Fastpris (fixed)** - Fast månadsbelopp, timmar = statistik

### Timbank-split
När en entry spräcker timbanken:
```typescript
// Om 3h kvar i timbank och 5h registreras:
// → Skapa 2 time_entries:
//   1. 3h med billing_type='timebank'
//   2. 2h med billing_type='overtime'
```

### Indexeringsvarning
- Visa alert på dashboard om `next_indexation < 7 dagar`

---

## Vid Problem

1. **Typfel:** Kör `npx tsc --noEmit` och fixa ett i taget
2. **Import-fel (@/):** Kontrollera `vite.config.ts` och `tsconfig.json`
3. **Tailwind-färger:** Kontrollera RGB-format i `index.css`
4. **RLS-fel:** Kontrollera att användare är inloggad
5. **Cache-problem:** Invalidera rätt queryKey

---

## Kodmönster (Exempel)

### Skapa ny hook med React Query
```typescript
// src/hooks/useExample.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export function useExamples() {
  return useQuery({
    queryKey: queryKeys.examples.all,
    queryFn: async () => {
      const { data, error } = await supabase.from('examples').select('*');
      if (error) throw error;
      return data;
    }
  });
}

export function useCreateExample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExampleInsert) => {
      const { error } = await supabase.from('examples').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examples.all });
    }
  });
}
```

### Lägg till ny queryKey
```typescript
// I src/lib/queryKeys.ts
examples: {
  all: ['examples'] as const,
  detail: (id: string) => ['examples', id] as const,
}
```

### Lägg till ny Zod schema
```typescript
// I src/lib/schemas.ts
export const exampleSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  // ... fler fält
});
```

---

## Known Gotchas

1. **Tailwind v4 CSS-first config** - Ingen tailwind.config.js! Använd `@theme {}` i CSS
2. **Tailwind alpha MÅSTE ha RGB-format** - `135 169 107` inte `#87a96b`
3. **line-clamp ingår i core** - `@tailwindcss/line-clamp` behövs INTE (sedan v3.3)
4. **postcss.config.js för Tailwind v4** - Använd `{'@tailwindcss/postcss': {}}`
5. **Switch wrapper** - Radix Switch har dålig UX, använd vår wrapper
6. **ProfilePage useEffect** - Form måste synkas med server-data via useEffect
7. **KnowledgeList** - Implementera INTE med Radix Tabs (bug), använd buttons
8. **RLS WITH CHECK** - INSERT/UPDATE policies MÅSTE ha WITH CHECK-klausul
9. **Sequences för nummer** - Använd PostgreSQL sequences för K-001, C-001 etc.
10. **React Query v5 object syntax** - `useQuery({ queryKey, queryFn })` INTE `useQuery(key, fn)`
11. **AuthContext getSession()** - MÅSTE anropas vid mount för att bevara session

---

## Ralph Wiggum

För automatiserad build, använd:
```bash
/ralph-loop "..." --completion-promise "GRANNFRID_COMPLETE" --max-iterations 150
```

**Viktigt för Ralph:**
- Prompten ändras aldrig - Claude förbättrar genom att läsa git history
- Verifiering efter varje fas är kritisk (`npm run dev` + `npx tsc --noEmit`)
- Om stuck i 5+ iterationer: dokumentera vad som blockerar

Se `CLAUDE_CODE_BYGGPLAN_V2.md` för komplett prompt.
