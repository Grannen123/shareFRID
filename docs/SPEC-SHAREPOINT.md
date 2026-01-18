# Grannfrid App – SharePoint Edition

**Version:** 1.3
**Datum:** 2026-01-18
**Syfte:** Fullständig specifikation för Grannfrid-appen med SharePoint som backend

---

## 1. Översikt

### 1.1 Vad är Grannfrid?

En CRM/produktivitetsapp för bostadskonsulter som hanterar störningsärenden, utredningar och bosociala uppdrag för BRF:er och fastighetsbolag.

### 1.2 Målgrupp

- **Primär:** Konsulter på Grannfrid AB (Göteborg och Stockholm)
- **Användare:** 5-10 konsulter, litet team med full transparens
- **Ägare:** Jonas + delägare (extra behörigheter)

### 1.3 Kärnbehov

- Snabb ärendehantering med tidsregistrering
- Tydlig kunduppföljning och avtalshantering
- Faktureringsunderlag med stöd för timbank, fastpris och löpande
- Kunskapsdelning mellan konsulter
- AI-assistans för dagligt arbete

---

## 2. Arkitektur

### 2.1 Systemöversikt

```
┌─────────────────────────────────────────────────────────────┐
│                      ANVÄNDARE                               │
│         (Webb / Mobil / Röst via Whisper)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    REACT-APP (Frontend)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Dashboard│ │ Kunder  │ │ Uppdrag │ │Faktura  │ ...       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AI-CHATT (alltid närvarande)            │   │
│  │         Claude (EU) + Gemini (Vertex AI EU)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   MICROSOFT GRAPH API    │  │      AZURE FUNCTIONS         │
│  (Läs/skriv, kalender)   │  │  (Affärslogik, timbank-split)│
└──────────────────────────┘  └──────────────────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     SHAREPOINT                               │
│              (Markdown-filer + JSON-index)                  │
│                                                             │
│  /Grannfrid              /Grannfrid AB                      │
│  (alla konsulter)        (endast ägare)                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Teknisk stack

| Lager          | Teknologi                     |
| -------------- | ----------------------------- |
| Frontend       | React 18 + TypeScript         |
| Byggverktyg    | Vite                          |
| Styling        | Tailwind CSS                  |
| State          | TanStack React Query          |
| Forms          | React Hook Form + Zod         |
| Routing        | React Router                  |
| UI-komponenter | Radix UI                      |
| Ikoner         | Lucide React                  |
| Toasts         | Sonner                        |
| Auth           | Microsoft SSO (via MSAL)      |
| Backend        | SharePoint (via Graph API)    |
| Serverless     | Azure Functions (affärslogik) |
| AI             | Claude (EU) + Vertex AI (EU)  |
| Röst           | Whisper API                   |

### 2.3 AI-strategi (GDPR-säker)

| AI               | Deployment           | Region                    | Användning                      |
| ---------------- | -------------------- | ------------------------- | ------------------------------- |
| **Claude**       | Anthropic API        | EU (AWS Frankfurt)        | Konversation, analys, skrivande |
| **Gemini Flash** | Vertex AI (GCP)      | `europe-north1` (Finland) | Bulk-operationer, beräkningar   |
| **Whisper**      | Azure Speech / Lokal | EU                        | Tal till text (diktering)       |

#### GDPR-garanti

- **Ingen träning:** Varken Anthropic eller Google tränar på din data via enterprise-API:er
- **Data residency:** All data processas och lagras inom EU
- **Isolering:** Din data blandas inte med andra kunders

#### Konfiguration

```typescript
// lib/ai/gemini.ts
import { VertexAI } from "@google-cloud/vertexai";

export const gemini = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: "europe-north1", // Finland - GDPR-säkert
});

// lib/ai/claude.ts
import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.anthropic.com", // EU routing via AWS
});
```

### 2.4 Concurrency & Filåtkomst

#### Problemet

Två konsulter redigerar samma fil samtidigt → sista sparningen vinner, data förloras.

#### Lösningen: ETag-baserad Optimistic Locking

```typescript
// lib/graph/file-operations.ts

async function updateFileWithLock(
  path: string,
  content: string,
  etag: string,
): Promise<{ success: boolean; newEtag: string }> {
  try {
    const response = await graphClient
      .api(`/sites/${siteId}/drive/root:${path}:/content`)
      .header("If-Match", etag) // Endast om filen är oförändrad
      .put(content);

    return { success: true, newEtag: response.eTag };
  } catch (error) {
    if (error.statusCode === 412) {
      // Precondition Failed - någon annan har ändrat filen
      throw new ConcurrencyError(
        "Filen har ändrats av någon annan. Ladda om och försök igen.",
      );
    }
    throw error;
  }
}
```

#### UI-hantering

```
┌────────────────────────────────────────────────┐
│ ⚠️ Konflikt upptäckt                           │
│                                                │
│ Peter sparade ändringar i detta ärende         │
│ medan du redigerade.                           │
│                                                │
│ Dina ändringar:                                │
│ + Samtal med Magnus 30 min                     │
│                                                │
│ [Ladda om & behåll mina] [Visa Peters version] │
└────────────────────────────────────────────────┘
```

### 2.5 Backend-logik (Azure Functions)

Affärskritisk logik körs **inte** i frontend utan i Azure Functions:

| Function            | Trigger         | Ansvar                                  |
| ------------------- | --------------- | --------------------------------------- |
| `timbank-calculate` | HTTP / Timer    | Beräkna timbank-split, uppdatera ledger |
| `index-rebuild`     | Timer (nattlig) | Bygg om System Index från källfiler     |
| `billing-aggregate` | HTTP            | Aggregera faktureringsunderlag          |
| `journal-validate`  | HTTP            | Validera journalpost innan sparning     |

#### Timbank-split Function

```typescript
// functions/timbank-calculate/index.ts
import { AzureFunction, Context, HttpRequest } from "@azure/functions";

interface TimebankSplitRequest {
  agreement_id: string;
  minutes: number;
  entry_id: string;
}

const timebankCalculate: AzureFunction = async (
  context: Context,
  req: HttpRequest,
): Promise<void> => {
  const { agreement_id, minutes, entry_id } = req.body as TimebankSplitRequest;

  // 1. Hämta ledger
  const ledger = await getLedger(agreement_id);

  // 2. Beräkna split
  const remaining = ledger.computed.remaining_minutes;

  if (minutes <= remaining) {
    // Allt ryms i timbanken
    await addLedgerEntry(ledger, {
      type: "usage",
      minutes,
      entry_id,
      balance_after: remaining - minutes,
    });

    context.res = {
      body: {
        billing_lines: [
          {
            type: "timebank",
            minutes,
            rate: 0,
            amount: 0,
          },
        ],
      },
    };
  } else {
    // Split krävs
    const overtimeMinutes = minutes - remaining;
    const rate = ledger.overtime_rate;

    await addLedgerEntry(ledger, {
      type: "usage",
      minutes: remaining,
      entry_id,
      balance_after: 0,
    });

    await addLedgerEntry(ledger, {
      type: "overtime",
      minutes: overtimeMinutes,
      entry_id,
      balance_after: 0,
    });

    context.res = {
      body: {
        billing_lines: [
          { type: "timebank", minutes: remaining, rate: 0, amount: 0 },
          {
            type: "overtime",
            minutes: overtimeMinutes,
            rate,
            amount: (overtimeMinutes / 60) * rate,
          },
        ],
      },
    };
  }
};

export default timebankCalculate;
```

### 2.6 Write Pipeline & Outbox Pattern

#### Problemet

En typisk skrivoperation involverar flera filer:

1. Skapa journalfil
2. Uppdatera ledger
3. Skapa billing_lines i index
4. Uppdatera cases.json (total_minutes)
5. Logga ai_log

Om steg 3 misslyckas men 1-2 lyckas → inkonsistent data.

#### Lösningen: Operation Outbox

```
/System/outbox/
├── pending/
│   └── op_2026-01-18T14-32-00_abc123.json
├── applied/
│   └── op_2026-01-18T14-30-00_xyz789.json
└── failed/
    └── op_2026-01-18T14-28-00_err456.json
```

#### Operation-format

```json
{
  "operation_id": "op_2026-01-18T14-32-00_abc123",
  "type": "create_journal_entry",
  "created_at": "2026-01-18T14:32:00Z",
  "created_by": "user_peter",
  "status": "pending",
  "payload": {
    "case_id": "C-26-047",
    "entry_id": "jrn_2026-01-18_abc123",
    "minutes": 30
  },
  "steps": [
    {
      "action": "create_file",
      "path": "/Journal/jrn_...",
      "status": "pending"
    },
    {
      "action": "update_ledger",
      "agreement_id": "agr_...",
      "status": "pending"
    },
    { "action": "create_billing_line", "status": "pending" },
    { "action": "update_case_index", "status": "pending" }
  ],
  "completed_at": null,
  "error": null
}
```

#### Azure Function: Operation Processor

```typescript
// functions/process-outbox/index.ts
import { AzureFunction, Context } from "@azure/functions";

const processOutbox: AzureFunction = async (
  context: Context,
): Promise<void> => {
  const pendingOps = await listFiles("/System/outbox/pending/");

  for (const opFile of pendingOps) {
    const op = await readJson(opFile);

    try {
      for (const step of op.steps) {
        if (step.status === "pending") {
          await executeStep(step);
          step.status = "completed";
          await updateOperation(op); // Checkpoint efter varje steg
        }
      }

      op.status = "applied";
      op.completed_at = new Date().toISOString();
      await moveToApplied(op);
    } catch (error) {
      op.status = "failed";
      op.error = error.message;
      await moveToFailed(op);
    }
  }
};

// Timer trigger: varje minut
export default processOutbox;
```

#### UI-indikator

```
┌────────────────────────────────────────────────┐
│ ⏳ Sparar...                                   │
│                                                │
│ Din journalpost bearbetas.                     │
│ Detta tar normalt 1-2 sekunder.                │
│                                                │
│ [Steg 2/4: Uppdaterar timbank...]              │
└────────────────────────────────────────────────┘
```

#### Recovery

Om en operation fastnar i `pending` > 5 minuter:

1. Nattlig job retry:ar
2. Admin kan manuellt markera som `failed`
3. Index-rebuild återställer konsistens

---

## 3. SharePoint-struktur

### 3.1 Huvudstruktur

```
/Grannfrid
│
├── /Kunder - Göteborg           📱 APP-MODUL
│   └── /[Kundnamn]
│       ├── kund.md
│       ├── /Avtal
│       ├── /Uppdrag
│       └── /Dokument
│
├── /Kunder - Stockholm          📱 APP-MODUL
│   └── /[Kundnamn]
│       └── ...
│
├── /Arbetsyta                   📱 APP-MODUL
│   ├── uppgifter.md
│   └── /Anteckningar
│
├── /Kunskapsbank                📱 APP-MODUL
│   ├── /Rutiner
│   ├── /Juridik
│   └── /Best practice
│
├── /Intranät                    📁 FRI MAPP
├── /Mallar                      📁 FRI MAPP
├── /Marknadsföring              📁 FRI MAPP
├── /Utbildning                  📁 FRI MAPP
├── /Kundvård                    📁 FRI MAPP
├── /Försäljning                 📁 FRI MAPP
│
└── /System                      ⚙️ APP-DATA
    ├── config.md
    ├── /index                   # Maskinläsbara index (JSON)
    │   ├── customers.json
    │   ├── cases.json
    │   ├── agreements.json
    │   └── billing_lines.json
    ├── /ledger                  # Avtals-ledgers
    │   └── /agreements
    │       └── {agreement_id}.json
    └── /Fakturering

/Grannfrid AB                    🔒 ENDAST ÄGARE
├── /Personal
├── /Ekonomi
└── /Strategi
```

### 3.2 Mapptyper

| Typ           | Beskrivning                             | Appen              |
| ------------- | --------------------------------------- | ------------------ |
| **App-modul** | Strukturerad data, visas i dedikerad vy | Läser/skriver      |
| **Fri mapp**  | Valfri organisation, alla filtyper      | Visar, öppnar      |
| **App-data**  | Teknisk konfiguration                   | Dold för användare |

### 3.3 Kundmapp (detaljerad)

```
/Kunder - Göteborg/HSB Brf Björkekärr
│
├── kund.md                      # Kundinfo + kontakter
│
├── /Avtal
│   ├── Ramavtal 2024.md         # Avtalsdata (timbank, priser)
│   └── Ramavtal 2024.pdf        # Original-PDF
│
├── /Uppdrag
│   └── /C-047 Störning Ekvägen
│       ├── uppdrag.md           # Journal + uppgifter
│       └── /Filer
│           ├── foto-skador.jpg
│           └── varningsbrev.pdf
│
└── /Dokument                    # Övrigt (ej kopplat till uppdrag)
    └── organisationsschema.pdf
```

---

## 4. Datamodell (Markdown-filer)

### 4.1 ID-struktur (VIKTIGT)

Alla entiteter har stabila, unika ID:n för att säkerställa dataintegritet:

| Entitet     | Format                    | Exempel                    |
| ----------- | ------------------------- | -------------------------- |
| Kund        | `cust_{8char}`            | `cust_7x3kM9pQ`            |
| Avtal       | `agr_{8char}`             | `agr_9m2pK4nL`             |
| Ärende      | `C-{ÅÅ}-{NNN}`            | `C-26-047`                 |
| Projekt     | `P-{ÅÅ}-{NNN}`            | `P-26-012`                 |
| Kontakt     | `cont_{8char}`            | `cont_4n8jR2wX`            |
| Journalpost | `jrn_{timestamp}_{6char}` | `jrn_20260118T1432_abc123` |
| Fakturarad  | `bill_{period}_{6char}`   | `bill_2026-01_def456`      |
| Konsult     | `user_{aadObjectId}`      | `user_a1b2c3d4-e5f6-...`   |

**Principer:**

1. **Namn i metadata, inte i ID:** Namn kan ändras, ID:n är permanenta
2. **Collision-proof:** Använd tillräckligt långa slumpmässiga strängar (8+ tecken)
3. **Konsulter:** Använd Azure AD Object ID för garanterad unikhet
4. **Display slug:** För läsbara URLs kan en separat `slug` användas

```typescript
// lib/id-generator.ts
import { nanoid } from "nanoid";

export const generateId = {
  customer: () => `cust_${nanoid(8)}`,
  agreement: () => `agr_${nanoid(8)}`,
  contact: () => `cont_${nanoid(8)}`,
  journal: () => `jrn_${Date.now()}_${nanoid(6)}`,
  billing: (period: string) => `bill_${period}_${nanoid(6)}`,
  // Konsulter använder AAD Object ID
  user: (aadObjectId: string) => `user_${aadObjectId}`,
};
```

**Varför inte namn i ID?**

- Två "Karin Lindström" → kollision
- Namn ändras (giftemål) → trasiga relationer
- Specialtecken i namn → URL-problem

---

### 4.2 kund.md

```yaml
---
customer_id: cust_bjorkekärr_7x3k
fortnox_kundnummer: "10045"
namn: HSB Brf Björkekärr
org_nummer: 769612-3456
adress: Björkekärrsgatan 15
postnummer: "41729"
ort: Göteborg
email: styrelsen@brfbjorkekärr.se
telefon: 031-123456
antal_lagenheter: 48
typ: brf
status: active
ansvarig_id: user_peter
workspace: goteborg
skapad: 2024-03-15
---

## Anteckningar
- Bra relation med styrelseordförande Karin
- Föredrar mail framför telefon
- Faktureras kvartalsvis

## Kontakter
| contact_id | Namn | Roll | E-post | Telefon | Fakturamottagare |
|------------|------|------|--------|---------|------------------|
| cont_lindstrom_4n8j | Karin Lindström | Styrelseordf | karin@brfbjorkekärr.se | 070-1234567 | ✓ |
| cont_johansson_8k2m | Erik Johansson | Ekonomi | erik@brfbjorkekärr.se | 070-2345678 | ✓ |
| cont_svensson_2p7q | Maria Svensson | Viceordf | maria@brfbjorkekärr.se | 070-3456789 | |
```

### 4.2 Kundtyper

| Typ                         | Beskrivning               |
| --------------------------- | ------------------------- |
| `brf`                       | Bostadsrättsförening      |
| `kommunalt_fastighetsbolag` | Kommunalt fastighetsbolag |
| `privat_fastighetsbolag`    | Privat fastighetsbolag    |
| `forvaltningsbolag`         | Förvaltningsbolag         |
| `stiftelse`                 | Stiftelse                 |
| `samfallighet`              | Samfällighet              |
| `ovrig`                     | Övrig                     |

### 4.3 Kundstatus

| Status     | Beskrivning                   |
| ---------- | ----------------------------- |
| `active`   | Aktiv kund med pågående avtal |
| `prospekt` | Potentiell kund               |
| `vilande`  | Vilande/pausad kund           |

---

### 4.4 avtal.md

```yaml
---
agreement_id: agr_bjorkekärr_2024_9m2p
customer_id: cust_bjorkekärr_7x3k
namn: Ramavtal 2024
typ: timebank
status: active
timpris: 1400
overtidspris: 1600
timmar_inkluderade: 50
period: yearly
giltig_fran: 2024-01-01
giltig_till: 2024-12-31
nasta_indexering: 2025-01-01
fakturering: kvartalsvis
---
## Villkor
- Timbanken betalas i förskott vid årets början
- Övertid faktureras löpande månadsvis
- Indexering enligt SCB fastighetsprisindex
```

**OBS:** `timmar_anvanda` och `timmar_kvar` lagras INTE i avtal.md längre. Se 4.13 Agreement Ledger.

### 4.5 Avtalstyper

#### Löpande (hourly)

- Alla timmar faktureras direkt till timpris
- Ingen timbank eller fast belopp
- **Fält:** `timpris`

#### Timbank (timebank)

- X timmar ingår per period
- Överskridande faktureras som övertid
- **Fält:** `timpris`, `overtidspris`, `timmar_inkluderade`, `period`

#### Fastpris (fixed)

- Fast månads- eller årsbelopp
- Timmar loggas för statistik
- Extraarbete faktureras separat
- **Fält:** `fast_belopp`, `timpris` (för extra)

#### Engångsbelopp (onetime)

- Engångsuppdrag med fast pris
- Faktureras vid avslut
- **Fält:** `fast_belopp`, `timpris` (för extra)

---

### 4.6 uppdrag.md

```yaml
---
case_id: C-26-047
customer_id: cust_bjorkekärr_7x3k
agreement_id: agr_bjorkekärr_2024_9m2p
billing_contact_id: cont_lindstrom_4n8j
typ: case
kategori: disturbance
status: active
prioritet: high
titel: Störning Ekvägen 15
beskrivning: Musikstörning nattetid från lgh 1102
ansvarig_id: user_peter
adress: Ekvägen 15, lgh 1102
skapad: 2026-01-10
deadline: 2026-01-31
---

## Kontakter
| Namn | Roll | Telefon | E-post |
|------|------|---------|--------|
| Anna Ericsson | Klagande (lgh 1103) | 070-5568065 | anna.e@gmail.com |
| Magnus Tornblad | Störande (lgh 1102) | 070-5296219 | magnus.t@hotmail.com |

## Uppgifter
- [ ] Uppföljningssamtal med hyresgäst @Peter #2026-01-22
- [ ] Dokumentera för styrelsen @Peter #2026-01-25
- [x] Skicka varningsbrev @Peter ✓2026-01-17

## Journal

### 2026-01-18 | Samtal | Peter | 30 min
Pratat med hyresgäst Magnus. Han nekar till störning, hävdar att det var engångsfest för födelsedag. Verkar defensiv men samarbetsvillig. Lovade att vara tystare framöver.

### 2026-01-17 | Mail | Peter | 15 min | extra
Skickat första varningsbrev till hyresgäst. Kopia till styrelsen.
> Fakturatext: Upprättande och utskick av varningsbrev

### 2026-01-15 | Möte | Jonas | 1 h
Uppstartsmöte med klagande (Anna & hennes man Lars). De är mycket upprörda, störningar pågått sedan november. Anna har sömnproblem.

### 2026-01-10 | Samtal | Peter | 20 min
Inkommande samtal från styrelseordförande Karin som beskriver ärendet. Tre klagomål inkomna senaste månaden.
```

### 4.7 Uppdragstyper

| Typ       | Prefix | Beskrivning                       |
| --------- | ------ | --------------------------------- |
| `case`    | C-001  | Ärende (störning, andrahand etc.) |
| `project` | P-001  | Projekt (utredning, undersökning) |

### 4.8 Uppdragskategorier

| Kategori                  | Beskrivning                 |
| ------------------------- | --------------------------- |
| `disturbance`             | Störningsutredning          |
| `illegal_sublet`          | Olovlig andrahandsuthyrning |
| `screening`               | Boendeundersökning          |
| `renovation_coordination` | Renoveringssamordning       |
| `investigation`           | Utredning                   |
| `other`                   | Övrigt                      |

### 4.9 Status och prioritet

**Uppdragsstatus:**
| Status | Beskrivning |
|--------|-------------|
| `active` | Pågående |
| `paused` | Pausat/vilande |
| `closed` | Avslutat |

**Prioritet:**
| Prioritet | Beskrivning |
|-----------|-------------|
| `low` | Låg |
| `medium` | Medium |
| `high` | Hög |

---

### 4.10 Journalpost-format (narrativ)

Journalposter i markdown är **narrativa** - mänskligt läsbara anteckningar.

```markdown
### {DATUM} | {TYP} | {KONSULT} | {TID} | {FLAGGOR}

<!-- entry_id: jrn_2026-01-18_abc123 -->

{ANTECKNINGSTEXT}

> Fakturatext: {BILLING_COMMENT}
```

**Fält:**

| Fält            | Format                                 | Exempel               |
| --------------- | -------------------------------------- | --------------------- |
| entry_id        | HTML-kommentar                         | jrn_2026-01-18_abc123 |
| Datum           | YYYY-MM-DD                             | 2026-01-18            |
| Typ             | samtal/mail/möte/platsbesök/anteckning | Samtal                |
| Konsult         | Namn (läsbart, ID i index)             | Peter                 |
| Tid             | X min / X h / X.X h                    | 30 min                |
| Flaggor         | extra, timbank, övertid                | extra                 |
| Anteckningstext | Fritext                                | Pratat med...         |
| Fakturatext     | Efter `> Fakturatext:`                 | Uppföljningssamtal    |

**Entry types:**

| Typ        | Intern kod |
| ---------- | ---------- |
| Samtal     | call       |
| Mail       | email      |
| Möte       | meeting    |
| Platsbesök | site_visit |
| Anteckning | note       |

#### Alternativ: Separata journalfiler (rekommenderas)

För att undvika merge-konflikter kan journalposter lagras som **separata filer**:

```
/Uppdrag/C-26-047 Störning Ekvägen/
├── uppdrag.md                    # Metadata + uppgifter (ingen journal)
└── /Journal/
    ├── jrn_2026-01-10_abc123.md  # En fil per post
    ├── jrn_2026-01-15_def456.md
    ├── jrn_2026-01-17_ghi789.md
    └── jrn_2026-01-18_jkl012.md
```

**Fördelar:**

- Ingen risk för överskrivning vid samtidig redigering
- Enklare ETag-hantering (en fil per post)
- Snabbare diff vid synkronisering

**Journalfil-format:**

```yaml
---
entry_id: jrn_2026-01-18_jkl012
case_id: C-26-047
date: 2026-01-18
type: call
consultant_id: user_peter
minutes: 30
flags: []
billing_text: null
---
Pratat med hyresgäst Magnus. Han nekar till störning, hävdar att det var engångsfest för födelsedag. Verkar defensiv men samarbetsvillig. Lovade att vara tystare framöver.
```

**Val av strategi:**

| Strategi              | Användning                                          |
| --------------------- | --------------------------------------------------- |
| Inbäddad i uppdrag.md | Enklare vid få poster, bra för läsning              |
| Separata filer        | Rekommenderas vid > 5 konsulter eller hög aktivitet |

---

### 4.10b BillingLine (maskindata)

Fakturarader lagras **separat** i `/System/index/billing_lines.json` för snabb aggregering:

```json
{
  "billing_line_id": "bill_2026-01_def456",
  "entry_id": "jrn_2026-01-18_abc123",
  "case_id": "C-26-047",
  "customer_id": "cust_bjorkekärr_7x3k",
  "agreement_id": "agr_bjorkekärr_2024_9m2p",
  "billing_contact_id": "cont_lindstrom_4n8j",
  "consultant_id": "user_peter",
  "date": "2026-01-18",
  "minutes": 30,
  "type": "timebank",
  "rate": 0,
  "amount": 0,
  "invoice_text": "Samtal med hyresgäst",
  "period": "2026-01",
  "status": "pending",
  "locked": false
}
```

**Timbank-split:** En journalpost kan generera **två** BillingLines:

```json
[
  {
    "billing_line_id": "bill_2026-01_aaa111",
    "entry_id": "jrn_2026-01-20_xyz789",
    "minutes": 150,
    "type": "timebank",
    "rate": 0,
    "amount": 0
  },
  {
    "billing_line_id": "bill_2026-01_bbb222",
    "entry_id": "jrn_2026-01-20_xyz789",
    "minutes": 90,
    "type": "overtime",
    "rate": 1600,
    "amount": 2400
  }
]
```

**BillingLine status:**

| Status     | Beskrivning           |
| ---------- | --------------------- |
| `pending`  | Väntar på fakturering |
| `review`   | Under granskning      |
| `approved` | Godkänd för faktura   |
| `invoiced` | Fakturerad            |
| `locked`   | Låst, kan ej ändras   |

#### Source of Truth: Canonical vs Derived

| Tillstånd  | Source of Truth | Kan återskapas?                 |
| ---------- | --------------- | ------------------------------- |
| `pending`  | **Derived**     | ✅ Ja, från journal + ledger    |
| `review`   | **Derived**     | ✅ Ja, med manuella justeringar |
| `approved` | **Canonical**   | ⚠️ Nej, är nu faktureringsdata  |
| `invoiced` | **Canonical**   | ❌ Nej, exporterad till Fortnox |
| `locked`   | **Canonical**   | ❌ Nej, juridiskt bindande      |

**Regler:**

1. **Före `approved`:** BillingLine kan alltid återskapas genom att:
   - Läsa journalpost
   - Räkna om via ledger
   - Applicera timbank-split

2. **Efter `approved`:** BillingLine är **locked** och:
   - Kan inte ändras retroaktivt
   - Ändringar kräver kreditnota
   - Journal kan fortfarande redigeras (text), men tid är låst

3. **Retroaktiv ändring av journal:**
   ```
   Journal (text) ändras    → OK, ingen påverkan på faktura
   Journal (tid) ändras     → Genererar adjustment i ledger
   BillingLine (approved)   → Orörd, ny kreditrad skapas vid behov
   ```

**Varför denna policy?**

- Fakturering måste vara stabil efter godkännande
- Audit trail bevaras
- Retroaktiva ändringar spåras via ledger adjustments

---

### 4.11 Uppgifter (i uppdrag.md)

```markdown
## Uppgifter

- [ ] Beskrivning @Tilldelad #Deadline
- [-] Pågående uppgift @Tilldelad
- [x] Klar uppgift @Tilldelad ✓Slutdatum
```

**Status:**

- `[ ]` = pending
- `[-]` = in_progress
- `[x]` = done

---

### 4.12 Arbetsyta (globala uppgifter + anteckningar)

**/Arbetsyta/uppgifter.md**

```markdown
# Uppgifter

## Att göra

- [ ] Boka styrelsemöte Q2 @Jonas #2026-02-01 !high
- [ ] Uppdatera hemsidan @Sandra #2026-01-25

## Pågående

- [-] Skriva årsrapport @Jonas

## Klara (senaste 7 dagarna)

- [x] Fakturera januari ✓2026-01-15 @Sandra
```

**/Arbetsyta/Anteckningar/2026-01-18-idé-varningsbrev.md**

```yaml
---
skapad: 2026-01-18T09:30:00
skapad_av: Jonas
kopplad_kund: null
kopplad_uppdrag: null
---

Idé: Standardisera varningsbrev-mallen med tydligare juridisk text.
Prata med advokaten om formuleringar.
```

---

### 4.13 Agreement Ledger (timbankssaldo)

Varje timbanksavtal har en ledger för spårbar saldoberäkning:

**/System/ledger/agreements/agr_bjorkekärr_2024_9m2p.json**

```json
{
  "agreement_id": "agr_bjorkekärr_2024_9m2p",
  "customer_id": "cust_bjorkekärr_7x3k",
  "type": "timebank",
  "included_hours": 50,
  "period_start": "2024-01-01",
  "period_end": "2024-12-31",
  "entries": [
    {
      "date": "2024-01-15",
      "entry_id": "jrn_2024-01-15_aaa111",
      "type": "usage",
      "minutes": 60,
      "balance_after": 2940
    },
    {
      "date": "2024-02-03",
      "entry_id": "jrn_2024-02-03_bbb222",
      "type": "usage",
      "minutes": 90,
      "balance_after": 2850
    },
    {
      "date": "2024-06-01",
      "type": "adjustment",
      "minutes": 300,
      "reason": "Utökning av timbank",
      "balance_after": 3150
    }
  ],
  "computed": {
    "total_used_minutes": 2250,
    "remaining_minutes": 750,
    "overtime_minutes": 0,
    "last_updated": "2024-12-15T14:30:00Z"
  }
}
```

**Entry types i ledger:**

| Type         | Beskrivning               |
| ------------ | ------------------------- |
| `usage`      | Normal tidsförbrukning    |
| `overtime`   | Övertid (utöver timbank)  |
| `adjustment` | Manuell justering         |
| `refund`     | Återföring/kreditering    |
| `rollover`   | Överföring till ny period |

**Varför ledger?**

- Reproducerbart saldo (kan räknas om)
- Granskningsbar historik
- Hanterar retroaktiva ändringar
- Tydlig separation: tidpunkt vs effekt på saldo

---

### 4.14 System Index (JSON) - Shardad struktur

Index-filer är **shardade** för att undvika stora filer och ETag-konflikter:

```
/System/index/
├── /customers/
│   ├── goteborg.json          # Kunder per workspace
│   └── stockholm.json
├── /cases/
│   ├── active.json            # Aktiva ärenden (snabb åtkomst)
│   └── /archive/
│       ├── 2025.json          # Arkiverade per år
│       └── 2024.json
├── /agreements/
│   ├── active.json            # Aktiva avtal
│   └── expired.json           # Utgångna avtal
└── /billing/
    ├── 2026-01.json           # Fakturarader per period
    ├── 2026-02.json
    └── ...
```

#### Shardningsprinciper

| Index      | Shard-nyckel        | Anledning                |
| ---------- | ------------------- | ------------------------ |
| Customers  | workspace           | Sällan > 100 per stad    |
| Cases      | active/archive + år | Minskar aktiv filstorlek |
| Agreements | active/expired      | Aktiva är få             |
| Billing    | period (YYYY-MM)    | Naturlig partition       |

#### /System/index/customers/goteborg.json

```json
{
  "last_updated": "2026-01-18T10:00:00Z",
  "workspace": "goteborg",
  "customers": [
    {
      "customer_id": "cust_7x3kM9pQ",
      "fortnox_id": "10045",
      "name": "HSB Brf Björkekärr",
      "slug": "bjorkekärr",
      "status": "active",
      "active_cases": 2,
      "active_agreement_id": "agr_9m2pK4nL"
    }
  ]
}
```

#### /System/index/cases/active.json

```json
{
  "last_updated": "2026-01-18T10:00:00Z",
  "cases": [
    {
      "case_id": "C-26-047",
      "customer_id": "cust_7x3kM9pQ",
      "title": "Störning Ekvägen 15",
      "status": "active",
      "priority": "high",
      "assignee_id": "user_a1b2c3d4-...",
      "created": "2026-01-10",
      "deadline": "2026-01-31",
      "total_minutes": 125
    }
  ]
}
```

#### /System/index/billing/2026-01.json

```json
{
  "period": "2026-01",
  "last_updated": "2026-01-18T14:32:00Z",
  "status": "open",
  "lines": [
    {
      "billing_line_id": "bill_2026-01_def456",
      "entry_id": "jrn_20260118T1432_abc123",
      "case_id": "C-26-047",
      "customer_id": "cust_7x3kM9pQ",
      "type": "timebank",
      "minutes": 30,
      "rate": 0,
      "amount": 0,
      "status": "pending"
    }
  ],
  "totals": {
    "total_minutes": 2450,
    "total_amount": 84500
  }
}
```

#### Principer

| Princip              | Beskrivning                      |
| -------------------- | -------------------------------- |
| **Markdown = källa** | Ursprungsdata, human-readable    |
| **Index = cache**    | Derived data, kan återskapas     |
| **Sharding**         | Minskar write contention         |
| **Period-locking**   | Billing-index låses efter export |

---

## 5. App-moduler

### 5.1 Modulöversikt

| Modul            | Beskrivning              | Källa                  |
| ---------------- | ------------------------ | ---------------------- |
| **Dashboard**    | Översikt, KPI, uppgifter | Aggregerad             |
| **Kunder**       | Lista + detalj           | /Kunder - GBG + STHLM  |
| **Uppdrag**      | Lista över alla uppdrag  | Aggregerad från kunder |
| **Arbetsyta**    | Uppgifter + anteckningar | /Arbetsyta             |
| **Fakturering**  | Underlag, export         | Aggregerad             |
| **Kunskapsbank** | Rutiner, juridik         | /Kunskapsbank          |
| **Intranät**     | Intern info              | /Intranät              |
| **Grannfrid AB** | Ägare: ekonomi, personal | /Grannfrid AB          |

### 5.2 Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Hej Jonas                                      18 jan 2026  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Min tid     │ │ Beläggning  │ │ Att göra    │           │
│  │   32h       │ │   78%       │ │   4 st      │           │
│  │ denna månad │ │ mål: 80%    │ │ förfallna:1 │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  Mina uppgifter                              [Visa alla →] │
│  ───────────────                                            │
│  ☐ Ringa Magnus             C-047              Idag   🔴   │
│  ☐ Skicka rapport           P-012              Imorgon     │
│  ☐ Följa upp med styrelse   C-048              Fre         │
│                                                             │
│  Mina aktiva uppdrag                         [Visa alla →] │
│  ────────────────────                                       │
│  C-047 Störning Ekvägen      HSB Björkekärr   Igår    🔴   │
│  P-012 Utredning             BostadsBolaget   3 dagar      │
│  C-048 Andrahand             Brf Studio 57    1 vecka      │
│                                                             │
│  Senaste aktivitet                                          │
│  ──────────────────                                         │
│  Peter loggade 2h på C-047                    14:32        │
│  Jenny skapade uppgift i P-012                11:20        │
│  Du fick tilldelad uppgift från Sandra        09:15        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Admin-tillägg (för Jonas/Sandra):**

```
│  Team                                                       │
│  ─────                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Total tid   │ │ Att faktura │ │ Aktiva      │           │
│  │   147h      │ │  84 500 kr  │ │ 23 uppdrag  │           │
│  │ januari     │ │ 6 kunder    │ │ 4 försenade │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  Per konsult                                                │
│  Jonas     42h  ████████████░░  78%                        │
│  Peter     35h  ██████████░░░░  65%                        │
│  Jenny     28h  ████████░░░░░░  52%                        │
```

### 5.3 Kundlista

```
┌─────────────────────────────────────────────────────────────┐
│ Kunder                                    [+ Ny kund]       │
├─────────────────────────────────────────────────────────────┤
│ Filter: [Alla ▼] [GBG/STHLM ▼] [Status ▼]    Sök: [____]   │
├─────────────────────────────────────────────────────────────┤
│ Namn                    │ Typ    │ Avtal    │ Uppdrag │ Ort │
│ ────────────────────────┼────────┼──────────┼─────────┼─────│
│ HSB Brf Björkekärr      │ BRF    │ Timbank  │ 3 aktiva│ GBG │
│ BostadsBolaget          │ Komm.  │ Löpande  │ 5 aktiva│ GBG │
│ Brf Studio 57           │ BRF    │ Fastpris │ 1 aktivt│ GBG │
│ HSB Brf Segelflygaren   │ BRF    │ Timbank  │ 2 aktiva│STHLM│
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Kunddetalj

```
┌─────────────────────────────────────────────────────────────┐
│ HSB Brf Björkekärr                           [Redigera]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Info   Kontakter   Anteckningar   Filer   Avtal   Uppdrag │
│  ════                                                       │
│                                                             │
│  Fortnox: 10045              Typ: BRF                       │
│  Org.nr: 769612-3456         Status: Aktiv                  │
│  Lägenheter: 48              Ansvarig: Peter                │
│                                                             │
│  Adress: Björkekärrsgatan 15, 417 29 Göteborg              │
│  E-post: styrelsen@brfbjorkekärr.se                         │
│  Telefon: 031-123456                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Aktivt avtal                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Ramavtal 2024 (Timbank)                             │   │
│  │ 12.5h kvar av 50h │ ████████░░░░░░░░ │ Förnyelse: 1/1│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Aktiva uppdrag                              [+ Nytt]       │
│  • C-047 Störning Ekvägen          🔴 Hög   Peter          │
│  • C-048 Andrahand Ringvägen       🟡 Med   Jenny          │
│  • P-012 Utredning parkering       🟢 Låg   Jonas          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Uppdragsdetalj

```
┌─────────────────────────────────────────────────────────────┐
│ C-047 Störning Ekvägen 15                    [Redigera]     │
│ HSB Brf Björkekärr                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Journal   Kontakter   Uppgifter   Filer                    │
│  ═══════                                                    │
│                                                             │
│  Status: 🟢 Aktivt    Prioritet: 🔴 Hög    Ansvarig: Peter │
│  Skapat: 2026-01-10   Deadline: 2026-01-31                 │
│  Fakturamottagare: Karin Lindström                          │
│                                                             │
│  Loggad tid: 2h 5min                         [+ Ny post]    │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─ 2026-01-18 ─────────────────────────────────────────┐  │
│  │ 🗣 Samtal │ Peter │ 30 min                           │  │
│  │                                                       │  │
│  │ Pratat med hyresgäst Magnus. Han nekar till          │  │
│  │ störning, hävdar att det var engångsfest för         │  │
│  │ födelsedag. Verkar defensiv men samarbetsvillig.     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ 2026-01-17 ─────────────────────────────────────────┐  │
│  │ ✉ Mail │ Peter │ 15 min │ 💰 Extra                   │  │
│  │                                                       │  │
│  │ Skickat första varningsbrev till hyresgäst.          │  │
│  │ Kopia till styrelsen.                                │  │
│  │                                                       │  │
│  │ 📋 Fakturatext: Upprättande och utskick av           │  │
│  │    varningsbrev                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Fakturering

### 6.1 Översikt

Faktureringsmodulen visar allt som är redo att faktureras och möjliggör export till Fortnox.

### 6.2 Fakturerbara poster

| Typ              | Källa               | Trigger             |
| ---------------- | ------------------- | ------------------- |
| Tidsregistrering | Journal med timmar  | Löpande             |
| Övertid          | Timbank-split       | När banken tar slut |
| Extraarbete      | `extra`-flagga      | Löpande             |
| Månadsavgift     | Fastpris-avtal      | Månatligen          |
| Årsavgift        | Timbank/fastpris år | Årligen             |

### 6.3 Faktureringsvyn

```
┌─────────────────────────────────────────────────────────────┐
│ Fakturering                                  Januari 2026   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Förfakturerbart just nu: 287 450 kr                       │
│  (växer till månadens slut)                                │
│                                                             │
│  Kund                  │ Belopp      │ Poster              │
│  ──────────────────────┼─────────────┼──────────────────── │
│  HSB Brf Björkekärr    │   12 500 kr │ 3 ärenden           │
│  BostadsBolaget        │   45 000 kr │ 5 ärenden, årsavg.  │
│  Brf Studio 57         │    8 200 kr │ 1 ärende            │
│  Förbo                 │   24 300 kr │ 2 ärenden, månadsavg│
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Drill-down per kund (grupperat per fakturamottagare)

```
┌─────────────────────────────────────────────────────────────┐
│ HSB Brf Björkekärr                           12 500 kr      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Fakturamottagare: Karin Lindström                   │   │
│  │ karin@brfbjorkekärr.se                              │   │
│  │                                                     │   │
│  │ ☐ C-047 Störning Ekvägen            4 500 kr       │   │
│  │   └─ 2h 5min × 1400 kr + extra 1 500 kr            │   │
│  │ ☐ C-048 Andrahand Ringvägen          3 800 kr       │   │
│  │   └─ 2h 40min × 1400 kr                             │   │
│  │                                                     │   │
│  │ [Slå ihop & exportera till Fortnox]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Fakturamottagare: Erik Johansson                    │   │
│  │ erik@brfbjorkekärr.se                               │   │
│  │                                                     │   │
│  │ ☐ P-012 Utredning parkering          4 200 kr       │   │
│  │   └─ 3h × 1400 kr                                   │   │
│  │                                                     │   │
│  │ [Exportera till Fortnox]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Timbank-split

När tid registreras som överskrider timbanken:

```
Scenario: 5h kvar i timbank, registrerar 8h
         ↓
┌────────────────────────────────────────┐
│ Timbank-split                          │
│                                        │
│ Kvar i timbank: 5h                     │
│ Du registrerar: 8h                     │
│                                        │
│ Detta skapar:                          │
│ • 5h (timbank) → 0 kr                  │
│ • 3h (övertid) → 4 800 kr              │
│                                        │
│ [Bekräfta]  [Ändra]                    │
└────────────────────────────────────────┘
         ↓
Två journalposter skapas:

### 2026-01-20 | Samtal | Peter | 5 h | timbank
Långt samtal med hyresgäst om störning.

### 2026-01-20 | Samtal | Peter | 3 h | övertid
(fortsättning)
```

### 6.6 Faktureringsstatus

| Status     | Beskrivning             |
| ---------- | ----------------------- |
| `draft`    | Skapad, ej granskad     |
| `review`   | Under granskning        |
| `exported` | Exporterad till Fortnox |
| `locked`   | Låst, kan ej ändras     |

### 6.7 Export till Fortnox

CSV-format som matchar Fortnox import:

```csv
Kundnummer;Fakturadatum;Förfallodatum;Artikelnummer;Beskrivning;Antal;Pris;Moms
10045;2026-01-31;2026-02-28;KONSULT;C-047 Störning Ekvägen - Konsulttid;2.08;1400;25
10045;2026-01-31;2026-02-28;EXTRA;C-047 Varningsbrev;1;1500;25
```

---

## 7. AI-integration

### 7.1 AI-chatt (alltid närvarande)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💬 Grannfrid AI                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Hur kan jag hjälpa dig?                             │   │
│  │                                                     │   │
│  │ Du: Sammanfatta C-047                               │   │
│  │                                                     │   │
│  │ AI: C-047 är ett störningsärende för HSB Brf       │   │
│  │ Björkekärr gällande musikstörning nattetid.        │   │
│  │                                                     │   │
│  │ Status: Aktivt, hög prioritet                       │   │
│  │ Ansvarig: Peter                                     │   │
│  │ Loggad tid: 2h 5min                                 │   │
│  │                                                     │   │
│  │ Senaste aktivitet: Samtal med hyresgäst som        │   │
│  │ nekar till störning. Varningsbrev skickat.         │   │
│  │                                                     │   │
│  │ Nästa steg: Uppföljningssamtal planerat 22/1.      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [____________________________________] [🎤] [Skicka]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 AI-kapabiliteter

| Funktion        | Beskrivning                                    |
| --------------- | ---------------------------------------------- |
| **Söka**        | Hitta ärenden, kunder, historik                |
| **Sammanfatta** | Sammanfatta ärenden, möten, perioder           |
| **Skapa**       | Ny kund, nytt ärende, journalpost              |
| **Uppdatera**   | Logga tid, ändra status, lägga till kontakt    |
| **Analysera**   | Hitta mönster, jämföra perioder                |
| **Generera**    | Skriva brev, rapporter, mail                   |
| **Svara**       | Frågor om rutiner, juridik (från Kunskapsbank) |

### 7.3 Whisper-diktering

Konsulten trycker på mikrofon-ikonen:

```
🎤 "Logga trettio minuter samtal på störningsärendet
    för Björkekärr, pratade med hyresgästen Magnus
    som fortfarande nekar"
         ↓
AI: Jag lägger till följande journalpost på C-047:

    ### 2026-01-20 | Samtal | Jonas | 30 min
    Pratat med hyresgäst Magnus som fortfarande
    nekar till störning.

    [Spara] [Redigera] [Avbryt]
```

### 7.4 Kunskapsbank → AI

AI:n har tillgång till allt i `/Kunskapsbank`:

```
Konsult: Hur lång tid har vi på oss att agera
         efter en störningsanmälan?

AI: Enligt våra rutiner (störningsärende-guide.md):

    1. Första kontakt med klagande: inom 24h
    2. Kontakt med störande part: inom 48h
    3. Första varningsbrev: inom 7 dagar

    Enligt hyreslagen (12 kap 25§) finns ingen
    specifik tidsgräns, men...
```

### 7.5 AI Guardrails (tillförlitlighet)

#### Draft → Review → Approve

AI-genererat innehåll som påverkar data kräver godkännande:

```
┌────────────────────────────────────────────────┐
│ 🤖 AI-genererat innehåll                       │
│                                                │
│ Jag föreslår denna journalpost:                │
│                                                │
│ ### 2026-01-20 | Samtal | Jonas | 30 min       │
│ Pratat med hyresgäst Magnus...                 │
│                                                │
│ ┌──────────────────────────────────────────┐   │
│ │ ✅ Godkänn    │ ✏️ Redigera  │ ❌ Avbryt │   │
│ └──────────────────────────────────────────┘   │
│                                                │
│ Källa: Diktering 2026-01-20 14:32              │
└────────────────────────────────────────────────┘
```

#### Vad kräver godkännande?

| Åtgärd            | Kräver godkännande | Anledning            |
| ----------------- | ------------------ | -------------------- |
| Skapa journalpost | ✅ Ja              | Påverkar fakturering |
| Skapa ärende      | ✅ Ja              | Skapar ny entitet    |
| Ändra status      | ✅ Ja              | Affärspåverkan       |
| Söka/sammanfatta  | ❌ Nej             | Endast läsning       |
| Svara på frågor   | ❌ Nej             | Ingen datapåverkan   |
| Generera utkast   | ⚠️ Vid sparande    | Brev, rapporter      |

#### Källhänvisning

AI ska alltid visa källa för påståenden:

```
AI: Timbanken för Björkekärr har 12.5 timmar kvar.
    📄 Källa: avtal/Ramavtal 2024.md

AI: Störningar nattetid räknas som väsentlig störning.
    📄 Källa: Kunskapsbank/Juridik/hyreslagen-25.md
```

#### Kontextisolering

AI har endast åtkomst till data för **aktuellt ärende/kund** i varje konversation:

- ✅ "Sammanfatta C-047" → Läser C-047 och relaterad kund
- ❌ "Sammanfatta alla ärenden för alla kunder" → Avvisar eller kräver explicit bekräftelse

#### Loggning

Alla AI-åtgärder loggas i `/System/ai_log.json`:

```json
{
  "timestamp": "2026-01-20T14:32:00Z",
  "user_id": "user_jonas",
  "action": "create_journal_entry",
  "source": "dictation",
  "status": "approved",
  "case_id": "C-26-047",
  "approved_by": "user_jonas"
}
```

---

## 8. Notifikationer och påminnelser

### 8.1 Teams-notifikationer

| Trigger               | Notifikation                              |
| --------------------- | ----------------------------------------- |
| Ny tilldelad uppgift  | "Du har fått en ny uppgift: {titel}"      |
| Deadline imorgon      | "Påminnelse: {uppgift} förfaller imorgon" |
| Deadline passerad     | "⚠️ Förfallen: {uppgift}"                 |
| Nytt ärende tilldelat | "Nytt ärende: {nummer} {titel}"           |
| Omnämnd i journal     | "{konsult} nämnde dig i {ärende}"         |

### 8.2 Tidsloggnings-påminnelse

När konsult stänger ett ärende utan att ha loggat tid:

```
┌────────────────────────────────────────┐
│ ⏱️ Saknar tidsregistrering            │
│                                        │
│ Du har inte loggat tid på C-047 idag. │
│                                        │
│ Vill du lägga till tid?               │
│                                        │
│ [Ja, logga tid]  [Hoppa över]         │
└────────────────────────────────────────┘
```

---

## 9. Design

### 9.1 Designspråk

"Editorial Magazine Style" – professionellt, läsbart, lugnt.

### 9.2 Färgpalett

| Namn       | RGB           | Hex     | Användning      |
| ---------- | ------------- | ------- | --------------- |
| sage       | 135, 169, 107 | #87A96B | Primärfärg, CTA |
| terracotta | 212, 103, 74  | #D4674A | Varningar, fel  |
| lavender   | 155, 143, 191 | #9B8FBF | Info, accenter  |
| charcoal   | 44, 40, 36    | #2C2824 | Text            |
| ash        | 90, 85, 80    | #5A5550 | Sekundär text   |
| cream      | 249, 247, 244 | #F9F7F4 | Bakgrund        |
| sand       | 240, 237, 232 | #F0EDE8 | Kort, borders   |

### 9.3 Typografi

| Typ     | Font               | Användning       |
| ------- | ------------------ | ---------------- |
| Display | Lora (serif)       | Rubriker, titlar |
| Body    | Inter (sans-serif) | Brödtext, UI     |

### 9.4 Prioritetsindikatorer

| Prioritet | Indikator     |
| --------- | ------------- |
| Hög       | 🔴 Röd punkt  |
| Medium    | 🟡 Gul punkt  |
| Låg       | 🟢 Grön punkt |

### 9.5 Layout och navigation

#### Desktop-layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Grannfrid                              [Sök] [Notis] [Profil]  │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│  Dashboard   │                                                          │
│              │               HUVUDINNEHÅLL                              │
│  Kunder ▼    │                                                          │
│   Göteborg   │                                                          │
│   Stockholm  │                                                          │
│              │                                                          │
│  Uppdrag     │                                                          │
│              │                                                          │
│  Arbetsyta   │                                                          │
│              │                                                          │
│  Fakturering │                                                          │
│              │                                                          │
│  Kunskapsbank│                                                          │
│              │                                                          │
│  Intranät    │                                                          │
│              │                                                          │
│  [Ägare]     │                                                          │
│  Grannfrid AB│                                                          │
│              │                                                          │
├──────────────┴──────────────────────────────────────────────────────────┤
│  🎤 [AI-chatt - diktering och kommandon]          [Kollapsa ▼]         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Sidebar-navigation

| Menypost     | Beskrivning                           | Behörighet |
| ------------ | ------------------------------------- | ---------- |
| Dashboard    | Översikt, aktiva ärenden, påminnelser | Alla       |
| Kunder       | Expanderbar: Göteborg, Stockholm      | Alla       |
| Uppdrag      | Genväg till alla aktiva ärenden       | Alla       |
| Arbetsyta    | Uppgifter + Anteckningar kombinerat   | Alla       |
| Fakturering  | Fakturaunderlag och export            | Admin      |
| Kunskapsbank | Kunskapsdokument, FAQ, mallar         | Alla       |
| Intranät     | Internt material, nyheter             | Alla       |
| Grannfrid AB | Företagsinformation, ekonomi          | Ägare      |

#### AI-chatt panel

- **Position:** Nederkant, alltid synlig (kollapsbar)
- **Funktioner:**
  - Dikteringsknapp (Whisper) för röstinmatning
  - Textinput för skriftliga kommandon
  - Snabbknappar för vanliga operationer
  - Visar senaste AI-svar
- **Expanderat läge:** Tar upp ~30% av skärmhöjden
- **Kollapserat läge:** Endast inputfält synligt

#### Mobil-layout

```
┌─────────────────────────┐
│ [☰]  Grannfrid    [🔔] │
├─────────────────────────┤
│                         │
│    HUVUDINNEHÅLL        │
│                         │
│                         │
├─────────────────────────┤
│ 🎤 [AI-chatt...]        │
└─────────────────────────┘
```

- **Hamburger-meny (☰):** Öppnar sidebar som overlay
- **AI-chatt:** Förblir synlig i botten
- **Gester:** Swipe för att navigera mellan ärenden

#### Responsiva brytpunkter

| Brytpunkt | Bredd      | Beteende                |
| --------- | ---------- | ----------------------- |
| sm        | < 640px    | Mobil, hamburgermeny    |
| md        | 640-1024px | Tablet, kompakt sidebar |
| lg        | > 1024px   | Desktop, full sidebar   |

### 9.6 Komponent-bibliotek

Baseras på Radix UI med custom styling:

| Komponent | Radix-bas      | Användning             |
| --------- | -------------- | ---------------------- |
| Button    | Button         | Alla knappar           |
| Dialog    | Dialog         | Bekräftelser, formulär |
| Dropdown  | DropdownMenu   | Kontextmenyer          |
| Select    | Select         | Val i formulär         |
| Tabs      | Tabs           | Fliknavigation         |
| Toast     | Toast (Sonner) | Notifikationer         |
| Tooltip   | Tooltip        | Hjälptexter            |
| Sheet     | Dialog         | Sidopaneler på mobil   |

---

## 10. Säkerhet och GDPR

### 10.1 Autentisering

- Microsoft SSO via MSAL
- Alla användare måste vara inloggade
- Session timeout: 8 timmar

### 10.2 Behörigheter

| Nivå    | Åtkomst                       |
| ------- | ----------------------------- |
| Konsult | /Grannfrid (allt utom System) |
| Admin   | /Grannfrid + System           |
| Ägare   | Allt + /Grannfrid AB          |

### 10.3 GDPR och datahantering

#### Raderingsnivåer

| Nivå                   | Beskrivning            | Åtgärd                         |
| ---------------------- | ---------------------- | ------------------------------ |
| **Operational Delete** | Borttagen ur app/index | Fil flyttas till papperskorg   |
| **Recovery Window**    | Admin kan återställa   | 93 dagar i M365 papperskorg    |
| **Hard Delete**        | Permanent radering     | Manuell tömning av papperskorg |

#### Så fungerar radering

1. **Användare raderar i appen:**
   - Fil tas bort från index
   - Fil flyttas till SharePoint papperskorg
   - Ej synlig i app, men kan återställas av admin

2. **Efter 93 dagar:**
   - Microsoft raderar permanent automatiskt
   - Ej möjligt att återställa

3. **GDPR-begäran (right to erasure):**
   - Admin tömmer papperskorg manuellt
   - Dokumentera radering i ärendelogg

#### Versionshistorik

SharePoint sparar versioner automatiskt. Detta är **inte** en soft delete utan en ändringslogg:

- Användare ser endast senaste version
- Admin kan granska ändringshistorik
- Versioner raderas tillsammans med filen

#### Persondata i index

Index-filer innehåller referens-ID:n, inte persondata:

- `billing_contact_id: cont_lindstrom_4n8j` (OK)
- ~~`billing_contact: Karin Lindström`~~ (EJ OK)

Vid radering av kontakt: uppdatera ID-referensen till `null` eller ersättnings-ID.

### 10.4 Backup & Disaster Recovery

#### Recovery-nivåer

| Nivå                 | Mekanism         | Tid       | Användning            |
| -------------------- | ---------------- | --------- | --------------------- |
| **Versionshistorik** | SharePoint auto  | Omedelbar | Oavsiktliga ändringar |
| **Papperskorg**      | M365 recycle bin | 93 dagar  | Raderade filer        |
| **Tenant backup**    | Microsoft 365    | Begärd    | Större incidenter     |

#### Standard recovery (M365 inbyggt)

- SharePoint versionshistorik (automatisk)
- Papperskorg 93 dagar
- Microsoft 365 backup ingår

**OBS:** Microsoft ansvarar för infrastruktur, inte för användarfel eller ransomware.

#### Disaster Recovery Policy (rekommenderas)

| Vad                | Frekvens  | Destination                 | Ansvarig       |
| ------------------ | --------- | --------------------------- | -------------- |
| `/System/` export  | Veckovis  | Azure Blob / extern lagring | Azure Function |
| Index-filer        | Dagligen  | Separat Site Collection     | Azure Function |
| Kund-data snapshot | Månadsvis | Extern backup               | Admin          |

#### Automatisk backup-function

```typescript
// functions/backup-system/index.ts
const backupSystem: AzureFunction = async (context: Context): Promise<void> => {
  const timestamp = new Date().toISOString().split("T")[0];

  // 1. Exportera /System/ till backup-container
  const systemFiles = await listAllFiles("/System/");
  for (const file of systemFiles) {
    await copyToBackupStorage(file, `backups/${timestamp}/`);
  }

  // 2. Logga backup
  await createBackupLog({
    date: timestamp,
    files_count: systemFiles.length,
    status: "completed",
  });
};

// Timer trigger: Söndag 03:00
export default backupSystem;
```

#### Disaster scenarios och response

| Scenario               | Response                          | RTO      |
| ---------------------- | --------------------------------- | -------- |
| Fil raderad av misstag | Återställ från papperskorg        | < 5 min  |
| Korrupt index          | Kör `index-rebuild` function      | < 30 min |
| Ransomware             | Återställ från extern backup      | < 4 tim  |
| Tenant-incident        | Microsoft support + extern backup | < 24 tim |

**RTO** = Recovery Time Objective

---

## 11. System-konfiguration

### 11.1 /System/config.md

```yaml
---
senaste_arendenummer: 127
senaste_projektnummer: 23
app_version: 1.0.0
---
## Inställningar
- Faktureringsdag: Sista vardagen varje månad
- Standardprioritet: medium
- Tidsloggnings-påminnelse: aktiverad
```

---

## 12. Icke-mål (nu)

| Funktion         | Status    | Motivering                |
| ---------------- | --------- | ------------------------- |
| Rich text-editor | Bortvald  | Plain text räcker         |
| Kvällspris       | Borttagen | Användes aldrig           |
| Attestering      | Ej behov  | Litet team                |
| Offline-läge     | Framtid   | Sverige har bra nät       |
| Kundportal       | Framtid   | SharePoint-delning räcker |

---

## 13. Migrering från befintlig struktur

### 13.1 Mappning

| Nuvarande        | Ny                    |
| ---------------- | --------------------- |
| KUNDER - GBG     | /Kunder - Göteborg    |
| KUNDER - STHLM   | /Kunder - Stockholm   |
| Kunskapsdokument | /Kunskapsbank         |
| MALLAR           | /Mallar               |
| Rutiner          | /Kunskapsbank/Rutiner |
| PERSONAL         | /Intranät/Personal    |

### 13.2 Kundmapp-migrering

| Nuvarande         | Ny                             |
| ----------------- | ------------------------------ |
| Kontaktuppgifter/ | → kund.md (Kontakter-sektion)  |
| Nedlagda timmar/  | → uppdrag.md (Journal-sektion) |
| Störningsärenden/ | → /Uppdrag                     |
| Avtal/            | → /Avtal                       |

---

## Ändringslogg

| Datum      | Version | Ändringar                                                                         |
| ---------- | ------- | --------------------------------------------------------------------------------- |
| 2026-01-18 | 1.3     | Outbox pattern, shardade index, collision-proof IDs, canonical/derived policy, DR |
| 2026-01-18 | 1.2     | Concurrency, Azure Functions, GDPR-säker AI, separata journalfiler                |
| 2026-01-18 | 1.1     | Stabila ID:n, System Index, BillingLine, Agreement Ledger, AI guardrails          |
| 2026-01-18 | 1.0     | Initial SharePoint-specifikation                                                  |
