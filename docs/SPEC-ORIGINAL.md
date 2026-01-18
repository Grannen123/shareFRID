# Grannfrid App – Komplett Produkt- och Funktionsspecifikation

**Version:** 4.0 (kanonisk)
**Datum:** 2026-01-18
**Syfte:** Fullständig specifikation för Grannfrid-appen – "the grand plan"

---

## 1. Syfte och målgrupp

### 1.1 Vad är Grannfrid?

Grannfrid 2.0 är en CRM/produktivitetsapp för bostadskonsulter som hanterar störningsärenden, utredningar och bosociala uppdrag för BRF:er och fastighetsbolag.

### 1.2 Målgrupp

- **Primär:** Konsulter på Grannfrid AB (Göteborg och Stockholm)
- **Användare:** 5-10 konsulter, litet team med full transparens

### 1.3 Kärnbehov

- Snabb ärendehantering med tidsregistrering
- Tydlig kunduppföljning och avtalshantering
- Faktureringsunderlag med stöd för timbank, fastpris och löpande
- Kunskapsdelning mellan konsulter

---

## 2. Omfattning

### 2.1 Nuvarande funktionalitet (implementerad)

- **Auth + profil** – Supabase Auth med användarprofilhantering
- **Kunder + avtal** – CRUD för kunder, avtalstyper, kundanteckningar
- **Uppdrag + journal** – Ärendehantering med journalanteckningar
- **Tidsregistrering** – Kopplade till journal, stödjer timbank-split
- **Uppgifter** – Koppling till kund/uppdrag, tilldelning, statushantering
- **Kontakter** – Globala och kopplade till kund/uppdrag
- **Anteckningsbok** – Fristående notes, kan kopplas till kund/uppdrag
- **Filer** – Uppladdning på kund- och uppdragsnivå
- **Dashboard** – KPI-kort, aktivitetsflöde, uppgiftswidget
- **Fakturering** – Underlag, summering, CSV-export
- **Kunskapsbank** – Artiklar med kategorifiltrering

### 2.2 Planerad funktionalitet (se ROADMAP.md)

- Fakturering 2.0 (timbank-split, "Att fakturera"-pipeline, Fortnox)
- Inkluderade tjänster (åtagande-checklista per avtal)
- Medverkande konsulter (flera konsulter per journalpost)

---

## 3. Viktiga beslut (gällande nu)

| Beslut                               | Motivering                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| **TipTap används INTE**              | Journalanteckningar är plain text/textarea. Enklare och snabbare.      |
| **hourly_rate_evening borttagen**    | Kvällspris finns inte i UI – användes aldrig i praktiken.              |
| **GDPR-radering tillåten**           | Journalposter och uppdrag kan raderas helt (inte bara arkiveras).      |
| **Anteckningar frivilligt kopplade** | Okopplade anteckningar stannar i Anteckningsbok.                       |
| **withTimeout() obligatorisk**       | Alla Supabase-queries måste wrappas för att undvika hängande UI.       |
| **Single-tenant**                    | Workspace är för rapportering, inte åtkomstkontroll. Full transparens. |

---

## 4. Affärslogik

### 4.1 Kundtyper

| Typ                         | Beskrivning               |
| --------------------------- | ------------------------- |
| `brf`                       | Bostadsrättsförening      |
| `kommunalt_fastighetsbolag` | Kommunalt fastighetsbolag |
| `privat_fastighetsbolag`    | Privat fastighetsbolag    |
| `forvaltningsbolag`         | Förvaltningsbolag         |
| `stiftelse`                 | Stiftelse                 |
| `samfallighet`              | Samfällighet              |
| `ovrig`                     | Övrig                     |

### 4.2 Kundstatus

- `active` – Aktiv kund med pågående avtal
- `prospekt` – Potentiell kund
- `vilande` – Vilande/pausad kund

### 4.3 Avtalstyper

#### Löpande (hourly)

- Alla timmar faktureras direkt till timpris
- Ingen timbank eller fast belopp
- Enklaste modellen

#### Timbank (timebank)

- X timmar ingår per period (månads- eller årsvis)
- När banken är slut → överskridande faktureras som övertid
- **Obligatoriska fält:** `included_hours`, `period`, `overtime_rate`

**Årsvis timbank:**

- Kunden köper timbank en gång/år (förskott)
- Under året dras timmar från banken (ingen faktura)
- När banken slut: överskridande faktureras löpande
- Nästa år: påfyllning (ny faktura på samma datum)

**Månadsvis timbank:**

- Timbank + ev. övertid faktureras varje månad
- Ex: "20h ingår, 25h förbrukade → faktura för 5h övertid"

#### Fastpris (fixed)

- Fast månads- eller årsbelopp
- Timmar loggas för statistik men genererar ingen faktura
- Extraarbete faktureras till förbestämt timpris (`hourly_rate`)
- **Obligatoriska fält:** `fixed_amount`, `hourly_rate` (för extraarbete)

#### Engångsbelopp (onetime) – PLANERAD

- Engångsuppdrag med fast pris
- Faktureras en gång när uppdraget är klart
- `fixed_amount` anger totalpriset
- `hourly_rate` för eventuellt extraarbete

### 4.4 Timbank-split

När en tidsregistrering överskrider timbanken skapas automatiskt två time_entries:

```
Scenario: 5h kvar i timbank, registrerar 8h
→ Entry 1: 5h med billing_type='timebank' (0 kr)
→ Entry 2: 3h med billing_type='overtime' (3h × övertidspris)
```

Split-logiken körs i `calculateBillingWithSplit()` i `src/lib/billing-logic.ts`.

### 4.5 Uppdragstyper

| Typ       | Prefix | Beskrivning                            |
| --------- | ------ | -------------------------------------- |
| `case`    | C-001  | Ärende (störning, andrahand etc.)      |
| `project` | P-001  | Projekt (utredning, undersökning etc.) |

### 4.6 Uppdragskategorier

- `disturbance` – Störningsutredning
- `illegal_sublet` – Olovlig andrahandsuthyrning
- `screening` – Boendeundersökning
- `renovation_coordination` – Renoveringssamordning
- `investigation` – Utredning
- `other` – Övrigt

### 4.7 Prioritet och status

**Prioritet:**

- `low` – Låg
- `medium` – Medium
- `high` – Hög

**Uppdragsstatus:**

- `active` – Aktivt uppdrag
- `paused` – Vilande/pausat
- `closed` – Avslutat

**Uppgiftsstatus:**

- `pending` – Att göra
- `in_progress` – Pågående
- `done` – Klar

---

## 5. Kärnflöden

### 5.1 Kund → Uppdrag → Journal → Tidsregistrering

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   KUND      │───>│   UPPDRAG   │───>│   JOURNAL   │───>│ TIME_ENTRY  │
│   K-001     │    │   C-001     │    │  Anteckning │    │  2h timbank │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                                       │
      ▼                  ▼                                       ▼
┌─────────────┐    ┌─────────────┐                        ┌─────────────┐
│   AVTAL     │    │   FILER     │                        │  FAKTURA    │
│   Timbank   │    │   PDF, bilder│                       │  underlag   │
└─────────────┘    └─────────────┘                        └─────────────┘
```

1. **Kund skapas** med kundnummer (K-001) och avtalstyp
2. **Uppdrag kopplas** till kund med uppdragsnummer (C-001 eller P-001)
3. **Journalpost skapas** med anteckning och valfria timmar
4. **Time_entry skapas** automatiskt om timmar > 0
5. **Timbank-split** sker automatiskt vid överskridande
6. **Faktureringsunderlag** byggs av oexporterade time_entries

### 5.2 Uppgiftshantering

- Uppgifter kan kopplas till kund och/eller uppdrag
- Uppgifter kan tilldelas kollega eller lämnas otilldelade
- Status växlas direkt i listor och detaljvyer
- Förfallodatum med visuell markering

### 5.3 Anteckningsbok

- Snabbanteckningar (quick_notes) skapas fristående
- Kan senare kopplas till kund (→ customer_notes) eller uppdrag (→ journal_entries)
- Koppling till uppdrag kan ange tidpunkt (tidsruta)
- Okopplade anteckningar stannar i Anteckningsbok

### 5.4 Filhantering

- Filer laddas upp på kund- eller uppdragsnivå
- Lagras i Supabase Storage bucket `files`
- GDPR: Radering av uppdrag/journal tar bort relaterade filer

---

## 6. Datamodell

### 6.1 Entitetsrelationer

```
workspaces (1) ─────< (N) customers
customers (1) ─────< (N) assignments
customers (1) ─────< (N) agreements
customers (1) ─────< (N) customer_notes
customers (1) ─────< (N) contacts
customers (1) ─────< (N) tasks
customers (1) ─────< (N) files

assignments (1) ─────< (N) journal_entries
assignments (1) ─────< (N) tasks
assignments (1) ─────< (N) contacts
assignments (1) ─────< (N) files

journal_entries (1) ─────< (N) time_entries
journal_entries (1) ─────< (N) files

agreements (1) ─────< (N) time_entries

quick_notes ─────> customer_notes (vid koppling till kund)
quick_notes ─────> journal_entries (vid koppling till uppdrag)
```

### 6.2 Huvudtabeller

#### customers

| Fält                      | Typ     | Beskrivning             |
| ------------------------- | ------- | ----------------------- |
| id                        | UUID    | Primärnyckel            |
| workspace_id              | UUID    | FK till workspaces      |
| customer_number           | TEXT    | Auto-genererat (K-001)  |
| name                      | TEXT    | Kundnamn                |
| org_number                | TEXT    | Organisationsnummer     |
| email, phone, address     | TEXT    | Kontaktinfo             |
| antal_lagenheter          | INTEGER | Antal lägenheter        |
| customer_type             | ENUM    | Kundtyp                 |
| status                    | ENUM    | active/prospekt/vilande |
| responsible_consultant_id | UUID    | FK till auth.users      |

#### agreements

| Fält                 | Typ     | Beskrivning                     |
| -------------------- | ------- | ------------------------------- |
| id                   | UUID    | Primärnyckel                    |
| customer_id          | UUID    | FK till customers               |
| type                 | ENUM    | hourly/timebank/fixed           |
| status               | ENUM    | draft/active/expired/terminated |
| hourly_rate          | NUMERIC | Timpris                         |
| overtime_rate        | NUMERIC | Övertidspris (för timbank)      |
| included_hours       | INTEGER | Timmar i timbanken              |
| period               | ENUM    | monthly/yearly                  |
| fixed_amount         | NUMERIC | Fast belopp (för fastpris)      |
| valid_from, valid_to | DATE    | Giltighetsperiod                |
| next_indexation      | DATE    | Nästa indexeringsdatum          |

#### assignments

| Fält              | Typ  | Beskrivning                  |
| ----------------- | ---- | ---------------------------- |
| id                | UUID | Primärnyckel                 |
| customer_id       | UUID | FK till customers            |
| agreement_id      | UUID | FK till agreements           |
| assignment_number | TEXT | Auto-genererat (C-001/P-001) |
| title             | TEXT | Rubrik                       |
| description       | TEXT | Beskrivning                  |
| type              | ENUM | case/project                 |
| category          | ENUM | Ärendekategori               |
| status            | ENUM | active/paused/closed         |
| priority          | ENUM | low/medium/high              |

#### journal_entries

| Fält              | Typ     | Beskrivning                        |
| ----------------- | ------- | ---------------------------------- |
| id                | UUID    | Primärnyckel                       |
| assignment_id     | UUID    | FK till assignments                |
| content           | TEXT    | Anteckningstext (plain text)       |
| hours             | NUMERIC | Registrerade timmar                |
| billing_comment   | TEXT    | Kommentar för faktura              |
| is_extra_billable | BOOLEAN | Extraarbete (debiteras separat)    |
| entry_type        | ENUM    | call/email/meeting/site_visit/note |
| is_archived       | BOOLEAN | Arkiveringsflagga                  |
| created_by        | UUID    | FK till auth.users                 |

#### time_entries

| Fält             | Typ     | Beskrivning                             |
| ---------------- | ------- | --------------------------------------- |
| id               | UUID    | Primärnyckel                            |
| customer_id      | UUID    | FK till customers                       |
| assignment_id    | UUID    | FK till assignments                     |
| agreement_id     | UUID    | FK till agreements                      |
| journal_entry_id | UUID    | FK till journal_entries                 |
| date             | DATE    | Datum för arbetet                       |
| hours            | NUMERIC | Antal timmar                            |
| billing_type     | ENUM    | timebank/overtime/hourly/fixed/internal |
| hourly_rate      | NUMERIC | Timpris vid skapande                    |
| is_billable      | BOOLEAN | Ska faktureras                          |
| is_exported      | BOOLEAN | Har exporterats                         |
| export_batch_id  | UUID    | FK till billing_batches                 |

#### tasks

| Fält          | Typ  | Beskrivning                    |
| ------------- | ---- | ------------------------------ |
| id            | UUID | Primärnyckel                   |
| customer_id   | UUID | FK till customers (valfritt)   |
| assignment_id | UUID | FK till assignments (valfritt) |
| title         | TEXT | Rubrik                         |
| description   | TEXT | Beskrivning                    |
| due_date      | DATE | Förfallodatum                  |
| priority      | ENUM | low/medium/high                |
| status        | ENUM | pending/in_progress/done       |
| assigned_to   | UUID | FK till auth.users             |

### 6.3 Auto-genererade nummer

- **Kundnummer:** K-001, K-002 (via `customer_number_seq`)
- **Ärendenummer:** C-001, C-002 (via `assignment_case_seq`)
- **Projektnummer:** P-001, P-002 (via `assignment_project_seq`)

Sequences är concurrency-safe via PostgreSQL SEQUENCE.

---

## 7. Teknisk arkitektur

### 7.1 Tech Stack

| Lager         | Teknologi                 | Version         |
| ------------- | ------------------------- | --------------- |
| Frontend      | React                     | 18.x            |
| Språk         | TypeScript                | 5.x             |
| Byggverktyg   | Vite                      | 7.x             |
| Styling       | Tailwind CSS              | 4.x (CSS-first) |
| State         | TanStack React Query      | 5.x             |
| Forms         | React Hook Form + Zod     | -               |
| Routing       | React Router              | 6.x             |
| UI Components | Radix UI                  | -               |
| Icons         | Lucide React              | -               |
| Toasts        | Sonner                    | -               |
| Backend       | Supabase                  | -               |
| Database      | PostgreSQL (via Supabase) | -               |
| Auth          | Supabase Auth             | -               |

### 7.2 Mappstruktur

```
src/
├── components/
│   ├── layout/          # AppShell, Sidebar, Header
│   ├── shared/          # LoadingSpinner, EmptyState, ErrorState
│   └── ui/              # Button, Card, Input, Dialog, etc.
├── contexts/
│   └── AuthContext.tsx  # Autentisering
├── features/            # Domänspecifika komponenter
│   ├── assignments/     # Uppdragshantering
│   ├── billing/         # Fakturering
│   ├── contacts/        # Kontakthantering
│   ├── customers/       # Kundhantering
│   ├── dashboard/       # Dashboard widgets
│   ├── files/           # Filhantering
│   ├── knowledge/       # Kunskapsbank
│   ├── profile/         # Användarprofil
│   └── tasks/           # Uppgiftshantering
├── hooks/               # React Query hooks
├── lib/
│   ├── billing-logic.ts # Timbank-beräkningar
│   ├── constants.ts     # Svenska labels
│   ├── queryKeys.ts     # React Query cache keys
│   ├── schemas.ts       # Zod validering
│   └── supabase.ts      # Supabase-klient (singleton)
├── pages/               # Route-komponenter
└── types/
    └── database.ts      # TypeScript typer
```

### 7.3 Kritiska patterns

#### withTimeout() för Supabase

```typescript
const { data, error } = await withTimeout(
  supabase.from("customers").select("*"),
  10000, // 10s timeout
);
```

#### React Query v5 (object signature)

```typescript
useQuery({
  queryKey: queryKeys.customers.all,
  queryFn: async () => { ... }
});
```

#### Supabase Singleton

```typescript
const globalScope = globalThis as { __supabase?: SupabaseClient };
const supabaseClient = globalScope.__supabase ?? createClient(...);
```

### 7.4 Workspace-modell

- **Single-tenant** med workspace som organisatorisk indelning
- **Två workspaces:** Göteborg och Stockholm
- **RLS filtrerar på** `auth.uid()`, inte workspace_id
- **Full transparens** – alla ser all data

---

## 8. Design

### 8.1 Designspråk

"Editorial Magazine Style" – professionellt, läsbart, lugnt.

### 8.2 Färgpalett (RGB-format)

| Namn       | RGB         | Användning      |
| ---------- | ----------- | --------------- |
| sage       | 135 169 107 | Primärfärg, CTA |
| terracotta | 212 103 74  | Varningar, fel  |
| lavender   | 155 143 191 | Info, accenter  |
| charcoal   | 44 40 36    | Text            |
| ash        | 90 85 80    | Sekundär text   |
| cream      | 249 247 244 | Bakgrund        |
| sand       | 240 237 232 | Kort, borders   |

### 8.3 Typografi

- **Display:** Lora (serif) – rubriker
- **Body:** Inter (sans-serif) – brödtext

---

## 9. Säkerhet och GDPR

### 9.1 Row Level Security (RLS)

- Alla tabeller har RLS aktiverat
- Policies kräver `auth.uid() IS NOT NULL`
- Profile-tabellen begränsad till egen profil

### 9.2 GDPR

- Journalposter och uppdrag kan raderas permanent
- Radering kaskaderar till relaterade filer
- Inga "soft deletes" för GDPR-data

### 9.3 Auth

- Supabase Auth med email/password
- 5s timeout på getSession() för att undvika hängande UI
- 3s timeout på signOut()

---

## 10. Fakturering

### 10.1 Nuvarande implementation

- Time_entries aggregeras per kund och period
- CSV-export för import till Fortnox
- Manuell batch-skapande

### 10.2 Planerad fakturering 2.0 (se ROADMAP.md)

#### "Att fakturera"-pipeline

```
┌─────────────────────────────────────────┐
│       "ATT FAKTURERA"-VY            │
│  ┌───────────────────────────────┐  │
│  │ Kund (A-Ö)     │ Att fakturera│  │
│  ├───────────────────────────────┤  │
│  │ Brf Almen      │    12 500 kr │  │
│  │ Brf Björken    │     8 200 kr │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────────┘
            │ Klicka på kund
            ▼
┌─────────────────────────────────────────┐
│      KUNDVY (drill-down)            │
│  Uppdrag grupperade per mottagare   │
│  ☐ C-001: Störning      4 500 kr    │
│  ☐ P-002: Utredning     5 000 kr    │
│  [Skapa fakturaunderlag]            │
└─────────────────────────────────────────┘
            │ Exportera
            ▼
     time_entries.is_exported = true
     Försvinner från listan
```

#### Statusflöde

`draft` → `review` → `exported` → `locked`

---

## 11. Icke-mål (nu)

| Funktion                  | Status    | Motivering                 |
| ------------------------- | --------- | -------------------------- |
| Rich text-editor (TipTap) | Bortvald  | Plain text räcker, enklare |
| Kvällspris                | Borttagen | Användes aldrig            |
| Attestering/approval      | Ej behov  | Litet team, alla litar     |
| Multi-tenant              | Ej behov  | Endast för rapportering    |
| Offline-läge              | Framtid   | Kräver service worker      |

---

## 12. Källor och referenser

- **ROADMAP.md** – Planerade funktioner och prioritering
- **SETUP.md** – Miljö och Supabase-konfiguration
- **ARCHITECTURE.md** – Teknisk arkitektur och patterns
- **CLAUDE.md** – Instruktioner för AI-assisterad utveckling

---

## Ändringslogg

| Datum      | Version | Ändringar                                   |
| ---------- | ------- | ------------------------------------------- |
| 2026-01-18 | 4.0     | Omfattande uppdatering med alla detaljer    |
| 2026-01-17 | 3.0     | Förenkling, TipTap borttagen, GDPR-radering |
| 2026-01-15 | 2.0     | Codex-konsolidering                         |
