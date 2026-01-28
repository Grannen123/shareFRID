# AI-Assisterad Ärendehantering

> **Status:** Planerad
> **Prioritet:** Hög
> **Impact:** Stor effekt för konsulternas vardag

## Översikt

Möjliggör för Grannfrids konsulter att skapa uppdrag och uppgiftslistor genom att klistra in mail, skriva löpande anteckningar från samtal eller kopiera text från andra system (förvaltare, styrelse, kundportaler). AI/LLM-tjänst tolkar texten och genererar strukturerad data anpassad för störningsärenden, utredningar, renoveringssamordning och bosociala uppdrag.

## Användningsfall

### UC1: Mail från styrelse/förvaltare (störningsärende)

**Input:**

```
Från: styrelsen@brf-ekbacken.se
Ämne: Upprepade störningar - lgh 2B

Hej, vi har fått flera klagomål från boende i trapphus A
om höga ljud kvällar/nätter från lgh 2B. Det har varit
störande tre helger i rad. Boende i 2B (Sven Andersson,
073-123 45 67) nås inte på telefon. Styrelsen vill ha
kontakt och föreslår hembesök inom en vecka.

BRF Ekbacken
Org.nr: 556123-4567
Kontakt: Anna Svensson, ordförande, 070-987 65 43
```

**Output:**

- Nytt uppdrag av typen "complaint" (störningsärende), prioritet "high"
- Kund: BRF Ekbacken (skapas om ny)
- Kontaktpersoner extraherade (styrelse + berörd boende)
- Genererad uppgiftslista med 7 tasks
- Föreslagna tidsfrister baserat på prioritet och önskemål

### UC2: Telefonsamtal antecknat (utredning/olovlig andrahandsuthyrning)

**Input:**

```
Förvaltare ringde kl 09:10. Styrelsen i BRF Tallkronan
misstänker olovlig andrahandsuthyrning i lgh 5C.
Grannar har sett korttidsboende och okända personer.
Behöver inleda utredning och boka hembesök. Kontakt:
Karin Olsson, 070-222 33 44. Adress: Tallgatan 7, lgh 5C.
```

**Output:**

- Uppdrag: Utredning av misstänkt olovlig andrahandsuthyrning
- Kund: BRF Tallkronan (matchas mot befintlig eller skapas)
- Adress: Tallgatan 7, lgh 5C
- Prioritet: Medium (bör påbörjas inom 1-2 veckor)
- Uppgifter: Kontakta boende, begär underlag, boka hembesök, återkoppla styrelsen

### UC3: Beskrivning av pågående projekt (renoveringssamordning)

**Input:**

```
BRF Solbacken behöver hjälp med renoveringssamordning
inför stambyte i A-huset. De har redan fått offert från
VVS Nord AB. Vi ska koordinera med hyresgästerna, boka
tider för avstängning och följa upp entreprenören.
Budget 450 000 kr. Startdatum preliminärt vecka 12.
```

**Output:**

- Projekt-uppdrag med budget och preliminärt startdatum
- Uppgiftslista: Kontakta VVS Nord, informera hyresgäster,
  boka avstängningstid, projektledning, slutbesiktning
- Kopplas till befintlig kund BRF Solbacken

## User Flow

```
┌──────────────────────────────────────────────────────┐
│  1. INMATNING                                        │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ 📋 Skapa nytt uppdrag                      │    │
│  │                                            │    │
│  │ Beskriv uppdraget eller klistra in mail:  │    │
│  │ ┌────────────────────────────────────┐    │    │
│  │ │ [Fritext-input area]               │    │    │
│  │ │                                    │    │    │
│  │ │                                    │    │    │
│  │ └────────────────────────────────────┘    │    │
│  │                                            │    │
│  │ [ 🤖 Analysera ]  [ ✏️ Fyll i manuellt ] │    │
│  └────────────────────────────────────────────┘    │
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
│  Typ: [Störningsärende ▼]                            │
│  Prioritet: [Hög ▼]                                  │
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
│  BESKRIVNING                                         │
│  ┌────────────────────────────────────────────┐    │
│  │ Upprepade störningar kvällstid i lgh 2B.   │    │
│  │ Boende nås inte. Styrelsen vill ha besök. │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  GENERERAD UPPGIFTSLISTA                             │
│  ┌────────────────────────────────────────────┐    │
│  │ ☐ Kontakta boende 2B (Sven) 073-123 45 67  │    │
│  │   Tidsfrist: Inom 48h                       │    │
│  │   Ansvarig: [Välj ▼]                        │    │
│  │                                             │    │
│  │ ☐ Samla klagomål från boende i trapphus A   │    │
│  │   Tidsfrist: Inom 3 dagar                    │    │
│  │   Ansvarig: [Välj ▼]                        │    │
│  │                                             │    │
│  │ ☐ Boka hembesök och dokumentera             │    │
│  │   Tidsfrist: Inom 1 vecka                    │    │
│  │   Ansvarig: [Välj ▼]                        │    │
│  │                                             │    │
│  │ ... (7 uppgifter totalt)                    │    │
│  │                                             │    │
│  │ [✏️ Redigera]  [+ Lägg till]  [🗑️ Ta bort] │    │
│  └────────────────────────────────────────────┘    │
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

## Datamodell

### Nya fält/tabeller

_Not: Begreppet "case" används här som teknisk term för Grannfrids uppdrag/ärenden._

#### `case_tasks` (ny tabell)

```sql
CREATE TABLE case_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  deadline TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_case_tasks_case_id ON case_tasks(case_id);
CREATE INDEX idx_case_tasks_assigned ON case_tasks(assigned_to);
CREATE INDEX idx_case_tasks_status ON case_tasks(status);
```

#### `cases` (nya fält)

```sql
ALTER TABLE cases ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN ai_source_text TEXT; -- Original input sparad
ALTER TABLE cases ADD COLUMN ai_confidence_score DECIMAL(3,2); -- 0.00-1.00
```

#### `case_contacts` (ny tabell - många kontakter per ärende)

```sql
CREATE TABLE case_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT, -- 'ordförande', 'boende', 'förvaltare', etc
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## AI/LLM Integration

### Arkitektur (provider-agnostisk)

```typescript
// src/lib/ai-service.ts

interface AIProvider {
  name: string;
  analyze(input: string): Promise<ParsedCaseData>;
}

interface ParsedCaseData {
  case: {
    type: "complaint" | "project" | "acute" | "maintenance";
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    description: string;
    estimatedBudget?: number;
    startDate?: string;
  };
  customer: {
    name: string;
    orgNumber?: string;
    isNew: boolean; // AI gissar om kund finns
    matchConfidence: number; // 0-1
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
    suggestedDeadline?: string; // ISO date eller 'within_1h', 'within_24h'
    estimatedDuration?: number; // minuter
  }>;
  extractedData: {
    addresses?: string[];
    phoneNumbers?: string[];
    emails?: string[];
    dates?: string[];
    amounts?: number[];
  };
  confidence: number; // Overall confidence 0-1
}

// Factory pattern för olika providers
class AIServiceFactory {
  static create(
    provider: "openai" | "anthropic" | "azure" | "local",
  ): AIProvider {
    switch (provider) {
      case "openai":
        return new OpenAIProvider();
      case "anthropic":
        return new AnthropicProvider();
      case "azure":
        return new AzureOpenAIProvider();
      case "local":
        return new LocalLLMProvider();
    }
  }
}
```

### Prompt Design (provider-oberoende)

```
SYSTEM ROLE:
Du är en assistent för svenska bostadskonsulter på Grannfrid
som hanterar uppdrag för bostadsrättsföreningar och
fastighetsbolag.

UPPGIFT:
Analysera inkommande text (mail, telefonanteckningar, eller
fri beskrivning) och extrahera:
1. Kund (namn, org.nr om BRF)
2. Uppdrag (typ, prioritet, beskrivning)
3. Kontaktpersoner (namn, telefon, roll)
4. Generera en prioriterad uppgiftslista för konsulterna

OUTPUT FORMAT:
Returnera ENDAST valid JSON enligt följande schema:
{
  "case": { ... },
  "customer": { ... },
  "contacts": [ ... ],
  "tasks": [ ... ],
  "extractedData": { ... },
  "confidence": 0.95
}

REGLER:
- Alla telefonnummer på format: 070-XXX XX XX
- "complaint" = störning/utredning, "project" = renoveringssamordning
- "maintenance" = praktiska driftinsatser kopplade till uppdrag
- "urgent" endast för akuta lägen (vatten, brand, hot/våld, trygghet)
- Föreslå realistiska deadlines baserat på prioritet
- Om osäker: högre confidence = tydligare input
- Svenska språket används i alla texter
```

### Providers

#### Option 1: OpenAI

```typescript
class OpenAIProvider implements AIProvider {
  name = "OpenAI GPT-4o";

  async analyze(input: string): Promise<ParsedCaseData> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    return await response.json();
  }
}
```

**Kostnad:** ~$0.01-0.03 per ärende
**Latency:** 2-4 sekunder
**Kvalitet:** ⭐⭐⭐⭐⭐ (utmärkt på svenska)

#### Option 2: Anthropic Claude

```typescript
class AnthropicProvider implements AIProvider {
  name = "Claude 3.5 Sonnet";

  async analyze(input: string): Promise<ParsedCaseData> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: input }],
      }),
    });

    return parseClaudeResponse(await response.json());
  }
}
```

**Kostnad:** ~$0.015-0.045 per ärende
**Latency:** 2-5 sekunder
**Kvalitet:** ⭐⭐⭐⭐⭐ (utmärkt på instruktionsföljning)

#### Option 3: Azure OpenAI (enterprise)

- Samma API som OpenAI men via Azure
- Data stannar i EU
- SLA-garantier
- Dyrare men tryggare för företagsdata

#### Option 4: Lokal LLM

- Llama 3.1 70B eller liknande
- Ingen kostnad per request
- Kräver GPU-server
- Lägre kvalitet på svenska

### Fallback & Error Handling

```typescript
async function analyzeWithFallback(input: string): Promise<ParsedCaseData> {
  const providers = [
    AIServiceFactory.create("openai"),
    AIServiceFactory.create("anthropic"),
    // Fallback till manuell input om båda failar
  ];

  for (const provider of providers) {
    try {
      const result = await provider.analyze(input);

      if (result.confidence > 0.6) {
        return result;
      }
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      continue;
    }
  }

  // Om alla failar - visa felmeddelande och manuell input
  throw new Error("AI-analys misslyckades. Fyll i manuellt.");
}
```

## Säkerhet & Privacy

### Data som skickas till AI

- ✅ Fritext-beskrivningar
- ✅ Kontaktuppgifter (namn, telefon)
- ✅ Adresser
- ❌ ALDRIG personnummer
- ❌ ALDRIG känslig ekonomisk info (om inte explicit nämnt i text)

### GDPR-kompatibilitet

1. **Informerat samtycke**:
   - "Genom att använda AI-assisterad inmatning skickas din text till [Provider]"
   - Checkbox: "Jag godkänner att texten analyseras av AI"

2. **Datalagring**:
   - AI-providers får INTE träna på vår data (kontraktskrav)
   - Original-text sparas i `cases.ai_source_text` (kan raderas efter X dagar)
   - Loggning av API-anrop för felsökning

3. **Opt-out**:
   - Användare kan alltid välja "Fyll i manuellt" istället

## UI/UX Komponenter

### Nya komponenter

```
src/components/ai/
├── AIAnalysisButton.tsx       # Knapp med loading state
├── AIReviewPanel.tsx          # Hela review-vyn
├── CaseTaskList.tsx           # Uppgiftslista för uppdrag (drag-drop)
├── ExtractedContactCard.tsx   # Kontaktkort från AI
└── ConfidenceIndicator.tsx    # Visar AI:ns säkerhet
```

### Features

- **Loading states**: "AI tänker..." med progress
- **Confidence indicators**: Grönt/gult/rött beroende på säkerhet
- **Inline editing**: Klicka och redigera direkt i review
- **Undo/redo**: Ångra AI:ns förslag
- **Compare mode**: Visa original-text sida-vid-sida

## Success Metrics

### Mätbara mål

- **Tid att skapa uppdrag**: Minskas från ~5 min → ~1 min
- **Adoption rate**: >60% av uppdrag skapas via AI efter 3 månader
- **Accuracy**: >85% av AI-tolkningar godkänns utan redigering
- **User satisfaction**: NPS >8/10 för funktionen

### Analytics att spåra

```typescript
interface AIUsageMetrics {
  totalAnalyses: number;
  successRate: number; // % som resulterar i sparade uppdrag
  avgConfidenceScore: number;
  avgProcessingTime: number; // millisekunder
  editRate: number; // % av review där user redigerar
  fallbackToManual: number; // % som byter till manuell input
  costsPerMonth: number; // SEK
}
```

## Implementation Plan

### Fas 1: Prototype (Vecka 1-2)

- [ ] Datamodell: `case_tasks`, `case_contacts` tabeller
- [ ] Hårdkodad demo: Mock AI-response för att testa UX
- [ ] Basic UI: Input → Review → Save flow
- [ ] Ingen riktig AI ännu (statisk JSON)

### Fas 2: AI Integration (Vecka 3-4)

- [ ] Välj provider (OpenAI rekommenderas initialt)
- [ ] Implementera `ai-service.ts` med factory pattern
- [ ] Prompt engineering & testing
- [ ] Error handling & fallbacks

### Fas 3: Polish & Testing (Vecka 5-6)

- [ ] Confidence indicators
- [ ] Inline editing i review
- [ ] Analytics/logging
- [ ] Beta med 3-5 konsulter

### Fas 4: Launch (Vecka 7)

- [ ] GDPR-dokumentation
- [ ] User onboarding/tutorial
- [ ] Rollout till alla användare
- [ ] Monitor metrics

## Cost Estimation

### Per ärende (OpenAI GPT-4o)

- Input: ~500 tokens (mail/beskrivning)
- Output: ~800 tokens (strukturerad JSON)
- Total: ~1300 tokens = $0.02 USD ≈ 0.20 SEK

### Månadsscenario (50 ärenden/månad)

- 50 ärenden × 0.20 SEK = **10 SEK/månad**
- Uttryckt väldigt lågt! Kan skalas till 500 ärenden/mån för 100 SEK.

### Break-even

- Om funktionen sparar **5 minuter per uppdrag**
- Och konsultens tid värderas till **500 SEK/h**
- Då sparar varje uppdrag: 5 min × (500/60) = **41.67 SEK**
- **ROI: 20,000%** 🚀

## Risks & Mitigation

| Risk                                | Sannolikhet | Impact  | Mitigation                                      |
| ----------------------------------- | ----------- | ------- | ----------------------------------------------- |
| AI tolkar fel → fel kund/uppdrag    | Medium      | Hög     | Review-steg obligatoriskt, confidence threshold |
| Fel prioritet vid akuta ärenden     | Medium      | Hög     | Tydliga regler + manuell kontroll i review      |
| API downtime → kan ej skapa uppdrag | Låg         | Hög     | Fallback till manuell input alltid tillgänglig  |
| Kostnader skenar (missbruk)         | Låg         | Medium  | Rate limiting, användarlimit per månad          |
| GDPR-brott (känslig data till AI)   | Låg         | Kritisk | Tydliga warnings, user consent, contractual DPA |

## Future Enhancements

### V2 Features

- **Bifogade filer**: OCR på störningsbrev, foton från besiktning
- **Voice-to-text**: Diktera anteckningar efter jour
- **Smart suggestions**: "Liknande uppdrag löstes med X"
- **Auto-assignment**: AI föreslår konsult baserat på kompetens/plats
- **Follow-up reminders**: AI genererar påminnelser när tasks är försenade

### Integrationer

- **Mail-integration**: Inbox för styrelsen@grannfrid.se → auto-skapas uppdrag
- **Förvaltarsystem**: Import från externa kundportaler
- **WhatsApp Business**: Ta emot ärenden via chat

## Questions & Decisions Needed

### Beslut från produktägare

- [ ] **Provider-val**: OpenAI, Claude, eller Azure?
- [ ] **GDPR-policy**: Hur länge sparas `ai_source_text`?
- [ ] **Pricing**: Läggs kostnaden på kunderna eller är det gratis?
- [ ] **Launch strategy**: Beta först eller direkt till alla?
- [ ] **Mandatory vs optional**: Får användare välja att inte använda AI?

### Technical decisions

- [ ] **Error handling**: Hur många retries vid API-fel?
- [ ] **Timeout**: Max väntetid innan fallback till manuell input?
- [ ] **Caching**: Ska samma input ge samma output (för testing)?
- [ ] **Logging**: Hur mycket loggar vi för debugging vs privacy?

## Appendix

### Exempel på AI-genererade tasks

**Störningsärende (nattstök)**

1. Kontakta anmälare och dokumentera störning (inom 24h)
2. Försök nå boende i berörd lägenhet (inom 48h)
3. Samla in fler vittnesuppgifter (inom 3 dagar)
4. Boka hembesök/telefonmöte (inom 1 vecka)
5. Ta fram underlag till styrelsen (inom 1 vecka)
6. Föreslå åtgärdsplan och uppföljning (inom 2 veckor)
7. Återkoppla status till styrelsen (EOW)

**Utredning (olovlig andrahandsuthyrning)**

1. Kontakta styrelsen och tydliggör process (inom 2 dagar)
2. Begär underlag och tidigare korrespondens (inom 5 dagar)
3. Kontakta boende och boka hembesök (inom 2 veckor)
4. Sammanställ observationer och dokumentation (inom 2 veckor)
5. Förslag till åtgärd/brev (inom 3 veckor)
6. Uppföljning med styrelse (inom 1 månad)

**Projekt (renoveringssamordning / stambyte)**

1. Kontakta offererad leverantör (inom 3 dagar)
2. Informationsbrev till boende (2 veckor före)
3. Boka tid för vattenstängning (koordinera med förvaltare)
4. Projektledning: Kickoff-möte (vecka 11)
5. Veckovisa avstämningar (under projektet)
6. Slutbesiktning (efter avslut)
7. Slutrapport till styrelse (inom 2 veckor efter)

---

**Dokument skapat:** 2026-01-20
**Författare:** Jonas + Claude
**Status:** Draft för review
