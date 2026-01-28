# Inkluderade tjänster/Åtaganden - Specifikation

> **Modul:** Avtalsleverans och kunduppföljning
> **Status:** Planerad (Sprint 8)
> **Relaterat:** `docs/legacy/FAKTURERING_IMPLEMENTATIONSPLAN.md` (Fas 9)

## Syfte

Spåra vilka tjänster som ingår i ett avtal och markera dem som utförda. Detta ger översikt över vad som faktiskt levereras inom avtalet och hjälper konsulter att säkerställa att alla åtaganden uppfylls.

**VIKTIGT:** Detta är INTE faktureringslogik. Inkluderade tjänster påverkar inte fakturabelopp - det är en checklista för kvalitetsuppföljning.

## Varför det behövs

1. **Avtal innehåller specifika åtaganden** - t.ex. "medverkan på 1 styrelsemöte per år"
2. **Konsulter behöver påminnelser** - lätt att glömma periodiska tjänster
3. **Kundtransparens** - visa vad som faktiskt levereras
4. **Kvalitetssäkring** - säkerställ att alla åtaganden uppfylls

## Exempel från verkliga avtal

**Timbanksavtal (t.ex. 60h/år):**

- Driva störningsärenden
- Telefonrådgivning till styrelsen
- Rådgivning gällande andrahandsuthyrningar
- Medverkan på 1 styrelsemöte per år

**Fastprisavtal:**

- Månadsvis genomgång av störningsrapporter
- Kvartalsvis statusrapport till styrelsen
- Årlig översyn av trivselregler

## Databasschema

```sql
-- Tabell för tjänster som ingår i ett avtal
CREATE TABLE agreement_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                           -- "Telefonrådgivning till styrelsen"
  description TEXT,                             -- Längre beskrivning vid behov
  frequency TEXT CHECK (frequency IN (
    'once',                                     -- Engångsåtagande
    'monthly',                                  -- Varje månad
    'quarterly',                                -- Varje kvartal
    'yearly',                                   -- Varje år
    'on_demand'                                 -- Vid behov (ingen deadline)
  )) DEFAULT 'on_demand',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabell för att spåra utförande av tjänster per period
CREATE TABLE service_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES agreement_services(id) ON DELETE CASCADE NOT NULL,
  completed_by UUID REFERENCES auth.users(id) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  period_year INTEGER NOT NULL,                 -- År för perioden
  period_month INTEGER,                         -- Månad (NULL för yearly)
  period_quarter INTEGER,                       -- Kvartal (NULL för monthly/yearly)
  notes TEXT,                                   -- Frivillig kommentar

  -- Undvik dubbletter per tjänst och period
  UNIQUE(service_id, period_year, period_month, period_quarter)
);

-- RLS
ALTER TABLE agreement_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON agreement_services
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_all" ON service_completions
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Index
CREATE INDEX idx_agreement_services_agreement ON agreement_services(agreement_id);
CREATE INDEX idx_service_completions_service ON service_completions(service_id);
CREATE INDEX idx_service_completions_period ON service_completions(period_year, period_month);
```

## TypeScript-typer

```typescript
// src/types/database.ts

export type ServiceFrequency =
  | "once"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "on_demand";

export interface AgreementService {
  id: string;
  agreement_id: string;
  name: string;
  description: string | null;
  frequency: ServiceFrequency;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCompletion {
  id: string;
  service_id: string;
  completed_by: string;
  completed_at: string;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  notes: string | null;
}

export interface AgreementServiceWithStatus extends AgreementService {
  is_completed_this_period: boolean;
  completed_by_name?: string;
  completed_at?: string;
}
```

## UI-komponenter

### Komponentstruktur

```
src/features/agreements/
├── AgreementServicesTab.tsx     # Flik på avtalsvy - lista över inkluderade tjänster
├── ServiceForm.tsx              # Modal för att lägga till/redigera tjänst
├── ServiceChecklistItem.tsx     # Rad med checkbox för tjänst
└── ServiceProgressBadge.tsx     # Badge: "3 av 5 utförda"
```

### ServiceChecklistItem

```tsx
interface Props {
  service: AgreementServiceWithStatus;
  onComplete: () => void;
  onUncomplete: () => void;
}

export function ServiceChecklistItem({
  service,
  onComplete,
  onUncomplete,
}: Props) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-sand">
      <Checkbox
        checked={service.is_completed_this_period}
        onCheckedChange={(checked) => {
          if (checked) onComplete();
          else onUncomplete();
        }}
      />
      <div className="flex-1">
        <p className="font-medium text-charcoal">{service.name}</p>
        {service.description && (
          <p className="text-sm text-ash">{service.description}</p>
        )}
        <Badge variant="default" className="mt-1">
          {FREQUENCY_LABELS[service.frequency]}
        </Badge>
      </div>
      {service.is_completed_this_period && (
        <p className="text-sm text-ash">
          ✓ {service.completed_by_name} · {formatDate(service.completed_at)}
        </p>
      )}
    </div>
  );
}

const FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
  once: "Engång",
  monthly: "Månadsvis",
  quarterly: "Kvartalsvis",
  yearly: "Årsvis",
  on_demand: "Vid behov",
};
```

### ServiceProgressBadge

```tsx
interface Props {
  completed: number;
  total: number;
}

export function ServiceProgressBadge({ completed, total }: Props) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-sand rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentage === 100 ? "bg-sage" : "bg-lavender",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-ash">
        {completed} av {total} tjänster
      </span>
    </div>
  );
}
```

## Integration i befintlig UI

### På kunddetaljsidan (CustomerDetail.tsx)

Visa en sammanfattning av inkluderade tjänster och status:

```tsx
{
  agreement?.type !== "hourly" && (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-ash mb-2">
        Inkluderade tjänster
      </h4>
      <ServiceProgressBadge completed={3} total={5} />
    </div>
  );
}
```

### På avtalssidan

En egen flik för att hantera inkluderade tjänster:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Översikt</TabsTrigger>
    <TabsTrigger value="services">Inkluderade tjänster</TabsTrigger>
  </TabsList>

  <TabsContent value="services">
    <AgreementServicesTab agreementId={agreement.id} />
  </TabsContent>
</Tabs>
```

## Koppling till faktureringsvyn

När användaren skapar fakturaunderlag visas en **varning** (inte blockerande) om det finns oavslutade tjänster:

```tsx
{
  incompleteServices.length > 0 && (
    <AlertBanner variant="warning">
      <AlertCircle className="w-4 h-4" />
      <span>
        Det finns {incompleteServices.length} inkluderade tjänster som inte
        markerats som utförda denna period
      </span>
      <Button variant="link" onClick={() => setShowServicesDialog(true)}>
        Visa tjänster
      </Button>
    </AlertBanner>
  );
}
```

## Periodberäkning

```typescript
// src/lib/service-utils.ts

export function getCurrentPeriod(frequency: ServiceFrequency): {
  year: number;
  month?: number;
  quarter?: number;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);

  switch (frequency) {
    case "monthly":
      return { year, month };
    case "quarterly":
      return { year, quarter };
    case "yearly":
      return { year };
    case "once":
    case "on_demand":
      return { year };
  }
}

export function isPeriodMatch(
  completion: ServiceCompletion,
  frequency: ServiceFrequency,
  currentPeriod: ReturnType<typeof getCurrentPeriod>,
): boolean {
  if (completion.period_year !== currentPeriod.year) return false;

  switch (frequency) {
    case "monthly":
      return completion.period_month === currentPeriod.month;
    case "quarterly":
      return completion.period_quarter === currentPeriod.quarter;
    case "yearly":
      return true;
    case "once":
      return true;
    case "on_demand":
      return false; // Aldrig "klar"
  }
}
```

## Implementationsordning

1. Kör SQL-migration: skapa `agreement_services` och `service_completions` tabeller
2. Skapa TypeScript-typer
3. Skapa `useAgreementServices` hook med CRUD-operationer
4. Implementera `ServiceChecklistItem` och `ServiceProgressBadge` komponenter
5. Skapa `AgreementServicesTab` för avtalsvy
6. Integrera `ServiceProgressBadge` på kunddetaljsidan
7. Lägg till varning i faktureringsvyn för oavslutade tjänster
