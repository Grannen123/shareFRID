# Roadmap – Grannfrid App

Detta är en sammanfattning av planerade förbättringar. Detaljerade äldre planer finns i `docs/legacy/`.

---

## Hög prioritet

### Fakturering 2.0

**Mål:** Komplett faktureringsmodul inspirerad av Blikk med automatisk timbank-split och Fortnox-export.

#### Fas 1: Timbank-split vid registrering

Split beräknas och sätts **direkt vid registrering** baserat på aktuell timbank-status.

**Flöde:**

1. Konsult registrerar timmar på journalpost
2. System beräknar aktuell timbank-status
3. Om timmar överskrider kvarvarande timbank → popup:
   - "Timbank slut! 2h ryms i timbanken, 3h blir övertid."
   - "Vill du skapa separata rader?"
4. `billing_type` sätts direkt (`timebank` eller `overtime`)

**Vid redigering:**

- Radera befintliga time_entries för journalposten
- Beräkna ny split baserat på nuvarande timbank-status
- Skapa nya entries med korrekt `billing_type`

**Varför denna approach?**

- Enklare implementation än dynamisk beräkning vid fakturering
- Kundens faktura blir samma summa oavsett (totala timmar × respektive pris)
- Konsulten ser direkt vad som händer
- Om timmar avser tidigare datum: skriv i fakturakommentaren

#### Fas 2: Timbank-statusvisning

- Visa "18h av 24h" på kunddetalj och uppdragsdetalj
- Ny komponent: `TimebankStatusBadge` med färgkodning (grön/gul/röd)
- Utöka `useTimebank.ts` med `useTimebankStatusByCustomer()`

#### Fas 3: "Att fakturera"-pipeline

- Kundlista med oexporterade time_entries, sorterad A-Ö
- Drill-down till kundvy med uppdrag grupperade per fakturamottagare
- Fakturaunderlag med inline-redigering och CSV-export
- Statusflöde: `draft → review → exported → locked`

#### Fas 4: Fortnox-integration

- CSV-export med korrekt mappning (Kundens referens → "Er referens")
- Automatisk batch-skapande baserat på `billing_anchor_date`

#### Nya fält på avtal (migration krävs)

- `billing_anchor_date` – Första fakturadatum, upprepas sedan automatiskt
- `excluded_months INTEGER[]` – Månader som hoppas över (t.ex. `[7]` för juli)

#### Ny avtalstyp: Engångsbelopp (onetime)

- Engångsuppdrag med fast pris
- Faktureras en gång när uppdraget är klart
- `fixed_amount` för totalpris, `hourly_rate` för extraarbete

#### Tvåvägs-synk för tidsredigering

- Redigera timmar i journal → time_entry uppdateras
- Redigera timmar i faktura → journal_entry uppdateras
- Hantera split-entries korrekt vid redigering

#### Prisändring med datumval

Vid ändring av timpris på kundavtal:

- Fråga: "Från vilket datum ska nya priset gälla?"
- Alternativ: Idag (default) eller tidigare datum (max första dagen i innevarande månad)
- Begränsning: Endast ofakturerade tidsposter kan uppdateras
- Uppdatera `hourly_rate` på alla berörda time_entries i batch

```typescript
async function updateAgreementRate(
  agreementId: string,
  newRate: number,
  effectiveFrom: Date, // max 1:a i månaden
) {
  // 1. Uppdatera avtalets hourly_rate
  // 2. Hämta alla time_entries där is_exported = false AND date >= effectiveFrom
  // 3. Batch-uppdatera hourly_rate på dessa entries
}
```

---

### Medverkande konsulter (Fas 8)

**Syfte:** Flera konsulter kan arbeta på samma journalpost.

#### Databasschema

```sql
CREATE TABLE time_entry_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES auth.users(id) NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(journal_entry_id, consultant_id)
);
```

#### Funktionalitet

- Max 2-3 medverkande konsulter per journalpost
- UI-komponent: `ParticipantSelector` för att välja medverkande
- Fakturarader visar alla konsultnamn summerat
- Varje konsult får sin egen time_entry för korrekt produktionskredit

---

## Medel prioritet

### Inkluderade tjänster/Åtaganden

**Syfte:** Spåra vilka tjänster som ingår i ett avtal och markera dem som utförda.

**VIKTIGT:** Detta är INTE faktureringslogik – det är en checklista för kvalitetsuppföljning.

#### Varför det behövs

- Avtal innehåller specifika åtaganden (t.ex. "medverkan på 1 styrelsemöte per år")
- Konsulter behöver påminnelser för periodiska tjänster
- Kundtransparens – visa vad som faktiskt levereras

#### Databasschema

```sql
CREATE TABLE agreement_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('once', 'monthly', 'quarterly', 'yearly', 'on_demand')) DEFAULT 'on_demand',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES agreement_services(id) ON DELETE CASCADE NOT NULL,
  completed_by UUID REFERENCES auth.users(id) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  period_year INTEGER NOT NULL,
  period_month INTEGER,
  period_quarter INTEGER,
  notes TEXT,
  UNIQUE(service_id, period_year, period_month, period_quarter)
);
```

#### UI-komponenter

- `AgreementServicesTab` – Flik på avtalsvy
- `ServiceChecklistItem` – Rad med checkbox för tjänst
- `ServiceProgressBadge` – Badge: "3 av 5 utförda"
- Varning i faktureringsvyn om oavslutade tjänster (ej blockerande)

#### Frekvenser

- `once` – Engångsåtagande
- `monthly` – Varje månad
- `quarterly` – Varje kvartal
- `yearly` – Varje år
- `on_demand` – Vid behov (ingen deadline)

---

### Papperskorg (Soft Delete)

**Syfte:** Skydda mot oavsiktliga raderingar utan att komplicera GDPR-hantering.

#### Implementation

- Lägg till `deleted_at TIMESTAMPTZ` på: `assignments`, `journal_entries`, `tasks`, `contacts`
- RLS-policies exkluderar rader där `deleted_at IS NOT NULL`
- Ny vy: "Papperskorgen" visar raderade objekt (senaste 7 dagar)
- Återställ-knapp sätter `deleted_at = NULL`
- Automatisk permanent radering efter 7 dagar (cron-jobb eller pg_cron)

#### GDPR-radering (separat)

- Explicit "GDPR-radering" knapp för permanent borttagning
- Kräver bekräftelse: skriv kundnamn för att verifiera
- Hoppar över papperskorgen, raderar direkt
- Tar även bort relaterade filer i Storage

```sql
-- Exempel: Soft delete på assignments
ALTER TABLE assignments ADD COLUMN deleted_at TIMESTAMPTZ;

-- RLS policy uppdatering
CREATE POLICY "exclude_deleted" ON assignments
  FOR SELECT USING (deleted_at IS NULL AND auth.uid() IS NOT NULL);
```

---

### Övriga medel prioritet

- **Aktivitetslogg** – Trigger-baserad `activity_log` eller central RPC
- **Command Center (Cmd+K)** – Global kommandopalett
- **Datavalidering** – Organisationsnummer, e-postkontroll

---

## Låg prioritet

- **AI-stöd** – Anteckningsrensning med Gemini, fakturakommentarer
- **Dokumentmallar** – Merge-fields för standardbrev
- **Dashboard widgets** – Konfigurerbar layout
- **Offline-läge** – Service worker för grundläggande funktionalitet
- **SLA/uppföljning** – Timbank-SLA (påbörjad inom 3 arbetsdagar)

---

## Avgränsningar

- **Rich-text editor (TipTap)** är explicit bortvald i nuläget
- **Attestering/approval-workflow** behövs inte (litet team)
- **Multi-tenant** behövs inte (workspace är endast för rapportering)

---

## Implementationsordning (förslag)

1. Timbank-split vid registrering (Fas 1)
2. Timbank-statusvisning (Fas 2)
3. Prisändring med datumval
4. Papperskorg (Soft Delete) + GDPR-radering
5. "Att fakturera"-pipeline (Fas 3)
6. Inkluderade tjänster
7. Medverkande konsulter
8. Fortnox-integration (Fas 4)
