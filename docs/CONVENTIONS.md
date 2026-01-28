# Kodkonventioner - Grannfrid

## Namngivning

### Filer

- **Komponenter:** `PascalCase.tsx` (CustomerCard.tsx)
- **Hooks:** `camelCase.ts` med `use` prefix (useCustomers.ts)
- **Utilities:** `kebab-case.ts` (billing-logic.ts)
- **Types:** `PascalCase.ts` eller i `types/` mapp

### Variabler & Funktioner

- **Variabler:** `camelCase`
- **Konstanter:** `SCREAMING_SNAKE_CASE` eller `camelCase` beroende på scope
- **React hooks:** `use` prefix (useCustomers, useState)
- **Event handlers:** `handle` prefix (handleClick, handleSubmit)

### TypeScript

- **Interfaces:** `PascalCase` utan `I` prefix
- **Types:** `PascalCase`
- **Enums:** `PascalCase` med `PascalCase` members

## Mappstruktur

```
src/
├── components/
│   ├── ui/           # Återanvändbara primitiver (Button, Card, Input)
│   ├── layout/       # Layout-komponenter (AppShell, Sidebar)
│   └── shared/       # Delade komponenter (LoadingSpinner, ErrorState)
├── features/         # Domänspecifika komponenter grupperade per feature
│   ├── customers/
│   ├── assignments/
│   └── billing/
├── hooks/            # React Query hooks
├── lib/              # Utilities och konfiguration
├── pages/            # Route-komponenter
├── contexts/         # React contexts
└── types/            # TypeScript typdefinitioner
```

## React Patterns

### Hooks

```typescript
// ✅ Använd object signature (React Query v5)
useQuery({
  queryKey: queryKeys.customers.all,
  queryFn: async () => { ... }
})

// ❌ Gamla array syntax fungerar inte
useQuery(['customers'], fetchFn)
```

### Komponenter

```typescript
// ✅ Funktionella komponenter med destructuring
export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
  // ...
}

// ✅ Props interface bredvid komponenten
interface CustomerCardProps {
  customer: Customer;
  onEdit?: (id: string) => void;
}
```

### Error Handling

```typescript
// ✅ Kasta errors, fånga inte tyst
const { data, error } = await withTimeout(query);
if (error) throw error;

// ✅ Visa toast vid fel
onError: (error) => {
  console.error("Operation failed:", error);
  toast.error("Något gick fel: " + error.message);
};
```

## Supabase

### Queries

```typescript
// ✅ ALLTID med withTimeout()
const { data, error } = await withTimeout(
  supabase.from("customers").select("*"),
  10000,
);

// ❌ Utan timeout
const { data } = await supabase.from("customers").select("*");
```

### QueryKeys

```typescript
// ✅ Använd queryKeys factory
queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });

// ❌ Hårdkodade strängar
queryClient.invalidateQueries({ queryKey: ["customers"] });
```

## Styling

### Tailwind CSS v4

- Använd CSS-first config med `@theme {}` i `index.css`
- RGB-format för färger: `135 169 107` inte `#87a96b`
- Undvik inline styles

### Färgpalett

```css
--sage: 135 169 107; /* Primär */
--terracotta: 212 103 74; /* Varning/Fel */
--lavender: 155 143 191; /* Info */
--charcoal: 44 40 36; /* Text */
--cream: 249 247 244; /* Bakgrund */
```

## Formulär

### Zod + React Hook Form

```typescript
// ✅ Schema i lib/schemas.ts
export const customerSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  email: z.string().email("Ogiltig e-post").optional(),
});

// ✅ I komponenten
const form = useForm<CustomerFormData>({
  resolver: zodResolver(customerSchema),
});
```

## Import-ordning

```typescript
// 1. React
import { useState, useEffect } from "react";

// 2. Externa bibliotek
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// 3. Interna absoluta imports
import { supabase, withTimeout } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

// 4. Relativa imports
import { CustomerCard } from "./CustomerCard";

// 5. Types (sist)
import type { Customer } from "@/types/database";
```

## Kommentarer

### Språk

- **Kod:** Engelska
- **UI-text:** Svenska
- **Kommentarer:** Svenska för domänlogik, engelska för teknisk kod

### Dokumentation

```typescript
// ✅ Kort och koncist
// Beräknar timbank-split vid överskridande
function calculateBillingWithSplit(...) { }

// ❌ Uppenbar kommentar
// Denna funktion beräknar...
function calculateBillingWithSplit(...) { }
```

## Git

### Commit Messages

Format: `type: kort beskrivning`

Typer:

- `feat:` Ny funktionalitet
- `fix:` Buggfix
- `refactor:` Kodrefaktorering
- `docs:` Dokumentation
- `style:` Formatering
- `test:` Tester

Exempel:

```
feat: lägg till timbank-split i fakturering
fix: åtgärda auth timeout vid page refresh
docs: uppdatera CLAUDE.md med nya patterns
```

### Branching

- `main` - Produktion
- `feature/*` - Nya features
- `fix/*` - Bugfixes
