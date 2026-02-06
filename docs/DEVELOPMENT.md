# Utvecklingsguide - Grannfrid

## Arkitekturöversikt

### Frontend

```
React 18 + TypeScript + Vite
├── UI Framework: Radix UI + Tailwind CSS
├── State: TanStack React Query
├── Forms: React Hook Form + Zod
└── Routing: React Router v6
```

### Backend

```
Supabase (PostgreSQL)
├── Auth: Supabase Auth (+ Microsoft SSO)
├── Database: PostgreSQL med RLS
├── Realtime: Supabase Realtime
└── Storage: Supabase Storage (för dokument)
```

### AI Integration (planerad)

```
Claude API (EU-deployment)
├── Konversation och analys
├── Dokumentgenerering
└── Kunskapsbank-sökning

Gemini Flash (Vertex AI europe-north1)
├── Bulk-beräkningar
├── Enkel parsing
└── Snabba operationer

Whisper
├── Diktering i frontend
└── Voice-to-text för journalanteckningar
```

## Datamodell

### Kärnentiteter

```
Customer (Kund)
├── Contacts (Kontakter)
├── Agreements (Avtal)
│   └── AgreementLedger (Timbank-reskontra)
└── Cases (Ärenden)
    ├── JournalEntries (Journalanteckningar)
    │   └── BillingLines (Faktureringsrader)
    └── Tasks (Uppgifter)
```

### Timbank-split Logik

När tid loggas på ett timbank-avtal:

```typescript
// Exempel: 8h loggat, 5h kvar i timbank
const result = calculateTimbankSplit(480, 300);
// {
//   timbankMinutes: 300,  // 5h från timbank (0 kr)
//   overtimeMinutes: 180  // 3h övertid (faktureras)
// }
```

Två `BillingLine` skapas:
1. `type: 'timebank'` - 300 min, 0 kr
2. `type: 'overtime'` - 180 min, rate × 3h

### Faktureringsflöde

```
JournalEntry
    ↓
BillingLine (pending)
    ↓
BillingLine (review)
    ↓
BillingLine (approved)
    ↓
Invoice (draft)
    ↓
Export → Fortnox
    ↓
BillingLine (invoiced, locked=true)
```

## Kodkonventioner

### TypeScript

```typescript
// Explicit types
interface Customer {
  fortnoxNumber: string;
  name: string;
  status: CustomerStatus;
}

// Zod för validering
const customerSchema = z.object({
  fortnoxNumber: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['active', 'prospekt', 'vilande']),
});

// React Query för data
const { data, isLoading } = useQuery({
  queryKey: ['customers', workspace],
  queryFn: () => fetchCustomers(workspace),
});
```

### Komponenter

```typescript
// Funktionella komponenter med explicit typing
interface CustomerCardProps {
  customer: Customer;
  onEdit?: () => void;
}

export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
  return (
    <Card>
      <CardContent>
        {customer.name}
      </CardContent>
    </Card>
  );
}
```

### Svenska Labels

Använd alltid `LABELS` från `@/lib/constants`:

```typescript
import { LABELS } from '@/lib/constants';

// Rätt
<Badge>{LABELS.customerStatuses[customer.status]}</Badge>

// Fel - hårdkodad text
<Badge>Aktiv</Badge>
```

## Testning

### Enhetstester

```bash
npm run test
```

Prioritera tester för:
1. Billing-logik (kritiskt)
2. Timbank-split beräkningar
3. Zod-schemas
4. Datumhantering

### E2E-tester (planerat)

```bash
npm run test:e2e
```

## Säkerhet

### Row Level Security (RLS)

Alla tabeller har RLS aktiverat. Policies:
- Läsbehörighet för autentiserade användare
- Skrivbehörighet baserat på roll/arbetsyta
- Personliga anteckningar endast synliga för ägaren

### GDPR

- All AI-data processas inom EU
- Persondata kan exporteras/raderas
- Audit-loggning för känsliga operationer

## Deployment

### Miljöer

| Miljö | URL | Branch |
|-------|-----|--------|
| Development | localhost:5173 | feature/* |
| Staging | staging.grannfrid.se | develop |
| Production | app.grannfrid.se | main |

### Deployment Process

1. Merge till `main`
2. Automatisk build via CI/CD
3. Deploy till Vercel/Netlify
4. Supabase migrations körs automatiskt

## Felsökning

### Vanliga problem

**"Supabase connection failed"**
- Kontrollera `.env.local`
- Verifiera att projektet är aktivt i Supabase

**"RLS policy denied"**
- Kontrollera att användaren är autentiserad
- Verifiera policy i Supabase Dashboard

**"Type error in query"**
- Regenerera typer: `npm run supabase:types`

## Resurser

- [Supabase Docs](https://supabase.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
