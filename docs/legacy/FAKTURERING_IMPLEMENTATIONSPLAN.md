# Faktureringsmodul - Implementationsplan

## Mål

Bygga en faktureringsmodul inspirerad av Blikk med automatisk timbank-split, tydlig statusvisning och Fortnox-integration.

## Inspiration från Blikk

Baserat på genomgång av Blikk's dokumentation (hc.blikk.se) har följande mönster identifierats:

### Blikk's arbetsflöde

1. **"Att fakturera"** - Visar allt fakturerbart, filtrerat per kund eller projekt
2. **Statusar**: Preliminärt → Utkast → Skapat → Arkiverat (+ Misslyckade)
3. **Gröna prickar** = Redo att fakturera (projekt avslutat, "klar"-markering, eller fastpris-datum)
4. **Underliggande rader** - Kan markeras: Faktureras / Dölj / Undanta
5. **Återställning** - Data går tillbaka till projektet för korrigering
6. **Fortnox-mappning**: Kundens referens → "Er referens", Referensmärkning → "Ert ordernummer"

### Anpassning för Grannfrid

Vi förenklar Blikk's modell till:

- **Statusflöde**: draft → review → exported → locked (behåller befintlig)
- **"Att fakturera"-vy** som visar fakturerbara time_entries per kund/månad
- **Timbank-split** sker automatiskt vid tidsregistrering
- **Detaljerad fakturering** - varje time_entry = en fakturarad

## Sammanfattning av krav

- **Automatisk split**: När timmar överskrider timbanken, skapa 2 time_entries automatiskt
- **Timbank-status**: Visa "18h av 24h" på kunddetalj och ärendedetalj
- **Detaljerad fakturering**: Varje tidsregistrering = en fakturarad
- **Tidsjustering i fakturavyn**: Kunna ändra timmar direkt → synkas till journal
- **Fastpris**: Logga för statistik (visas i rapporter, inte faktureras)
- **Attestering**: Ej obligatorisk (vi är få personer, alla litar på varandra)
- **Automatisk faktureringscykel**: Första datum manuellt, sedan upprepas årligen/månadsvis
- **Fortnox**: Fas 2 (efter grundflödet fungerar)

## Faktureringsmodeller

### Timbank (yearly/monthly)

**Årsvis:**

- Kunden köper timbank en gång/år (förskott)
- Under året: timmar dras från banken (ingen faktura)
- När banken slut: överskridande faktureras löpande
- Nästa år: påfyllning (ny faktura på samma datum)

**Månadsvis:**

- Timbank + ev. övertid faktureras varje månad
- T.ex. "20h ingår, 25h förbrukade → faktura för 5h övertid"

**OBLIGATORISKT:** Timbanksavtal MÅSTE ha `overtime_rate` för överskridande timmar.

### Fastpris (yearly/monthly)

**Samma princip som timbank:**

- Årsvis: Fast belopp faktureras en gång/år
- Månadsvis: Fast belopp faktureras varje månad
- Extraarbete: Faktureras till förbestämt timpris (`hourly_rate`)
- Projektavtal: Använd `fixed` med `period='monthly'` och `valid_to` satt

**OBLIGATORISKT:** Fastprisavtal MÅSTE ha `hourly_rate` för extraarbete utanför avtalet.

### Löpande (hourly)

- Alla timmar faktureras direkt till timpris
- Ingen timbank eller fast belopp

### Engångsbelopp (onetime) - NY!

- Engångsuppdrag med fast pris (t.ex. "utredning för 10 000 kr")
- Faktureras en gång när uppdraget är klart
- Ingen periodisering eller auto-förnyelse
- `fixed_amount` anger totalpriset
- `hourly_rate` för eventuellt extraarbete

### Nytt fält på avtal

- `billing_anchor_date` - Första fakturadatum, upprepas sedan automatiskt
- `excluded_months` - Månader som ska hoppas över (t.ex. `[7]` för juli)

---

## Tvåvägs-synk för tidsredigering

### Krav

Användaren ska kunna redigera timmar på **två ställen** med automatisk synk:

1. **I journalposten** → time_entry uppdateras automatiskt
2. **I fakturaunderlaget** → journal_entry uppdateras automatiskt

### Implementation

- `useUpdateJournalEntry` - Uppdaterar `journal_entries.hours` + `time_entries.hours`
- `useUpdateTimeEntry` - Uppdaterar `time_entries.hours` + `journal_entries.hours` (om kopplad)

### Edge case: Split-entries

Om en journalpost har 2 time_entries (timbank + övertid):

- Redigering i journal: Beräkna om split med nya timmar
- Redigering i faktura: Endast justera den specifika time_entry (journal får summan)

---

## Fas 1: Timbank-split vid tidsregistrering

### Problem idag

`useJournal.ts` skapar alltid EN time_entry, oavsett om timbanken överskrids.

### Lösning

Integrera `calculateBillingWithSplit()` i journal-flödet.

### Filer att ändra

#### 1. `src/hooks/useJournal.ts`

**Ändring i `useCreateJournalEntry`:**

```typescript
// Nuvarande: Skapar alltid 1 time_entry
// Ny: Anropar calculateBillingWithSplit() och skapar 1-2 entries

async mutationFn(data) {
  // 1. Hämta kundens aktiva avtal
  const agreement = await getActiveAgreement(customerId);

  // 2. Hämta timbank-status (om timbank-avtal)
  const timebankStatus = await getTimebankStatus(agreement.id);

  // 3. Beräkna split
  const billingResult = calculateBillingWithSplit(
    agreement,
    timebankStatus,
    data.hours,
    data.is_extra_billable
  );

  // 4. Skapa journal_entry
  const journalEntry = await createJournalEntry(data);

  // 5. Skapa time_entries (1 eller 2 beroende på split)
  for (const split of billingResult.entries) {
    await supabase.from('time_entries').insert({
      customer_id: customerId,
      assignment_id: assignmentId,
      agreement_id: agreement.id,
      journal_entry_id: journalEntry.id,
      date: new Date().toISOString().split('T')[0],
      hours: split.hours,
      billing_type: split.billingType,
      hourly_rate: split.hourlyRate,
      is_billable: split.billingType !== 'internal',
      created_by: user.id
    });
  }
}
```

#### 2. `src/lib/billing-logic.ts`

**Kontrollera att split-logiken hanterar alla edge cases:**

- Timbank 100%, använd 100% → allt overtime
- Timbank 80%, ny entry → split
- Fastpris → logga men amount=0
- Löpande → alltid hourly

---

## Fas 2: Timbank-statusvisning

### Krav

Visa "18h av 24h" på:

1. Kunddetalj (CustomerDetail)
2. Ärendedetalj (AssignmentDetail)

### Filer att ändra

#### 1. `src/features/customers/CustomerDetail.tsx`

**Lägg till TimebankStatusBadge i header:**

```tsx
// Om kunden har timbank-avtal, visa:
<TimebankStatusBadge used={18} total={24} variant="compact" />
// Renderar: "18h av 24h" med färgkodning (grön/gul/röd)
```

#### 2. `src/features/assignments/AssignmentDetail.tsx`

**Samma komponent i uppdragsheadern**

#### 3. `src/components/shared/TimebankStatusBadge.tsx` (NY)

**Ny komponent för att visa timbank-status:**

```tsx
interface Props {
  used: number;
  total: number;
  variant?: "compact" | "full";
}

// Färgkodning:
// < 75% → grön (sage)
// 75-90% → gul (gold)
// > 90% → röd (terracotta)
```

#### 4. `src/hooks/useTimebank.ts`

**Utöka för att hämta status per kund (inte bara per avtal):**

```typescript
export function useTimebankStatusByCustomer(customerId: string) {
  // Hämta kundens aktiva avtal
  // Om timbank → returnera status
  // Annars → returnera null
}
```

---

## Fas 3: Säkerställ korrekt fakturering

### Kontrollera att:

1. `useBillingSummary` hanterar split-entries korrekt
2. `useCreateBillingBatch` kopplar alla entries
3. `BillingDetail` visar detaljerade rader

### Filer att verifiera

#### 1. `src/hooks/useBilling.ts`

**`useBillingSummary` ska:**

- Gruppera per billing_type (timebank, overtime, hourly)
- Beräkna korrekt totalbelopp
- Visa alla entries oavsett split

#### 2. `src/features/billing/BillingDetail.tsx`

**Verifiera att tabellen visar:**

- Varje time_entry som egen rad
- Korrekt typ (Timbank/Övertid/Löpande)
- Korrekt belopp per rad

---

## Fas 4: Testning

### Testscenario 1: Timbank-split

1. Kund med timbank 20h
2. Registrera 15h → ska bli 15h timebank
3. Registrera 10h → ska bli 5h timebank + 5h övertid
4. Verifiera att 3 time_entries skapas totalt

### Testscenario 2: Fastpris

1. Kund med fastpris
2. Registrera 5h → ska bli 5h fixed, amount=0
3. Markera "extraarbete" → ska bli 5h hourly med pris

### Testscenario 3: Batch-skapande

1. Skapa batch för en månad
2. Verifiera att alla split-entries inkluderas
3. Exportera CSV och kontrollera raderna

---

## Implementation - Steg för steg

### Steg 1: Skapa TimebankStatusBadge

- Fil: `src/components/shared/TimebankStatusBadge.tsx`
- Enkel komponent som visar "Xh av Yh"

### Steg 2: Utöka useTimebank

- Fil: `src/hooks/useTimebank.ts`
- Lägg till `useTimebankStatusByCustomer()`

### Steg 3: Integrera i CustomerDetail

- Fil: `src/features/customers/CustomerDetail.tsx`
- Visa TimebankStatusBadge i header

### Steg 4: Integrera i AssignmentDetail

- Fil: `src/features/assignments/AssignmentDetail.tsx`
- Visa TimebankStatusBadge i header

### Steg 5: Integrera split i useJournal

- Fil: `src/hooks/useJournal.ts`
- Ändra `useCreateJournalEntry` att använda `calculateBillingWithSplit()`

### Steg 6: Testa hela flödet

- Skapa testdata med timbank-kund
- Registrera timmar som överskrider
- Verifiera att split sker
- Skapa batch och exportera

---

## Verifiering

### Manuell testning

1. Logga in som test@grannfrid.se
2. Gå till en kund med timbank-avtal
3. Se "Xh av Yh" i headern
4. Skapa journal-entry med timmar som överskrider timbanken
5. Verifiera att 2 time_entries skapas
6. Gå till Fakturering
7. Skapa batch
8. Exportera CSV och verifiera raderna

### Automatisk kontroll

```bash
npx tsc --noEmit  # Inga TypeScript-fel
npm run dev       # Starta app
```

---

## Fas 5: "Att fakturera"-vy och Fakturaunderlag

### Begreppsförklaring

- **"Att fakturera"-vy**: Huvudöversikt - live-uppdaterad lista över kunder med fakturerbart belopp
- **Kundvy (drill-down)**: Klicka på kund → se uppdrag grupperade per fakturamottagare
- **Fakturaunderlag**: Skapas när användaren väljer vilka uppdrag som ska faktureras → exporteras till CSV/Fortnox

### Flöde

```
┌─────────────────────────────────────────────────────────────────┐
│                    "ATT FAKTURERA"-VY                           │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Sammanfattning (uppdateras i realtid)                      │ │
│  │ ─────────────────────────────────────────────────────────  │ │
│  │ Timbanksavtal:           60 000 kr                         │ │
│  │ Fastprisavtal:          100 000 kr                         │ │
│  │ Löpande timfakturering:  60 000 kr                         │ │
│  │ ─────────────────────────────────────────────────────────  │ │
│  │ TOTALT ATT FAKTURERA:   220 000 kr                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Kund (A-Ö)                              │ Att fakturera    │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 🏢 Brf Almen                            │      12 500 kr   │ │
│  │ 🏢 Brf Björken                          │       8 200 kr   │ │
│  │ 🏢 Brf Cederträdet                      │      45 000 kr   │ │
│  │ ...                                     │                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  När listan är TOM = Faktureringsarbetet klart!                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Klicka på kund
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    KUNDVY (Brf Almen)                           │
│  Uppdrag grupperade per fakturamottagare                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ☐ C-001: Störningsärende (Kalle, ordf)        4 500 kr    │ │
│  │ ☐ C-003: Andrahand (Kalle, ordf)              3 000 kr    │ │
│  │ ☐ P-002: Trivselundersökning (Lisa, ek.ansv)  5 000 kr    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Välj alla med samma mottagare] [Skapa fakturaunderlag]       │
│                                                                 │
│  💡 Flera uppdrag med samma mottagare = samma faktura          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Markera uppdrag + klicka "Skapa"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FAKTURAUNDERLAG                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Datum     │ Uppdrag  │ Beskrivning      │ Timmar │ Belopp  │ │
│  ├───────────┼──────────┼──────────────────┼────────┼─────────┤ │
│  │ 2026-01-10│ C-001    │ Telefonsamtal    │  1.0h  │ 1 200kr │ │
│  │ 2026-01-12│ C-001    │ Platsbesök       │  2.5h  │ 3 000kr │ │
│  │ 2026-01-15│ C-003    │ E-post, möte     │  2.5h  │ 3 000kr │ │
│  ├───────────┴──────────┴──────────────────┼────────┼─────────┤ │
│  │                              SUMMA      │  6.0h  │ 7 200kr │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Redigera timmar inline] [Undanta rad] [Exportera CSV]        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Exportera
                              ▼
        Uppdragen försvinner från "Att fakturera"-vyn
        (time_entries.is_exported = true)
```

### Komponenter

#### 1. `src/features/billing/BillingPipeline.tsx` (REFAKTORERA)

**"Att fakturera"-vyn - kundlista:**

- Tabell med kunder sorterade A-Ö
- Kolumner: Kund | Att fakturera (belopp)
- Live-uppdateras när nya tidsregistreringar görs
- Kunder försvinner från listan när alla deras uppdrag är exporterade
- Klick på rad → navigera till kundvy

```tsx
// Hämtar alla kunder med oexporterade time_entries
const { data: customersToInvoice } = useCustomersWithUnbilledEntries();

// Visar:
// | Kund (A-Ö)      | Att fakturera |
// | Brf Almen       |     12 500 kr |
// | Brf Björken     |      8 200 kr |
```

#### 2. `src/features/billing/CustomerBillingView.tsx` (NY)

**Kundvy - allt fakturerbart för kunden:**

- Visar allt som ska faktureras: timbank, fastpris OCH löpande uppdrag
- Grupperat per fakturamottagare (contact med is_invoice_recipient = true)
- Checkboxar för att välja vad som hamnar på samma faktura
- Knapp: "Skapa fakturaunderlag" → skapar underlag för valda poster

```tsx
interface Props {
  customerId: string;
}

// Enkel lista - allt fakturerbart:
// Kalle Karlsson (ordförande):
//   ☐ Timbank 24h (årsavtal)           - 24 000 kr
//   ☐ C-001: Störningsärende           -  4 500 kr
//   ☐ C-003: Andrahandsärende          -  3 000 kr
// Lisa Larsson (ekonomiansvarig):
//   ☐ P-002: Trivselundersökning       -  5 000 kr
```

#### 3. `src/features/billing/InvoiceDraft.tsx` (NY, ersätter BillingPreview)

**Fakturaunderlag - detaljerad vy:**

- Visar alla time_entries för valda uppdrag
- Inline-redigering av timmar (synkas till journal_entry)
- Möjlighet att undanta rader
- Visa summa (uppdateras live)
- Exportera till CSV (markerar entries som exporterade)

### Hooks att skapa/ändra

#### `src/hooks/useBilling.ts`

```typescript
// NY: Hämta kunder med ofakturerade entries
export function useCustomersWithUnbilledEntries() {
  return useQuery({
    queryKey: ["billing", "unbilled-customers"],
    queryFn: async () => {
      // Hämtar kunder som har time_entries där is_exported = false
      // Summerar belopp per kund
      // Sorterar A-Ö på kundnamn
    },
  });
}

// NY: Hämta uppdrag per kund grupperade på fakturamottagare
export function useUnbilledAssignmentsByCustomer(customerId: string) {
  return useQuery({
    queryKey: ["billing", "unbilled-assignments", customerId],
    queryFn: async () => {
      // Hämtar uppdrag med oexporterade time_entries
      // Inkluderar fakturamottagare från contacts
      // Grupperar per mottagare
    },
  });
}

// NY: Skapa fakturaunderlag från valda uppdrag
export function useCreateInvoiceDraft() {
  return useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      // Skapar billing_batch
      // Kopplar time_entries till batch
    },
  });
}

// NY: Exportera och markera som fakturerat
export function useExportInvoiceDraft() {
  return useMutation({
    mutationFn: async (batchId: string) => {
      // Sätter is_exported = true på alla time_entries i batch
      // Genererar CSV
      // (Framtid: Skapar faktura i Fortnox)
    },
  });
}
```

### Beteende vid export

1. **Användaren klickar "Exportera"**
2. `time_entries.is_exported` sätts till `true`
3. `time_entries.export_batch_id` sätts till batch-ID
4. `billing_batches.status` sätts till `exported`
5. Dessa uppdrag försvinner från "Att fakturera"-vyn (query exkluderar exporterade)
6. CSV genereras och laddas ner

### Automatisk påfyllning av "Att fakturera"

**Timbank- och fastprisavtal dyker upp automatiskt:**

Avtal med `billing_anchor_date` visas i "Att fakturera" **en månad innan** faktureringsdatumet.

**Exempel:**

- Brf Jansen har timbanksavtal på 24h, ska faktureras 31 december
- Den 1 december dyker "Brf Jansen - 24 000 kr (Timbank)" upp i listan
- Konsulten har december månad på sig att fakturera

**Logik:**

```typescript
// Visa i "Att fakturera" om:
// 1. billing_anchor_date finns OCH
// 2. Nästa faktureringsdatum är inom 30 dagar OCH
// 3. Avtalet inte redan är fakturerat för denna period

function shouldShowInBillingQueue(agreement: Agreement): boolean {
  if (!agreement.billing_anchor_date) return false;

  const nextBillingDate = calculateNextBillingDate(
    agreement.billing_anchor_date,
    agreement.period, // 'yearly' eller 'monthly'
  );

  const daysUntilBilling = differenceInDays(nextBillingDate, new Date());

  // Visa om mindre än 30 dagar kvar till fakturering
  return daysUntilBilling <= 30 && daysUntilBilling >= 0;
}
```

**Vad visas för varje avtalstyp:**

| Avtalstyp            | Vad visas i listan         | Belopp                         |
| -------------------- | -------------------------- | ------------------------------ |
| Timbank (årsvis)     | "Timbank 24h (årsavtal)"   | `included_hours × hourly_rate` |
| Timbank (månadsvis)  | "Timbank 20h + 5h övertid" | Timbank + övertid              |
| Fastpris (årsvis)    | "Fastpris (årsavtal)"      | `fixed_amount`                 |
| Fastpris (månadsvis) | "Fastpris (månadsavtal)"   | `fixed_amount`                 |
| Löpande uppdrag      | "C-001: Störningsärende"   | Summa time_entries             |

**Allt i samma lista** - ingen uppdelning mellan avtalstyper i kundvyn.

### Rollbaserad åtkomst

**Faktureringsmodulen är endast synlig för användare med faktureringsrättigheter.**

#### Implementation

1. **Nytt fält på `profiles`-tabellen:**

```sql
ALTER TABLE profiles ADD COLUMN can_access_billing BOOLEAN DEFAULT false;
```

2. **Hook för att kontrollera åtkomst:**

```typescript
// src/hooks/useProfile.ts
export function useCanAccessBilling(): boolean {
  const { profile } = useAuth();
  return profile?.can_access_billing === true;
}
```

3. **Dölj i sidomenyn:**

```tsx
// src/components/layout/Sidebar.tsx
const canAccessBilling = useCanAccessBilling();

// Visa bara om användaren har rättighet
{
  canAccessBilling && <NavLink to="/billing">Fakturering</NavLink>;
}
```

4. **Skydda routen:**

```tsx
// src/App.tsx
<Route
  path="/billing/*"
  element={
    <RequireBillingAccess>
      <BillingPage />
    </RequireBillingAccess>
  }
/>
```

5. **RequireBillingAccess komponent:**

```tsx
// src/components/shared/RequireBillingAccess.tsx
function RequireBillingAccess({ children }) {
  const canAccess = useCanAccessBilling();

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return children;
}
```

#### Vem har åtkomst?

- Du och din delägare sätter `can_access_billing = true` i Supabase
- Övriga konsulter ser inte faktureringsmenyn alls
- Om någon försöker navigera direkt till `/billing` → redirectas till startsidan

### När är faktureringsarbetet klart?

- "Att fakturera"-vyn visar en tom lista
- Alla time_entries har `is_exported = true`
- Alla avtalsfakturor för månaden är exporterade
- Användaren loggar in på Fortnox och skickar fakturorna

---

## Fas 6: Fortnox-integration (Framtida)

### När användaren har API-credentials

#### 1. Ny fil: `src/lib/fortnox-api.ts`

```typescript
// OAuth2-flöde
// Skapa faktura som utkast
// Hämta fakturanummer
```

#### 2. Databasfält att använda

- `billing_batches.fortnox_invoice_number` - redan finns
- Ev. ny tabell `fortnox_customers` för att mappa kund-ID

#### 3. Fältmappning (från Blikk's modell)

- `customer.name` → Kundnamn i Fortnox
- Referens på uppdrag/kund → "Er referens"
- Referensmärkning → "Ert ordernummer"

### Felhantering (lärdom från Blikk)

- Ogiltigt VAT-nummer: Format ska vara "SExxxxxxxxxx01"
- Ogiltig mall: Kontrollera kundinställningar
- Saknade konton: Verifiera bokföringsinställningar

---

## Fas 6b: Fortnox Kundsynk

### Syfte

Synkronisera kunder mellan Grannfrid och Fortnox för att säkerställa att fakturor skapas med korrekta kunduppgifter.

### Principer

1. **Endast Fortnox kundnummer** - Vi använder Fortnox's kundnummer, inte vårt K-001 format
2. **Prospekt synkas INTE** - Endast kunder med `status != 'prospekt'` synkas till Fortnox
3. **Fortnox är master vid import** - Initial import hämtar alla kunder från Fortnox
4. **Grannfrid är master för nya** - Nya kunder skapade i Grannfrid auto-skapas i Fortnox

### Synkflöde

```
┌─────────────────────────────────────────────────────────────────┐
│                    INITIAL IMPORT (engång)                      │
│                                                                 │
│  Fortnox ──────────────────────────────────> Grannfrid         │
│                                                                 │
│  Hämta alla kunder från Fortnox API                            │
│  → Skapa i Grannfrid med fortnox_customer_id                   │
│  → Matcha på org_number om kund redan finns                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LÖPANDE SYNK                                 │
│                                                                 │
│  NY KUND I GRANNFRID (ej prospekt):                            │
│  Grannfrid ─────────────────────────────────> Fortnox          │
│  → POST /customers → få tillbaka CustomerNumber                │
│  → Spara fortnox_customer_id på kunden                         │
│                                                                 │
│  PROSPEKT BLIR KUND:                                           │
│  När status ändras från 'prospekt' till annat:                 │
│  → Skapa kund i Fortnox                                        │
│  → Spara fortnox_customer_id                                   │
│                                                                 │
│  MANUELL SYNK (knapp "Synka med Fortnox"):                     │
│  Fortnox ──────────────────────────────────> Grannfrid         │
│  → Hämta uppdateringar från Fortnox                            │
│  → Uppdatera ändrade fält i Grannfrid                          │
└─────────────────────────────────────────────────────────────────┘
```

### Fältmappning

| Grannfrid             | Fortnox                       | Obligatoriskt | Kommentar                                 |
| --------------------- | ----------------------------- | ------------- | ----------------------------------------- |
| `name`                | `Name`                        | Ja            | Kundnamn                                  |
| `org_number`          | `OrganisationNumber`          | Ja            | Organisationsnummer                       |
| `email`               | `Email`                       | Ja            | **Faktura-email** (dit fakturor mejlas)   |
| `address`             | `Address1`, `City`, `ZipCode` | Ja            | **Fakturaadress**                         |
| `phone`               | `Phone1`                      | Nej           | Telefonnummer                             |
| `fortnox_customer_id` | `CustomerNumber`              | Auto          | **Fortnox nummer används som kundnummer** |

### Databasändringar

```sql
-- Lägg till Fortnox-koppling på customers
ALTER TABLE customers ADD COLUMN fortnox_customer_id TEXT UNIQUE;

-- Ta bort vårt eget kundnummer (K-001 används inte längre)
-- OBS: Behåll customer_number för bakåtkompatibilitet men sluta använda det
-- Vid visning: visa fortnox_customer_id om det finns, annars customer_number
```

### Implementation

#### 1. Ny fil: `src/lib/fortnox-customers.ts`

```typescript
// Fortnox Customer API
interface FortnoxCustomer {
  CustomerNumber: string;
  Name: string;
  OrganisationNumber: string;
  Email: string;
  Address1: string;
  City: string;
  ZipCode: string;
  Phone1?: string;
}

// Hämta alla kunder från Fortnox
export async function fetchFortnoxCustomers(): Promise<FortnoxCustomer[]> {
  // GET /3/customers
}

// Skapa kund i Fortnox
export async function createFortnoxCustomer(
  customer: Partial<FortnoxCustomer>,
): Promise<string> {
  // POST /3/customers
  // Returnerar CustomerNumber
}

// Uppdatera kund i Fortnox
export async function updateFortnoxCustomer(
  customerNumber: string,
  data: Partial<FortnoxCustomer>,
): Promise<void> {
  // PUT /3/customers/{CustomerNumber}
}
```

#### 2. Hook: `src/hooks/useFortnoxSync.ts`

```typescript
// Initial import
export function useImportFromFortnox() {
  return useMutation({
    mutationFn: async () => {
      // 1. Hämta alla kunder från Fortnox
      // 2. För varje kund:
      //    - Kolla om org_number finns i Grannfrid
      //    - Om ja: uppdatera fortnox_customer_id
      //    - Om nej: skapa ny kund
      // 3. Invalidera customers query
    },
  });
}

// Synka uppdateringar
export function useSyncFromFortnox() {
  return useMutation({
    mutationFn: async () => {
      // Hämta kunder från Fortnox som ändrats
      // Uppdatera matchande kunder i Grannfrid
    },
  });
}

// Auto-skapa i Fortnox vid ny kund
export function useCreateCustomerWithFortnox() {
  return useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // 1. Skapa kund i Grannfrid
      // 2. Om status != 'prospekt':
      //    - Skapa kund i Fortnox
      //    - Spara fortnox_customer_id
    },
  });
}
```

#### 3. Ändring i `useCustomers.ts`

```typescript
// Uppdatera createCustomer för att auto-skapa i Fortnox
const createCustomer = useMutation({
  mutationFn: async (data: CustomerFormData) => {
    // 1. Skapa i Grannfrid
    const customer = await supabase
      .from("customers")
      .insert(data)
      .select()
      .single();

    // 2. Om inte prospekt och Fortnox är konfigurerat
    if (data.status !== "prospekt" && fortnoxEnabled) {
      const fortnoxId = await createFortnoxCustomer({
        Name: data.name,
        OrganisationNumber: data.org_number,
        Email: data.email,
        Address1: data.address,
        // ...
      });

      // 3. Spara Fortnox-ID
      await supabase
        .from("customers")
        .update({ fortnox_customer_id: fortnoxId })
        .eq("id", customer.id);
    }

    return customer;
  },
});
```

### UI-komponenter

#### Synk-knapp i Inställningar

```tsx
// src/features/settings/FortnoxSettings.tsx
function FortnoxSettings() {
  const importFromFortnox = useImportFromFortnox();
  const syncFromFortnox = useSyncFromFortnox();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fortnox-integration</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Initial import (visas endast om inga kunder har fortnox_customer_id) */}
        <Button onClick={() => importFromFortnox.mutate()}>
          Importera kunder från Fortnox
        </Button>

        {/* Manuell synk */}
        <Button onClick={() => syncFromFortnox.mutate()}>
          Synka med Fortnox
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### Visning av kundnummer

```tsx
// I kundlistan och kunddetalj, visa Fortnox-nummer
<span>{customer.fortnox_customer_id || customer.customer_number}</span>
```

### Prospekt → Kund-flöde

När en prospekt ändras till riktig kund:

```typescript
// I useUpdateCustomer
const updateCustomer = useMutation({
  mutationFn: async ({ id, ...data }) => {
    const oldCustomer = await getCustomer(id);

    // Kolla om status ändras från prospekt till något annat
    const becomingRealCustomer =
      oldCustomer.status === 'prospekt' &&
      data.status !== 'prospekt';

    // Uppdatera i Grannfrid
    const customer = await supabase.from('customers').update(data).eq('id', id);

    // Om blev riktig kund: skapa i Fortnox
    if (becomingRealCustomer && fortnoxEnabled) {
      const fortnoxId = await createFortnoxCustomer({...});
      await supabase.from('customers')
        .update({ fortnox_customer_id: fortnoxId })
        .eq('id', id);
    }

    return customer;
  }
});
```

### Timbank-reset (förtydligande)

**Inget separat fält behövs!** Timbanken nollställs alltid på avtalets startdatum (`valid_from`).

Beräkning av timbank-period:

```typescript
function getTimebankPeriodStart(agreement: Agreement): Date {
  const validFrom = new Date(agreement.valid_from);
  const today = new Date();

  if (agreement.period === "yearly") {
    // Hitta senaste årsdagen av valid_from
    let periodStart = new Date(validFrom);
    while (periodStart <= today) {
      periodStart.setFullYear(periodStart.getFullYear() + 1);
    }
    periodStart.setFullYear(periodStart.getFullYear() - 1);
    return periodStart;
  }

  if (agreement.period === "monthly") {
    // Hitta senaste månadsdagen av valid_from
    let periodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      validFrom.getDate(),
    );
    if (periodStart > today) {
      periodStart.setMonth(periodStart.getMonth() - 1);
    }
    return periodStart;
  }

  return validFrom;
}
```

---

## Indexeringsvarning

### Implementera på Dashboard

1. Visa varning om `next_indexation < 7 dagar`
2. Länka till avtalet för justering
3. Använd `AlertBanner`-komponent

---

## Databasändringar

### Nya fält och typer på `agreements`-tabellen

```sql
-- Lägg till billing_anchor_date
ALTER TABLE agreements ADD COLUMN billing_anchor_date DATE;
-- Första fakturadatum, upprepas sedan årligen/månadsvis beroende på period

-- Lägg till excluded_months (array av månader som hoppas över)
ALTER TABLE agreements ADD COLUMN excluded_months INTEGER[] DEFAULT '{}';
-- Exempel: {7} för att hoppa över juli, {7,8} för juli och augusti

-- Lägg till onetime som ny avtalstyp
ALTER TABLE agreements DROP CONSTRAINT agreements_type_check;
ALTER TABLE agreements ADD CONSTRAINT agreements_type_check
  CHECK (type IN ('hourly', 'timebank', 'fixed', 'onetime'));

-- Förtydliga projektavtal (fixed med slutdatum)
-- När valid_to är satt = projektavtal utan auto-förnyelse
-- När valid_to är NULL = löpande avtal med auto-förnyelse
```

### Valideringsregler för avtal (Zod)

```typescript
// src/lib/schemas.ts - agreementSchema utökning

export const agreementSchema = z
  .object({
    customer_id: z.string().uuid(),
    type: z.enum(["hourly", "timebank", "fixed", "onetime"]),
    hourly_rate: z.number().positive("Timpris måste vara positivt"),
    hourly_rate_evening: z.number().positive().optional(),
    overtime_rate: z.number().positive().optional(),
    included_hours: z.number().int().positive().optional(),
    period: z.enum(["monthly", "yearly"]).optional(),
    billing_advance: z.boolean().default(false),
    fixed_amount: z.number().positive().optional(),
    billing_month: z.number().int().min(1).max(12).optional(),
    valid_from: z.string(),
    valid_to: z.string().optional(),
    next_indexation: z.string().optional(),
    excluded_months: z
      .array(z.number().int().min(1).max(12))
      .optional()
      .default([]),
  })
  // VIKTIGT: Timbank MÅSTE ha overtime_rate
  .refine(
    (data) => {
      if (data.type === "timebank") {
        return data.overtime_rate && data.overtime_rate > 0;
      }
      return true;
    },
    {
      message:
        "Timbanksavtal kräver övertidspris (overtime_rate) för överskridande timmar",
      path: ["overtime_rate"],
    },
  )
  // VIKTIGT: Timbank kräver inkluderade timmar och period
  .refine(
    (data) => {
      if (data.type === "timebank") {
        return data.included_hours && data.period;
      }
      return true;
    },
    {
      message: "Timbanksavtal kräver inkluderade timmar och period",
      path: ["included_hours"],
    },
  )
  // VIKTIGT: Fastpris och onetime MÅSTE ha hourly_rate för extraarbete
  .refine(
    (data) => {
      if (data.type === "fixed" || data.type === "onetime") {
        return data.hourly_rate && data.hourly_rate > 0;
      }
      return true;
    },
    {
      message:
        "Fastpris/engångsavtal kräver timpris (hourly_rate) för extraarbete",
      path: ["hourly_rate"],
    },
  )
  // VIKTIGT: Fastpris och onetime MÅSTE ha fixed_amount
  .refine(
    (data) => {
      if (data.type === "fixed" || data.type === "onetime") {
        return data.fixed_amount && data.fixed_amount > 0;
      }
      return true;
    },
    {
      message: "Fastpris/engångsavtal kräver fast belopp (fixed_amount)",
      path: ["fixed_amount"],
    },
  )
  // VIKTIGT: Löpande avtal måste ha timpris
  .refine(
    (data) => {
      if (data.type === "hourly") {
        return data.hourly_rate && data.hourly_rate > 0;
      }
      return true;
    },
    {
      message: "Löpande avtal kräver timpris",
      path: ["hourly_rate"],
    },
  );
```

### Validering av excluded_months vid fakturering

```typescript
// src/lib/billing-logic.ts

/**
 * Kontrollera om en månad ska hoppas över för fakturering
 */
export function isMonthExcluded(
  excludedMonths: number[] | null,
  month: number,
): boolean {
  if (!excludedMonths || excludedMonths.length === 0) return false;
  return excludedMonths.includes(month);
}

/**
 * Beräkna nästa fakturadatum med hänsyn till excluded_months
 */
export function getNextBillingDate(
  anchorDate: Date,
  period: "monthly" | "yearly",
  excludedMonths: number[] = [],
): Date {
  let nextDate = calculateNextBillingDate(anchorDate, period);

  // Hoppa över exkluderade månader
  while (isMonthExcluded(excludedMonths, nextDate.getMonth() + 1)) {
    nextDate = addMonths(nextDate, 1);
  }

  return nextDate;
}
```

### Ny hook för tidsjustering

`src/hooks/useTimeEntries.ts` - Lägg till `useUpdateTimeEntry` mutation som:

1. Uppdaterar `time_entries.hours`
2. Om `journal_entry_id` finns: uppdaterar även `journal_entries.hours`

---

## Filer som kommer ändras

| Fil                                              | Ändring                                    |
| ------------------------------------------------ | ------------------------------------------ |
| `src/components/shared/TimebankStatusBadge.tsx`  | NY - Statusvisning                         |
| `src/hooks/useTimebank.ts`                       | UTÖKA - Ny hook för kundstatus             |
| `src/hooks/useJournal.ts`                        | ÄNDRA - Integrera split-logik              |
| `src/hooks/useTimeEntries.ts`                    | ÄNDRA - Lägg till useUpdateTimeEntry       |
| `src/features/customers/CustomerDetail.tsx`      | ÄNDRA - Lägg till badge                    |
| `src/features/assignments/AssignmentDetail.tsx`  | ÄNDRA - Lägg till badge                    |
| `src/features/billing/BillingPipeline.tsx`       | UTÖKA - "Att fakturera"-vy                 |
| `src/features/billing/BillingPreview.tsx`        | NY - Förhandsgranska och redigera underlag |
| `src/features/dashboard/IndexationAlert.tsx`     | ÄNDRA - Visa varning                       |
| `supabase/migrations/xxx_add_billing_anchor.sql` | NY - Lägg till billing_anchor_date         |

---

## Implementationsordning

### Sprint 1: Foundation (Fas 1-2)

1. Skapa TimebankStatusBadge komponent
2. Lägg till useTimebankStatusByCustomer hook
3. Integrera badge i CustomerDetail header
4. Integrera badge i AssignmentDetail header
5. Integrera split-logik i useJournal (calculateBillingWithSplit)

### Sprint 2: Fakturering UI (Fas 3-5)

1. Kör SQL-migration: `billing_anchor_date` på agreements
2. Verifiera BillingDetail visar split-entries korrekt
3. Förbättra BillingPipeline med:
   - Kundöversikt med belopp
   - Nästa fakturadatum-kolumn
4. Skapa BillingPreview med:
   - Lista alla time_entries
   - Inline-redigering av timmar
   - Synka ändringar till journal_entries
   - Undanta-funktion
5. Lägg till useUpdateTimeEntry i useTimeEntries.ts

### Sprint 3: Dashboard + Polish (Fas 4)

1. IndexationAlert på dashboard
2. Tester och buggfixar
3. Verifiera hela flödet end-to-end

### Sprint 4: Fortnox (Fas 6 - när credentials finns)

1. Fortnox API-integration
2. OAuth2-flöde
3. Automatisk fakturaskapning

---

## Fas 7: Konsultöversikt / Produktivitetsmätning

### Syfte

Ge ägarna insyn i konsulternas produktivitet och försäljning för lönesättning, målsättning och uppföljning.

### Konsultöversikt - Layout

```
┌─────────────────────────────────────────────────────────────┐
│  KONSULTÖVERSIKT: Anna Andersson                           │
│  Period: Januari 2026                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRODUKTION (arbete mot kund)                              │
│  ─────────────────────────────────────────────────────────  │
│  Timbanksarbete:          60h      60 000 kr               │
│  Fastprisarbete:          37h      37 000 kr               │
│  Löpande arbete:          45h      54 000 kr  ← fakturerbart│
│  ─────────────────────────────────────────────────────────  │
│  Totalt:                 142h     151 000 kr               │
│                                                             │
│  Beläggningsgrad:         88,75% (142h / 160h)             │
│                                                             │
│  FAKTURERBART DENNA MÅNAD                                  │
│  ─────────────────────────────────────────────────────────  │
│  Löpande:                  45h ×  1 200 kr =    54 000 kr  │
│  Övertid timbank:           5h ×  1 100 kr =     5 500 kr  │
│  ─────────────────────────────────────────────────────────  │
│  Totalt fakturerbart:                          59 500 kr   │
│                                                             │
│  FÖRSÄLJNING (nya avtal denna månad)                       │
│  ─────────────────────────────────────────────────────────  │
│  Brf Tallbacken   Timbank 24h    24 000 kr     ← NY!       │
│  Brf Granvägen    Timbank 30h    36 000 kr     ← NY!       │
│  ─────────────────────────────────────────────────────────  │
│  Nyförsäljning denna månad:        60 000 kr               │
│                                                             │
│  FÖRSÄLJNING (rullande 12 mån)                             │
│  ─────────────────────────────────────────────────────────  │
│  Totalt nyförsäljning:           180 000 kr                │
│  Antal nya avtal:                8 st                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Värdeberäkning per avtalstyp

| Avtalstyp               | Konsult          | Beräkning                                     |
| ----------------------- | ---------------- | --------------------------------------------- |
| **Löpande**             | Alla             | `timmar × timpris`                            |
| **Timbank**             | Alla             | `timmar × (avtalsvärde ÷ inkluderade_timmar)` |
| **Timbank övertid**     | Alla             | `timmar × övertidspris`                       |
| **Fastpris (ansvarig)** | Ansvarig konsult | `avtalsvärde − andras timmar`                 |
| **Fastpris (hjälper)**  | Andra konsulter  | `timmar × hourly_rate`                        |

### Fastpris - Effektivitetsbelöning

Ansvarig konsult får hela avtalsvärdet minus det andra konsulter bidragit med:

```
Fastpris 60 000 kr, ansvarig = Anna

Scenario: Anna (15h) + Erik hjälper (10h à 1 200 kr)
→ Eriks värde: 10h × 1 200 kr = 12 000 kr
→ Annas värde: 60 000 − 12 000 = 48 000 kr
→ Annas värde/timme: 48 000 / 15h = 3 200 kr
```

Detta belönar den som "äger" kundrelationen och uppmuntrar effektivitet.

### Försäljningsvärdering

**Försäljningsvärde = Hela avtalsvärdet vid signering**

När ett avtal signeras faktureras kunden direkt - det är verkligt kassaflöde, inte "potential".

```
Anna landar Brf Tallbacken: Timbank 24h × 1 000 kr = 24 000 kr
→ Annas försäljningsvärde: 24 000 kr (hela beloppet)

Månadsavtal 5 000 kr/mån:
→ Försäljningsvärde vid signering: 5 000 kr × 12 = 60 000 kr (årsvärde)
```

**Skillnad mellan Produktion och Försäljning:**

- **Produktion** = värdet av utfört arbete (leverans)
- **Försäljning** = värdet av nya avtal (affärsutveckling)

Båda är lika viktiga bidrag till bolaget, men mäter olika saker.

---

### Incitamentsanalys - Fallgropar att undvika

#### Problem 1: Fabricerade timmar på fastpriskunder

**Risk:** Konsult kan höja sin beläggningsgrad genom att registrera överdrivna/fabricerade timmar på fastpriskunder (kunden märker inte).

**Motåtgärd i systemet:** Fastpris ger INTE högre produktionsvärde per timme - tvärtom:

- Fler registrerade timmar = lägre värde/timme för ansvarig
- `60 000 kr / 15h = 4 000 kr/h` vs `60 000 kr / 60h = 1 000 kr/h`
- Systemet belönar effektivitet, inte tidsförbrukning

**Beläggningsgrad:** Fastpristimmar räknas till beläggning, men värde/timme syns tydligt i statistiken.

**Tillägg: "Timmar vs Estimat"-KPI**

- Visa `registrerade timmar / estimated_hours` som separat KPI
- Mönster blir synliga över tid (konsult X ligger alltid 3x över estimat)
- Hjälper ledningen justera prissättningen på nya avtal

#### Problem 2: Underprioritering av fastpriskunder

**Risk:** Konsult ignorerar fastpriskunder för att fokusera på löpande kunder (högre synligt värde).

**Motåtgärd:**

1. Fastprisavtal har `estimated_hours` - om konsulten lägger FÖR LITE tid syns det
2. Kundnöjdhet/churn trackas med `churned_at` + `churn_reason`
3. Fastpris-värdet tillfaller ansvarig konsult oavsett tidsåtgång
4. Ledningen ser om en konsult har många fastpriskunder som säger upp

**Dashboard-varningar:**

- Varning om fastpriskund har 0 registrerade timmar på 2+ månader
- Varning om konsult har hög churn-rate på sina kunder

**Viktigt om `estimated_hours`:**

- Kalla det "estimat", inte "budget" - för att undvika att det uppfattas som ett "tak"
- Kommunicera att det är en uppskattning för prissättning, inte ett mål att nå

#### Problem 3: "Sälja för mycket"

**Risk:** Konsult jagar nya avtal men har inte tid att leverera kvalitet.

**Motåtgärd:**

- Beläggningsgrad visar om konsulten är överbelastad (>100%)
- Produktionsvärde per timme sjunker om kvaliteten brister (fler timmar krävs)

#### Problem 4: Dubbelräkning försäljning + produktion

**Risk:** Försäljning räknas vid signering, produktion räknas löpande - samma avtal "räknas dubbelt"?

**Förtydligande:** Det är KORREKT att båda räknas:

- Försäljning = engångsinsats (hitta kund, förhandla, stänga)
- Produktion = löpande insats (leverera tjänsten)
- En konsult som säljer mycket men inte levererar syns tydligt
- En konsult som levererar men inte säljer syns också

### Sammanfattning: Incitamentsanalys

| Fallgrop                       | Motåtgärd                                                     |
| ------------------------------ | ------------------------------------------------------------- |
| Fabricerade timmar på fastpris | Värde/timme sjunker med fler timmar + "timmar vs estimat" KPI |
| Ignorerar fastpriskunder       | Varning vid 0 timmar på 2+ mån + churn-tracking               |
| Sälja för mycket               | Beläggningsgrad >100% syns tydligt                            |
| Dubbelräkning                  | Korrekt - båda KPI:er mäter olika insatser                    |

### Beläggningsgrad

```
Beläggning = Kundtimmar / Tillgängliga timmar

Exempel: 142h registrerade / 160h tillgängliga = 88,75%
```

**Notera:** Intern tid (möten, admin, utbildning) behöver inte registreras - de "försvunna" timmarna är naturlig overhead.

### Databasändringar

```sql
-- Nytt fält på agreements för estimat (fastpris)
ALTER TABLE agreements ADD COLUMN estimated_hours INTEGER;

-- Nya fält för försäljningsspårning
ALTER TABLE agreements ADD COLUMN sold_by UUID REFERENCES auth.users(id);
ALTER TABLE agreements ADD COLUMN sold_at DATE;

-- Nya fält för churn-spårning
ALTER TABLE agreements ADD COLUMN churned_at DATE;
ALTER TABLE agreements ADD COLUMN churn_reason TEXT;
```

### Hooks

```typescript
// src/hooks/useConsultantStats.ts

export function useConsultantProduction(
  consultantId: string,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["consultant", "production", consultantId, year, month],
    queryFn: async () => {
      // Hämta alla time_entries för konsulten under perioden
      // Gruppera per billing_type (timebank, overtime, hourly, fixed)
      // Beräkna värde per typ
      // Returnera totaler
    },
  });
}

export function useConsultantSales(
  consultantId: string,
  period: "month" | "year",
) {
  return useQuery({
    queryKey: ["consultant", "sales", consultantId, period],
    queryFn: async () => {
      // Hämta avtal där sold_by = consultantId
      // Filtrera på sold_at inom period
      // Beräkna årsvärde per avtal
      // Returnera lista + totaler
    },
  });
}
```

### Beräkningslogik

```typescript
// src/lib/consultant-stats.ts

interface ProductionByType {
  timebank: { hours: number; value: number };
  fixed: { hours: number; value: number };
  hourly: { hours: number; value: number };
  overtime: { hours: number; value: number };
}

function calculateHourlyValue(
  agreement: Agreement,
  consultantId: string,
  isResponsible: boolean,
): number {
  switch (agreement.type) {
    case "hourly":
      return agreement.hourly_rate;

    case "timebank":
      // Timbankvärde = avtalsvärde per timme
      return agreement.hourly_rate;

    case "fixed":
      if (isResponsible) {
        // Ansvarig konsult: värde beräknas i efterhand
        // (avtalsvärde - andras timmar)
        return 0; // Beräknas separat
      }
      // Hjälpande konsult: löpande timpris
      return agreement.hourly_rate;
  }
}

function calculateFixedPriceValue(
  agreement: Agreement,
  responsibleHours: number,
  othersValue: number,
): number {
  // Ansvarig konsults värde = avtalsvärde - andras bidrag
  return (agreement.fixed_amount || 0) - othersValue;
}

function calculateAgreementAnnualValue(agreement: Agreement): number {
  switch (agreement.type) {
    case "timebank":
      const timebankValue =
        (agreement.included_hours || 0) * agreement.hourly_rate;
      return agreement.period === "yearly" ? timebankValue : timebankValue * 12;

    case "fixed":
      return agreement.period === "yearly"
        ? agreement.fixed_amount || 0
        : (agreement.fixed_amount || 0) * 12;

    case "hourly":
      return 0; // Löpande har inget fast årsvärde
  }
}
```

### Komponenter

| Komponent                                        | Beskrivning                            |
| ------------------------------------------------ | -------------------------------------- |
| `src/features/consultant/ConsultantOverview.tsx` | Huvudvy för konsultstatistik           |
| `src/features/consultant/ProductionCard.tsx`     | Visar produktion per typ               |
| `src/features/consultant/SalesCard.tsx`          | Visar nyförsäljning                    |
| `src/features/consultant/ConsultantSelector.tsx` | Dropdown för att välja konsult (ägare) |

### Åtkomstkontroll

- **Varje konsult** ser sin egen översikt
- **Ägare** (can_access_billing = true) kan se alla konsulters översikt
- Lägg till route `/consultant/:id?` där id är valfritt (default = sig själv)

### KPI-sammanfattning

| KPI                 | Mäter                      | Källa                                             |
| ------------------- | -------------------------- | ------------------------------------------------- |
| Registrerade timmar | Arbetsinsats               | `time_entries.hours`                              |
| Timbanksarbete      | Värde av förbetalda timmar | `billing_type = timebank`                         |
| Fastprisarbete      | Värde av fast arbete       | `billing_type = fixed`                            |
| Löpande arbete      | Fakturerbart               | `billing_type = hourly`                           |
| Beläggningsgrad     | Effektivitet               | timmar / tillgänglig tid                          |
| Produktionsvärde    | Totalt värdeskapande       | Summa alla typer                                  |
| Fakturerbart        | Kassaflöde                 | Löpande + övertid                                 |
| Nyförsäljning       | Affärsutveckling           | `agreements.sold_by`                              |
| Timmar vs Estimat   | Prissättningskontroll      | `time_entries.hours / agreements.estimated_hours` |
| Churn-rate          | Kundlojalitet              | `agreements.churned_at`                           |

---

## Implementationsordning (uppdaterad)

### Sprint 5: Konsultöversikt (Fas 7)

1. Kör SQL-migration: `estimated_hours`, `sold_by`, `sold_at`, `churned_at`, `churn_reason` på agreements
2. Skapa `useConsultantProduction` och `useConsultantSales` hooks
3. Implementera `ConsultantOverview` med:
   - Produktion uppdelat per typ
   - Beläggningsgrad
   - Fakturerbart värde
   - Timmar vs Estimat för fastpriskunder
4. Implementera försäljningssektion
5. Lägg till åtkomstkontroll (ägare kan se alla)
6. Lägg till dashboard-varningar för:
   - Fastpriskunder utan aktivitet på 2+ månader
   - Hög churn-rate per konsult

### Sprint 6: Fortnox Kundsynk (Fas 6b)

1. Kör SQL-migration: `fortnox_customer_id` på customers
2. Skapa `src/lib/fortnox-customers.ts` med API-funktioner
3. Skapa `useFortnoxSync` hook med:
   - `useImportFromFortnox()` - initial import
   - `useSyncFromFortnox()` - manuell synk
4. Uppdatera `useCustomers.ts`:
   - Auto-skapa i Fortnox vid ny kund (om ej prospekt)
   - Auto-skapa vid prospekt → kund-ändring
5. Skapa `FortnoxSettings.tsx` med:
   - Import-knapp (initial)
   - Synka-knapp (löpande)
6. Uppdatera kundvisning: visa `fortnox_customer_id` istället för `customer_number`

### Sprint 7: Medverkande konsulter (Fas 8)

1. Kör SQL-migration: skapa `time_entry_participants` tabell
2. Skapa `useTimeEntryParticipants` hook
3. Uppdatera JournalEditor med "Lägg till medverkande konsult"-funktionalitet
4. Uppdatera JournalTimeline för att visa alla deltagande konsulter
5. Uppdatera fakturarader att visa båda konsulternas namn

### Sprint 8: Inkluderade tjänster/Åtaganden (separat modul - ej fakturering)

Se separat specifikation: `docs/legacy/AVTALSTJANSTER_SPEC.md`

---

## Fas 8: Medverkande konsulter

### Syfte

Möjliggöra att flera konsulter kan registrera tid på samma journalpost vid gemensamma aktiviteter (t.ex. hembesök, kontrollbesök vid olovlig andrahand). Detta undviker dubbletter i journalen och ger en tydlig fakturabild.

### Användarflöde

```
┌─────────────────────────────────────────────────────────────────┐
│  JOURNALEDITOR (ny post)                                        │
│  ───────────────────────────────────────────────────────────── │
│  Beskrivning: [Gemensamt kontrollbesök Storgatan 12          ] │
│  Typ: [Platsbesök ▼]     Tid: [2.5h]                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Min tid:         2.5h                                │   │
│  │                                                         │   │
│  │ + Lägg till medverkande konsult                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Klickar på "Lägg till medverkande konsult"]                  │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Min tid:         2.5h                                │   │
│  │                                                         │   │
│  │ 👤 Erik Eriksson ▼  [2.5h]   [🗑️]                      │   │
│  │                                                         │   │
│  │ + Lägg till medverkande konsult (max 2 st)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [💾 Spara journalpost]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Vad sparas

**En journalpost skapas (den primära)**:

- Kopplas till den som skriver (skaparen)
- Timmar för skaparen lagras i `time_entries`

**Separata time_entries för varje medverkande konsult**:

- Samma `journal_entry_id` för alla
- Varje konsult får sin egen `time_entry` med rätt `created_by`
- Alla får rätt konsultkredit i produktionsstatistiken

### Databasschema

```sql
-- Tabell för medverkande konsulter på journalposter
CREATE TABLE time_entry_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES auth.users(id) NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- En konsult kan bara vara med en gång per journalpost
  UNIQUE(journal_entry_id, consultant_id)
);

-- RLS
ALTER TABLE time_entry_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON time_entry_participants
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Index
CREATE INDEX idx_time_entry_participants_journal ON time_entry_participants(journal_entry_id);
CREATE INDEX idx_time_entry_participants_consultant ON time_entry_participants(consultant_id);
```

### TypeScript-typer

```typescript
// src/types/database.ts

export interface TimeEntryParticipant {
  id: string;
  journal_entry_id: string;
  time_entry_id: string;
  consultant_id: string;
  hours: number;
  created_at: string;
}

export interface TimeEntryParticipantWithProfile extends TimeEntryParticipant {
  consultant: Profile;
}

// Utökad journalpost med deltagare
export interface JournalEntryWithParticipants extends JournalEntry {
  participants: TimeEntryParticipantWithProfile[];
}
```

### Hooks

```typescript
// src/hooks/useTimeEntryParticipants.ts

export function useJournalParticipants(journalEntryId: string) {
  return useQuery({
    queryKey: ["journal-participants", journalEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entry_participants")
        .select(
          `
          *,
          consultant:profiles!consultant_id (id, name, avatar_url)
        `,
        )
        .eq("journal_entry_id", journalEntryId);

      if (error) throw error;
      return data as TimeEntryParticipantWithProfile[];
    },
    enabled: !!journalEntryId,
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalEntryId: string;
      consultantId: string;
      hours: number;
      customerId: string;
      assignmentId: string;
      agreementId: string | null;
      billingType: BillingType;
      hourlyRate: number;
    }) => {
      // 1. Skapa time_entry för den medverkande konsulten
      const { data: timeEntry, error: teError } = await supabase
        .from("time_entries")
        .insert({
          customer_id: data.customerId,
          assignment_id: data.assignmentId,
          agreement_id: data.agreementId,
          journal_entry_id: data.journalEntryId,
          date: new Date().toISOString().split("T")[0],
          hours: data.hours,
          billing_type: data.billingType,
          hourly_rate: data.hourlyRate,
          is_billable: data.billingType !== "internal",
          created_by: data.consultantId,
        })
        .select()
        .single();

      if (teError) throw teError;

      // 2. Skapa participant-kopplingen
      const { data: participant, error: pError } = await supabase
        .from("time_entry_participants")
        .insert({
          journal_entry_id: data.journalEntryId,
          time_entry_id: timeEntry.id,
          consultant_id: data.consultantId,
          hours: data.hours,
        })
        .select()
        .single();

      if (pError) throw pError;
      return participant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["journal-participants", variables.journalEntryId],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
    },
  });
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: string) => {
      // Hämta participant först för att få time_entry_id
      const { data: participant, error: fetchError } = await supabase
        .from("time_entry_participants")
        .select("time_entry_id, journal_entry_id")
        .eq("id", participantId)
        .single();

      if (fetchError) throw fetchError;

      // Ta bort time_entry (cascade tar bort participant)
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", participant.time_entry_id);

      if (error) throw error;
      return participant.journal_entry_id;
    },
    onSuccess: (journalEntryId) => {
      queryClient.invalidateQueries({
        queryKey: ["journal-participants", journalEntryId],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
    },
  });
}
```

### UI-komponenter

#### ParticipantSelector.tsx

```tsx
// src/features/assignments/ParticipantSelector.tsx

interface Props {
  journalEntryId?: string; // Undefined vid ny post
  participants: ParticipantInput[];
  onAdd: (participant: ParticipantInput) => void;
  onRemove: (index: number) => void;
  onHoursChange: (index: number, hours: number) => void;
  maxParticipants?: number; // Default 2
}

interface ParticipantInput {
  consultantId: string;
  consultantName: string;
  hours: number;
}

export function ParticipantSelector({
  participants,
  onAdd,
  onRemove,
  onHoursChange,
  maxParticipants = 2,
}: Props) {
  const { profile } = useAuth();
  const { data: consultants } = useConsultants(); // Hämtar alla konsulter

  // Filtrera bort redan valda konsulter och sig själv
  const availableConsultants = consultants?.filter(
    (c) =>
      c.id !== profile?.id &&
      !participants.some((p) => p.consultantId === c.id),
  );

  return (
    <div className="space-y-3 p-4 bg-cream rounded-lg">
      {/* Egen tid (alltid visas) */}
      <div className="flex items-center gap-3 text-sm">
        <Avatar
          src={profile?.avatar_url}
          fallback={profile?.name?.[0]}
          size="sm"
        />
        <span className="font-medium">{profile?.name}</span>
        <span className="text-ash">(din tid i fältet ovan)</span>
      </div>

      {/* Lista medverkande */}
      {participants.map((participant, index) => (
        <div key={index} className="flex items-center gap-3">
          <Avatar fallback={participant.consultantName[0]} size="sm" />
          <span className="font-medium flex-1">
            {participant.consultantName}
          </span>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={participant.hours}
            onChange={(e) =>
              onHoursChange(index, parseFloat(e.target.value) || 0)
            }
            className="w-20"
          />
          <span className="text-ash">h</span>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <Trash2 className="w-4 h-4 text-error" />
          </Button>
        </div>
      ))}

      {/* Lägg till knapp */}
      {participants.length < maxParticipants &&
        availableConsultants?.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Lägg till medverkande konsult
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableConsultants.map((consultant) => (
                <DropdownMenuItem
                  key={consultant.id}
                  onClick={() =>
                    onAdd({
                      consultantId: consultant.id,
                      consultantName: consultant.name,
                      hours: 0,
                    })
                  }
                >
                  <Avatar
                    src={consultant.avatar_url}
                    fallback={consultant.name[0]}
                    size="sm"
                  />
                  <span className="ml-2">{consultant.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

      {participants.length >= maxParticipants && (
        <p className="text-sm text-ash">
          Max {maxParticipants} medverkande konsulter
        </p>
      )}
    </div>
  );
}
```

### Integration i JournalEditor

```tsx
// Utökning av JournalEditor.tsx

export function JournalEditor({ assignmentId, onSave, ... }: JournalEditorProps) {
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);

  const handleAddParticipant = (participant: ParticipantInput) => {
    setParticipants([...participants, participant]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleHoursChange = (index: number, hours: number) => {
    const updated = [...participants];
    updated[index].hours = hours;
    setParticipants(updated);
  };

  const onSubmit = async (data: JournalFormData) => {
    // Skicka med participants till onSave
    await onSave({
      ...data,
      content: editor?.getJSON(),
      participants
    });
    setParticipants([]); // Rensa efter spara
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ... befintliga fält ... */}

      {/* Medverkande konsulter */}
      <ParticipantSelector
        participants={participants}
        onAdd={handleAddParticipant}
        onRemove={handleRemoveParticipant}
        onHoursChange={handleHoursChange}
      />

      {/* ... submit knapp ... */}
    </form>
  );
}
```

### Visning i JournalTimeline

```tsx
// Utökning av JournalTimeline.tsx

function JournalEntryCard({
  entry,
  participants,
}: {
  entry: JournalEntry;
  participants?: TimeEntryParticipantWithProfile[];
}) {
  return (
    <Card>
      {/* ... befintligt innehåll ... */}

      {/* Visa deltagare */}
      {participants && participants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-sand">
          <p className="text-xs text-ash mb-2">Medverkande:</p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-1 text-sm">
                <Avatar
                  src={p.consultant.avatar_url}
                  fallback={p.consultant.name[0]}
                  size="xs"
                />
                <span>{p.consultant.name}</span>
                <span className="text-ash">({p.hours}h)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
```

### Fakturarader med flera konsulter

När en journalpost har medverkande konsulter visas **en summerad fakturarad** med alla konsultnamn:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Datum      │ Uppdrag  │ Beskrivning              │ Timmar │ Belopp    │
├────────────┼──────────┼──────────────────────────┼────────┼───────────┤
│ 2026-01-15 │ C-001    │ Gemensamt kontrollbesök  │  5.0h  │ 6 000 kr  │
│            │          │ Anna A, Erik E           │        │           │
└────────────────────────────────────────────────────────────────────────┘
```

Implementering i BillingDetail:

```tsx
// Gruppera time_entries per journal_entry_id
const entriesGroupedByJournal = groupBy(timeEntries, "journal_entry_id");

// För varje grupp: summera timmar, kombinera konsultnamn
const invoiceLines = Object.entries(entriesGroupedByJournal).map(
  ([journalId, entries]) => {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const totalAmount = entries.reduce(
      (sum, e) => sum + e.hours * (e.hourly_rate || 0),
      0,
    );
    const consultantNames = entries.map((e) => e.created_by_name).join(", ");

    return {
      date: entries[0].date,
      assignmentNumber: entries[0].assignment_number,
      description: entries[0].description,
      consultants: consultantNames,
      hours: totalHours,
      amount: totalAmount,
    };
  },
);
```

### Begränsningar

- **Max 2-3 medverkande konsulter** (konfigurerbart, default 2)
- Varje konsult kan bara vara med **en gång per journalpost**
- Medverkande konsulter kan bara läggas till vid **skapande** av journalpost (inte redigering) - för enkelhetens skull i MVP

---

## Fas 9: Inkluderade tjänster/Åtaganden

> **OBS:** Denna funktion handlar om **avtalsleverans och kunduppföljning**, INTE faktureringslogik.
> Fullständig specifikation finns i `docs/legacy/AVTALSTJANSTER_SPEC.md`

### Syfte

Spåra vilka tjänster som ingår i ett avtal och markera dem som utförda. Detta ger översikt över vad som faktiskt levereras inom avtalet och hjälper konsulter att säkerställa att alla åtaganden uppfylls.

### Kort sammanfattning

**Varför det inte är fakturering:**

- Inkluderade tjänster påverkar INTE fakturabelopp
- Det är en checklista för kvalitetsuppföljning
- Hjälper konsulten att komma ihåg vad som ska göras
- Ger kunden transparens om vad som levereras

**Integration med faktureringsvy:**

- En varning visas vid fakturaexport om det finns oavslutade tjänster
- Men det blockerar inte fakturering - det är bara en påminnelse

Se fullständig specifikation i `docs/legacy/AVTALSTJANSTER_SPEC.md`

### Exempel från verkliga avtal

Från analyserade avtal identifierades följande typer av inkluderade tjänster:

**Timbanksavtal (t.ex. 60h/år):**

- Driva störningsärenden
- Telefonrådgivning till styrelsen
- Rådgivning gällande andrahandsuthyrningar
- Medverkan på 1 styrelsemöte per år

**Fastprisavtal:**

- Månadsvis genomgång av störningsrapporter
- Kvartalsvis statusrapport till styrelsen
- Årlig översyn av trivselregler

### Databasschema

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

### TypeScript-typer

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

### Hooks

```typescript
// src/hooks/useAgreementServices.ts

export function useAgreementServices(agreementId: string) {
  return useQuery({
    queryKey: ["agreement-services", agreementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_services")
        .select("*")
        .eq("agreement_id", agreementId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as AgreementService[];
    },
    enabled: !!agreementId,
  });
}

export function useAgreementServicesWithStatus(
  agreementId: string,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["agreement-services", agreementId, "status", year, month],
    queryFn: async () => {
      // Hämta tjänster med kompletteringsstatus för aktuell period
      const { data: services, error: servicesError } = await supabase
        .from("agreement_services")
        .select(
          `
          *,
          service_completions!inner (
            id,
            completed_by,
            completed_at,
            period_year,
            period_month,
            period_quarter,
            profiles!completed_by (name)
          )
        `,
        )
        .eq("agreement_id", agreementId)
        .eq("is_active", true);

      // ... beräkna status baserat på frequency och period
    },
  });
}

export function useCreateAgreementService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<AgreementService, "id" | "created_at">) => {
      const { data: service, error } = await supabase
        .from("agreement_services")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return service;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["agreement-services", variables.agreement_id],
      });
    },
  });
}

export function useCompleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      serviceId: string;
      year: number;
      month?: number;
      quarter?: number;
      notes?: string;
    }) => {
      const { data: completion, error } = await supabase
        .from("service_completions")
        .insert({
          service_id: data.serviceId,
          completed_by: (await supabase.auth.getUser()).data.user?.id,
          period_year: data.year,
          period_month: data.month,
          period_quarter: data.quarter,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return completion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreement-services"] });
    },
  });
}

export function useUncompleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (completionId: string) => {
      const { error } = await supabase
        .from("service_completions")
        .delete()
        .eq("id", completionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreement-services"] });
    },
  });
}
```

### Komponenter

```
src/features/agreements/
├── AgreementServicesTab.tsx     # Flik på avtalsvy - lista över inkluderade tjänster
├── ServiceForm.tsx              # Modal för att lägga till/redigera tjänst
├── ServiceChecklistItem.tsx     # Rad med checkbox för tjänst
└── ServiceProgressBadge.tsx     # Badge: "3 av 5 utförda"
```

#### ServiceChecklistItem.tsx

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

#### ServiceProgressBadge.tsx

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

### Integration i befintlig UI

#### På kunddetaljsidan (CustomerDetail.tsx)

Visa en sammanfattning av inkluderade tjänster och status:

```tsx
// I kundens header eller info-sektion
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

#### På avtalssidan (AgreementDetail.tsx)

En egen flik eller sektion för att hantera inkluderade tjänster:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Översikt</TabsTrigger>
    <TabsTrigger value="services">Inkluderade tjänster</TabsTrigger>
    <TabsTrigger value="billing">Fakturering</TabsTrigger>
  </TabsList>

  <TabsContent value="services">
    <AgreementServicesTab agreementId={agreement.id} />
  </TabsContent>
</Tabs>
```

### Beräkning av period

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
      return { year }; // Använder år som fallback
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
      return true; // Samma år räcker
    case "once":
      return true; // Om det finns en completion, är det klart
    case "on_demand":
      return false; // Aldrig "klar" - syns alltid
  }
}
```

### Koppling till faktureringspipeline

När användaren skapar fakturaunderlag visas en varning om det finns oavslutade tjänster för perioden:

```tsx
// I CustomerBillingView.tsx eller InvoiceDraft.tsx
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
