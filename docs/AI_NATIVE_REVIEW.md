# Grannfrid AI-Native Review

> Analys av AI-möjligheter för Grannfrid CRM
> Datum: 2026-01-23

## Executive Summary

Grannfrid har **hög potential för AI-transformation**. Som ett CRM för bostadskonsulter hanterar appen mycket textbaserat arbete, dokumentation och kommunikation - perfekt för LLM-integration. De mest värdefulla möjligheterna finns inom:

1. **AI-assisterad ärendehantering** - Skapa kunder, uppdrag och kontakter från ostrukturerad text
2. **Journalföring & dokumentation** - AI-assisterad textgenerering
3. **Smart sökning** - Semantisk sökning över all data
4. **Fakturaunderlag** - Automatisk sammanfattning och kategorisering
5. **Kunskapsbasen** - RAG för att hitta relevant information

**Arkitekturprincip:** Alla AI-funktioner är **provider-agnostiska** - vi binder oss inte till någon specifik LLM-leverantör.

---

## Feature-by-Feature Analysis

### 0. AI-ASSISTERAD ÄRENDEHANTERING (Ny huvudfunktion)

**Current state**: Konsulter skapar kunder, uppdrag och kontakter helt manuellt genom att fylla i formulär fält för fält.

**AI opportunity**: **VERY HIGH** - Transformativ funktion som möjliggör skapande från ostrukturerad text (mail, telefonanteckningar, copy-paste från andra system).

**Proposed enhancement**:

- **Primary**: Skapa uppdrag, kunder och kontakter genom att klistra in mail eller skriva fri text
- **Secondary**: Automatisk generering av uppgiftslistor baserat på ärendetyp
- **Tertiary**: Smart matching mot befintliga kunder

**Användningsfall**:

#### UC1: Mail från styrelse (störningsärende)

```
Input:
"Från: styrelsen@brf-ekbacken.se
Hej, vi har fått flera klagomål från boende i trapphus A
om höga ljud kvällar/nätter från lgh 2B. Boende i 2B
(Sven Andersson, 073-123 45 67) nås inte på telefon.
Styrelsen vill ha kontakt och föreslår hembesök inom en vecka.
BRF Ekbacken, Org.nr: 556123-4567
Kontakt: Anna Svensson, ordförande, 070-987 65 43"

Output:
→ Nytt uppdrag: Störningsärende, prioritet Hög
→ Kund: BRF Ekbacken (skapas om ny)
→ Kontakter: Anna Svensson (ordförande), Sven Andersson (lgh 2B)
→ 7 genererade uppgifter med tidsfrister
```

#### UC2: Telefonsamtal (utredning)

```
Input:
"Förvaltare ringde kl 09:10. Styrelsen i BRF Tallkronan
misstänker olovlig andrahandsuthyrning i lgh 5C.
Behöver inleda utredning och boka hembesök.
Kontakt: Karin Olsson, 070-222 33 44."

Output:
→ Uppdrag: Utredning av misstänkt olovlig andrahandsuthyrning
→ Kund: BRF Tallkronan (matchas mot befintlig)
→ Uppgifter: Kontakta boende, begär underlag, boka hembesök
```

**User Flow**:

```
┌──────────────────────────────────────────────────────┐
│  1. INMATNING                                        │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │ 📋 Skapa nytt uppdrag                      │     │
│  │                                            │     │
│  │ Beskriv uppdraget eller klistra in mail:  │     │
│  │ ┌────────────────────────────────────┐    │     │
│  │ │ [Fritext-input area]               │    │     │
│  │ │                                    │    │     │
│  │ └────────────────────────────────────┘    │     │
│  │                                            │     │
│  │ [ 🤖 Analysera ]  [ ✏️ Fyll i manuellt ] │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│  2. AI-TOLKNING (2-3 sekunder)                       │
│                                                      │
│  🔄 Tolkar text...                                   │
│  ✓ Kund identifierad                                 │
│  ✓ Uppdragstyp föreslagen                            │
│  ✓ Kontakter hittade                                 │
│  ✓ Uppgifter genererade                              │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│  3. REVIEW & REDIGERA                                │
│                                                      │
│  ✏️ Granska AI:ns tolkning                           │
│                                                      │
│  UPPDRAG                                             │
│  Typ: [Störningsärende ▼]  Prioritet: [Hög ▼]       │
│  Titel: [Störningar BRF Ekbacken]                    │
│                                                      │
│  KUND                                                │
│  ● BRF Ekbacken (befintlig)                          │
│  ○ Skapa ny kund: [___________]                      │
│                                                      │
│  KONTAKTER                                           │
│  • Anna Svensson - 070-987 65 43 (ordförande)        │
│  • Sven Andersson - 073-123 45 67 (lgh 2B)           │
│  [+ Lägg till kontakt]                               │
│                                                      │
│  GENERERAD UPPGIFTSLISTA                             │
│  ┌────────────────────────────────────────────┐     │
│  │ ☐ Kontakta boende 2B         Inom 48h      │     │
│  │ ☐ Samla klagomål             Inom 3 dagar  │     │
│  │ ☐ Boka hembesök              Inom 1 vecka  │     │
│  │ ... (7 uppgifter totalt)                   │     │
│  │ [✏️ Redigera]  [+ Lägg till]  [🗑️ Ta bort] │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  [ ← Tillbaka ]  [ ✓ Skapa uppdrag ]                 │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│  4. SPARAD & AKTIVERAD                               │
│                                                      │
│  ✓ Uppdrag skapat: #C-042                            │
│  ✓ 7 uppgifter tillagda                              │
│  ✓ Tilldelade konsulter notifierade                  │
│                                                      │
│  [ Visa uppdrag ]  [ Skapa nytt ]                    │
└──────────────────────────────────────────────────────┘
```

**Implementation approach**:

- **Technique**: LLM med structured output (JSON) - provider-agnostisk
- **Context**: Befintliga kunder för fuzzy matching, ärendetyper, kontaktroller
- **UX**: Tydlig review-steg där användaren kan justera alla AI-förslag

**Complexity**: High
**Impact**: **VERY HIGH** (transformativ för dagligt arbete)

---

### 1. JOURNALENTRYFORM (Tidsloggning)

**Current state**: Manuell inmatning av aktivitetstyp, tid, innehåll och fakturatext för varje journalpost.

**AI opportunity**: **HIGH** - Konsulter skriver 10-50+ journalposter per dag. AI kan dramatiskt minska skrivtid.

**Proposed enhancement**:

- **Primary**: AI-assisterad textgenerering för "Innehåll" och "Fakturatext"
  - Baserat på aktivitetstyp, kund, uppdragstyp
  - Förslag baserade på tidigare journalposter för samma uppdrag
- **Secondary**: Smart tidsförslag baserat på aktivitetstyp och historik

**Implementation approach**:

```
┌─────────────────────────────────────┐
│ Innehåll                       [✨] │
├─────────────────────────────────────┤
│ Samtal med styrelse ang...          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💡 "Samtal med styrelsen angå-  │ │
│ │ ende störningsärendet i 3B.     │ │
│ │ Diskuterade dokumentation och   │ │
│ │ nästa steg med varningsbrev."   │ │
│ │            [Infoga] [Avvisa]    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- **Technique**: Claude API med streaming
- **Context**: Uppdragstitel, kundnamn, aktivitetstyp, tidigare entries
- **UX**: Sparkle-knapp (✨) eller auto-trigger efter 2s paus

**Complexity**: Medium
**Impact**: **HIGH** (daglig användning, stor tidsvinst)

---

### 2. KUNSKAPSBASEN (Knowledge Base)

**Current state**: Manuell sökning och bläddring bland artiklar. Textinnehåll utan intelligent retrieval.

**AI opportunity**: **HIGH** - Perfekt kandidat för RAG (Retrieval-Augmented Generation)

**Proposed enhancement**:

- **Primary**: Semantisk sökning + AI-svar
  - "Vilka regler gäller för störningar efter 22:00?" → Sammanfattat svar med källor
- **Secondary**: Automatisk taggning av nya artiklar
- **Tertiary**: Föreslå relevanta artiklar baserat på aktuellt uppdrag

**Implementation approach**:

```
┌─────────────────────────────────────────────┐
│ 🔍 Sök i kunskapsbasen                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Vad gäller vid andrahandsuthyrning?     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🤖 Sammanfattning:                      │ │
│ │ Enligt föreningens stadgar krävs        │ │
│ │ skriftligt godkännande från styrelsen   │ │
│ │ för andrahandsuthyrning. Maxperiod är   │ │
│ │ normalt 2 år...                         │ │
│ │                                         │ │
│ │ Källor:                                 │ │
│ │ • [Andrahandsuthyrning - policy]        │ │
│ │ • [Styrelsebeslut mall]                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- **Technique**: Embeddings (pgvector i Supabase) + Claude för svar
- **Index**: Alla knowledge_articles chunkat och embeddat
- **UX**: Sökruta med AI-toggle, visa både svar och källor

**Complexity**: Medium-High
**Impact**: **HIGH** (snabbare kunskapsåtkomst, bättre konsultstöd)

---

### 3. CUSTOMERFORM & ASSIGNMENTFORM

**Current state**: Helt manuell ifyllning av alla fält.

**AI opportunity**: **MEDIUM** - Kan förbättra med smart pre-population

**Proposed enhancement**:

- **Primary**: Auto-suggest baserat på organisationsnummer
  - Hämta företagsinfo från publika register
- **Secondary**: Intelligent kategori-förslag för uppdrag baserat på titel

**Implementation approach**:

- **Technique**: API-integration för org.nr lookup + Claude för kategorisering
- **UX**: Pre-filled fält med "Verifiera"-indikator

**Complexity**: Low-Medium
**Impact**: MEDIUM

---

### 4. NOTESPAGE (Snabbanteckningar)

**Current state**: Manuell anteckning → manuell koppling till kund/uppdrag

**AI opportunity**: **MEDIUM-HIGH** - Auto-klassificering och smart koppling

**Proposed enhancement**:

- **Primary**: Automatisk identifiering av kund/uppdrag från anteckningstext
  - "Ringde BRF Ekbacken ang störning" → Föreslår koppling till BRF Ekbacken
- **Secondary**: Automatisk kategorisering av anteckningstyp
- **Tertiary**: Föreslå omvandling till task om anteckningen innehåller action items

**Implementation approach**:

```
┌─────────────────────────────────────────────┐
│ "Måste ringa tillbaka BRF Solsidan om      │
│  varningsbrevet senast fredag"              │
│                                             │
│ 🤖 AI identifierade:                        │
│ • Kund: BRF Solsidan                [Koppla]│
│ • Action item: Ringa tillbaka      [→ Task] │
│ • Deadline: Fredag                          │
└─────────────────────────────────────────────┘
```

- **Technique**: Claude med structured output (JSON)
- **Context**: Lista över aktiva kunder/uppdrag för matching
- **UX**: Inline förslag, one-click action

**Complexity**: Medium
**Impact**: **MEDIUM-HIGH** (minskar manuellt arbete)

---

### 5. DASHBOARD

**Current state**: Statiska KPIs, manuell activity feed

**AI opportunity**: **MEDIUM-HIGH** - Proaktiva insikter och anomali-detection

**Proposed enhancement**:

- **Primary**: Intelligent "Attention Needed" widget
  - Uppdrag utan aktivitet >X dagar
  - Timbanker som snart är slut
  - Ovanliga mönster
- **Secondary**: AI-sammanfattning av veckans aktivitet
- **Tertiary**: Prediktiv workload-analys

**Implementation approach**:

```
┌─────────────────────────────────────────────┐
│ ⚠️ Kräver uppmärksamhet                     │
├─────────────────────────────────────────────┤
│ • BRF Ekbacken: Ingen aktivitet på 21 dagar │
│ • BRF Solsidan: Timbank 94% använd          │
│ • 3 uppdrag saknar nästa steg               │
│                              [Granska alla] │
└─────────────────────────────────────────────┘
```

- **Technique**: Regelbaserad analys + Claude för prioritering
- **UX**: Prominent placement, actionable items

**Complexity**: Medium
**Impact**: **HIGH** (proaktiv vs reaktiv arbetsstil)

---

### 6. BILLINGPERIOD (Fakturaunderlag)

**Current state**: Manuell granskning av journalposter per kund

**AI opportunity**: **MEDIUM** - Sammanfattning och kvalitetskontroll

**Proposed enhancement**:

- **Primary**: AI-genererad sammanfattning per kund för fakturan
  - "Under perioden har vi hanterat störningsärende i lägenhet 3B, inkluderande 2 platsbesök och korrespondens med berörda parter."
- **Secondary**: Flagga potentiella fel (ovanligt höga timmar, dubbla poster)

**Implementation approach**:

- **Technique**: Claude med context av alla journalposter
- **UX**: Generad sammanfattning som kan kopieras till faktura

**Complexity**: Low-Medium
**Impact**: MEDIUM (snabbare fakturering)

---

### 7. SEARCH (Global Search)

**Current state**: Keyword-baserad sökning

**AI opportunity**: **HIGH** - Semantisk sökning över all data

**Proposed enhancement**:

- **Primary**: Natural language search
  - "Visa alla störningsärenden i Vasastan från förra året"
  - "Vilka kunder har timbanksavtal som snart går ut?"
- **Secondary**: Multi-entity search med AI-ranking

**Implementation approach**:

```
User: "kunder med tidsbanksproblem"
       │
       ▼
┌─────────────────────────────────────┐
│ Claude extraherar:                  │
│ - entity: customers                 │
│ - filter: agreement_type = timebank │
│ - condition: hours_remaining < 20%  │
└─────────────────────────────────────┘
       │
       ▼
Visar: 3 kunder med <20% timbank kvar
```

- **Technique**: Claude för query parsing → SQL generation
- **UX**: CommandPalette (Cmd+K) med AI-mode

**Complexity**: Medium-High
**Impact**: **HIGH** (dramatiskt bättre discovery)

---

### 8. TASKLIST & TASKFORM

**Current state**: Manuell task-skapande och statushantering

**AI opportunity**: **MEDIUM** - Smart task-generering

**Proposed enhancement**:

- **Primary**: Auto-generera tasks från journalposter
  - Journal: "Ska skicka varningsbrev" → Task skapas automatiskt
- **Secondary**: Smart due date förslag baserat på task-typ
- **Tertiary**: Prioritetsförslag baserat på uppdragstyp

**Implementation approach**:

- **Technique**: Claude med tool use för task creation
- **UX**: "AI hittade en action item" → Confirm/Edit/Dismiss

**Complexity**: Medium
**Impact**: MEDIUM

---

### 9. CONTACTFORM

**Current state**: Helt manuell inmatning

**AI opportunity**: **LOW** - Begränsad nytta

**Proposed enhancement**:

- Lookup från visitkort-bild (vision)
- Auto-complete från tidigare kontakter

**Complexity**: Medium
**Impact**: LOW

---

### 10. AGREEMENT MANAGEMENT

**Current state**: Manuell avtalshantering med beräknad indexering

**AI opportunity**: **MEDIUM** - Proaktiva påminnelser och analys

**Proposed enhancement**:

- **Primary**: Intelligent indexeringspåminnelser med förslag
- **Secondary**: Avtalsanalys - jämför med branschstandard
- **Tertiary**: Förslag på avtalstyp baserat på kundprofil

**Complexity**: Low-Medium
**Impact**: MEDIUM

---

### 11. FILESTTAB (Dokument)

**Current state**: Ren fillagring utan innehållsförståelse

**AI opportunity**: **HIGH** - Document intelligence

**Proposed enhancement**:

- **Primary**: Auto-summarization vid uppladdning
- **Secondary**: OCR + extraction av nyckeldata
- **Tertiary**: Semantic search inom dokument

**Implementation approach**:

```
┌─────────────────────────────────────────────┐
│ 📄 Varningsbrev_2024-01-15.pdf              │
├─────────────────────────────────────────────┤
│ 📝 AI-sammanfattning:                       │
│ Varningsbrev till lägenhet 3B angående      │
│ upprepade störningar efter 22:00.           │
│ Skickat: 2024-01-15                         │
│ Mottagare: Anna Andersson                   │
│                                             │
│ Extraherad data:                            │
│ • Typ: Varningsbrev                         │
│ • Lägenhet: 3B                              │
│ • Störningstyp: Buller                      │
└─────────────────────────────────────────────┘
```

- **Technique**: Claude Vision för PDF-analys
- **UX**: Auto-process vid upload, visa sammanfattning inline

**Complexity**: Medium-High
**Impact**: **HIGH** (snabbare dokumenthantering)

---

## Priority Matrix

### Transformative Features (High Effort, Very High Impact)

| Feature                       | Effort | Impact    | Rekommendation                 |
| ----------------------------- | ------ | --------- | ------------------------------ |
| AI-assisterad ärendehantering | High   | VERY HIGH | **Huvudfunktion - prioritera** |

### Quick Wins (Low-Medium Complexity, High Impact)

| Feature                | Effort | Impact      | Rekommendation         |
| ---------------------- | ------ | ----------- | ---------------------- |
| JournalEntry AI-assist | Medium | HIGH        | **Börja här**          |
| Dashboard Alerts       | Low    | HIGH        | **Implementera snart** |
| Billing Summary        | Low    | Medium      | Bra ROI                |
| Notes Auto-link        | Medium | Medium-High | Bra UX-förbättring     |

### Strategic Investments (Higher Effort, Transformative)

| Feature               | Effort      | Impact | Rekommendation    |
| --------------------- | ----------- | ------ | ----------------- |
| Knowledge RAG         | Medium-High | HIGH   | **Hög prioritet** |
| Semantic Search       | Medium-High | HIGH   | Game-changer      |
| Document Intelligence | Medium-High | HIGH   | Stor tidsvinst    |
| Task Auto-generation  | Medium      | Medium | Nice to have      |

---

## Implementation Roadmap

### Fas 0: AI-infrastruktur

0. **Provider-agnostisk AI-service** - Factory pattern, interfaces, prompts

### Fas 1: Huvudfunktion + Quick Wins

1. **AI-assisterad ärendehantering** - Skapa uppdrag/kunder/kontakter från text
2. **AI-knapp i JournalEntryForm** - Föreslå innehåll/fakturatext
3. **Dashboard Attention Widget** - Flagga inaktiva uppdrag

### Fas 2: Core AI Features

4. **Knowledge Base RAG** - Semantisk sökning med AI-svar
5. **Notes Intelligence** - Auto-detect kund/uppdrag

### Fas 3: Advanced Features

6. **Global Semantic Search** - Natural language queries
7. **Document Processing** - Upload → Extract → Summarize
8. **Billing AI Summary** - Generera fakturaunderlag

### Fas 4: Agentic Features

9. **Task Auto-generation** - Från journalposter
10. **Proactive Insights** - Prediktiv analys
11. **AI Assistant** - Chat-baserad app-interaktion

---

## Technical Recommendations

### Provider-Agnostisk AI-Arkitektur

Alla AI-funktioner designas för att vara **oberoende av specifik LLM-leverantör**. Detta ger flexibilitet att byta provider baserat på kostnad, kvalitet eller regulatoriska krav.

```typescript
// src/lib/ai/types.ts

/**
 * Provider-agnostiskt interface för alla AI-tjänster
 */
interface AIProvider {
  name: string;
  analyze(input: string, context: AIContext): Promise<AIResponse>;
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  embed?(text: string): Promise<number[]>;
}

interface AIContext {
  customers?: Array<{ id: string; name: string; orgNumber?: string }>;
  assignments?: Array<{ id: string; title: string; customerId: string }>;
  assignmentTypes: string[];
  contactRoles: string[];
}

interface AIResponse {
  confidence: number; // 0-1
  rawOutput: unknown;
}

/**
 * Parsed data för ärendehantering från ostrukturerad text
 */
interface ParsedCaseData extends AIResponse {
  case: {
    type: "complaint" | "project" | "investigation" | "maintenance";
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    description: string;
    estimatedBudget?: number;
    startDate?: string;
  };
  customer: {
    name: string;
    orgNumber?: string;
    isNew: boolean;
    matchedCustomerId?: string;
    matchConfidence: number;
  };
  contacts: Array<{
    name: string;
    phone?: string;
    email?: string;
    role?: string;
  }>;
  tasks: Array<{
    title: string;
    description?: string;
    priority: "low" | "medium" | "high" | "urgent";
    suggestedDeadline?: string;
    estimatedDuration?: number;
  }>;
  extractedData: {
    addresses?: string[];
    phoneNumbers?: string[];
    emails?: string[];
    dates?: string[];
    amounts?: number[];
  };
}
```

### AI Service Factory

```typescript
// src/lib/ai/factory.ts

type ProviderType = "openai" | "anthropic" | "azure" | "google" | "local";

class AIServiceFactory {
  static create(provider: ProviderType): AIProvider {
    switch (provider) {
      case "openai":
        return new OpenAIProvider();
      case "anthropic":
        return new AnthropicProvider();
      case "azure":
        return new AzureOpenAIProvider();
      case "google":
        return new GoogleAIProvider();
      case "local":
        return new LocalLLMProvider();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

// Användning - provider väljs via miljövariabel
const aiService = AIServiceFactory.create(
  (process.env.AI_PROVIDER as ProviderType) || "openai",
);
```

### Fallback & Error Handling

```typescript
// src/lib/ai/service.ts

async function analyzeWithFallback(
  input: string,
  context: AIContext,
): Promise<ParsedCaseData> {
  const providers: ProviderType[] = ["openai", "anthropic"];

  for (const providerType of providers) {
    try {
      const provider = AIServiceFactory.create(providerType);
      const result = await provider.analyze(input, context);

      if (result.confidence > 0.6) {
        return result as ParsedCaseData;
      }
    } catch (error) {
      console.error(`${providerType} failed:`, error);
      continue;
    }
  }

  // Om alla failar - returnera tom struktur för manuell input
  throw new Error("AI-analys misslyckades. Fyll i manuellt.");
}
```

### Provider-Agnostisk Prompt

```typescript
// src/lib/ai/prompts.ts

const CASE_ANALYSIS_PROMPT = `
SYSTEM ROLE:
Du är en assistent för svenska bostadskonsulter på Grannfrid
som hanterar uppdrag för bostadsrättsföreningar och fastighetsbolag.

UPPGIFT:
Analysera inkommande text (mail, telefonanteckningar, eller fri beskrivning)
och extrahera:
1. Kund (namn, org.nr om BRF)
2. Uppdrag (typ, prioritet, beskrivning)
3. Kontaktpersoner (namn, telefon, roll)
4. Generera en prioriterad uppgiftslista för konsulterna

OUTPUT FORMAT:
Returnera ENDAST valid JSON enligt schemat (se ParsedCaseData).

REGLER:
- Alla telefonnummer på format: 070-XXX XX XX
- "complaint" = störning/utredning, "project" = renoveringssamordning
- "investigation" = utredning (andrahand, störning, etc)
- "maintenance" = praktiska driftinsatser
- "urgent" endast för akuta lägen (vatten, brand, hot/våld, trygghet)
- Föreslå realistiska deadlines baserat på prioritet
- Om osäker: högre confidence = tydligare input
- Svenska språket används i alla texter

BEFINTLIGA KUNDER (för matching):
{{customers}}

UPPDRAGSTYPER:
{{assignmentTypes}}

KONTAKTROLLER:
{{contactRoles}}
`;
```

### Provider Comparison (för framtida val)

| Provider         | Kostnad/req   | Latency | Svenska    | EU Data | Notes                    |
| ---------------- | ------------- | ------- | ---------- | ------- | ------------------------ |
| OpenAI GPT-4o    | ~$0.01-0.03   | 2-4s    | ⭐⭐⭐⭐⭐ | ❌      | Utmärkt kvalitet         |
| Anthropic Claude | ~$0.015-0.045 | 2-5s    | ⭐⭐⭐⭐⭐ | ❌      | Bra instruktionsföljning |
| Azure OpenAI     | ~$0.02-0.04   | 2-4s    | ⭐⭐⭐⭐⭐ | ✅      | Enterprise, SLA          |
| Google Gemini    | ~$0.01-0.02   | 1-3s    | ⭐⭐⭐⭐   | ⚠️      | Snabb, billig            |
| Local (Llama)    | $0            | 3-10s   | ⭐⭐⭐     | ✅      | Kräver GPU               |

### Supabase Integration

```sql
-- Lägg till AI-metadata på assignments
ALTER TABLE assignments ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE assignments ADD COLUMN ai_source_text TEXT;
ALTER TABLE assignments ADD COLUMN ai_confidence_score DECIMAL(3,2);

-- Lägg till embeddings-kolumn för semantic search
ALTER TABLE knowledge_articles
ADD COLUMN embedding vector(1536);

-- Index för snabb sökning
CREATE INDEX ON knowledge_articles
USING ivfflat (embedding vector_cosine_ops);

-- Case tasks (uppgifter kopplade till uppdrag via AI)
CREATE TABLE assignment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  deadline TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  ai_generated BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignment_tasks_assignment_id ON assignment_tasks(assignment_id);
```

### UX Patterns att följa

1. **Non-blocking AI** - Aldrig blockera användaren
2. **Easy dismiss** - Alla förslag ska kunna avvisas med ett klick
3. **Confidence indicators** - Visa när AI är osäker
4. **Feedback loop** - 👍/👎 på förslag för förbättring
5. **Graceful fallback** - Manuell input alltid tillgänglig

---

## Data Privacy Considerations

- **Kunddata i prompts**: Minimera, använd ID:n istället för namn i logs
- **Embedding storage**: Kryptera i vila
- **Audit trail**: Logga alla AI-interaktioner
- **User consent**: Informera om AI-användning
- **Data residency**: Verifiera Claude API:s datahantering

---

## Metrics to Track

1. **Adoption**: % användare som använder AI-features
2. **Time saved**: Genomsnittlig tid per journalpost före/efter
3. **Accuracy**: % accepterade AI-förslag
4. **Satisfaction**: NPS för AI-features
5. **Cost**: API-kostnad per användare/månad

---

## Conclusion

Grannfrid har **utmärkt potential för AI-native transformation**. De mest värdefulla investeringarna är:

1. **AI-assisterad ärendehantering** - Transformativ funktion som möjliggör skapande av kunder, uppdrag och kontakter från ostrukturerad text (mail, telefonsamtal, etc.)
2. **JournalEntry AI-assist** - Daglig användning, direkt tidsvinst
3. **Knowledge RAG** - Bättre kunskapsåtkomst för konsulter
4. **Semantic Search** - Dramatiskt förbättrad discovery
5. **Document Intelligence** - Automatiserad dokumenthantering

**Arkitekturprincip:** Alla AI-funktioner byggs med **provider-agnostisk arkitektur** - vi binder oss inte till någon specifik LLM-leverantör. Detta ger flexibilitet att:

- Byta provider baserat på kostnad
- Anpassa till regulatoriska krav (EU data residency)
- Utnyttja nya modeller efterhand som de släpps

Med fokus på dessa områden kan Grannfrid bli en **AI-first CRM** som ger konsulter superkrafter i sitt dagliga arbete.

---

## Review Checklist ✓

- [x] Alla features analyserade
- [x] Quick wins identifierade
- [x] Inga "AI for AI's sake" - varje förslag löser verkligt problem
- [x] Implementation complexity realistisk
- [x] UX beaktad (AI hjälper, hindrar inte)
- [x] Data privacy noterad
- [x] Fallback-beteende definierat
