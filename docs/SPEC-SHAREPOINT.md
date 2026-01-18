# Grannfrid App – SharePoint Edition

**Version:** 1.0
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
│  │              Claude API + Gemini Flash               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  MICROSOFT GRAPH API                         │
│           (Läs/skriv filer, kalender, mail)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     SHAREPOINT                               │
│              (Markdown-filer = Databas)                     │
│                                                             │
│  /Grannfrid              /Grannfrid AB                      │
│  (alla konsulter)        (endast ägare)                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Teknisk stack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Byggverktyg | Vite |
| Styling | Tailwind CSS |
| State | TanStack React Query |
| Forms | React Hook Form + Zod |
| Routing | React Router |
| UI-komponenter | Radix UI |
| Ikoner | Lucide React |
| Toasts | Sonner |
| Auth | Microsoft SSO (via MSAL) |
| Backend | SharePoint (via Graph API) |
| AI | Claude API + Gemini Flash |
| Röst | Whisper API |

### 2.3 AI-strategi

| AI | Användning |
|----|------------|
| **Claude** | Konversation, analys, skrivande, komplexa frågor |
| **Gemini Flash** | Bulk-operationer, beräkningar, billigare uppgifter |
| **Whisper** | Tal till text (diktering) |

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
    └── /Fakturering

/Grannfrid AB                    🔒 ENDAST ÄGARE
├── /Personal
├── /Ekonomi
└── /Strategi
```

### 3.2 Mapptyper

| Typ | Beskrivning | Appen |
|-----|-------------|-------|
| **App-modul** | Strukturerad data, visas i dedikerad vy | Läser/skriver |
| **Fri mapp** | Valfri organisation, alla filtyper | Visar, öppnar |
| **App-data** | Teknisk konfiguration | Dold för användare |

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

### 4.1 kund.md

```yaml
---
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
ansvarig: Peter
workspace: goteborg
skapad: 2024-03-15
---

## Anteckningar
- Bra relation med styrelseordförande Karin
- Föredrar mail framför telefon
- Faktureras kvartalsvis

## Kontakter
| Namn | Roll | E-post | Telefon | Fakturamottagare |
|------|------|--------|---------|------------------|
| Karin Lindström | Styrelseordf | karin@brfbjorkekärr.se | 070-1234567 | ✓ |
| Erik Johansson | Ekonomi | erik@brfbjorkekärr.se | 070-2345678 | ✓ |
| Maria Svensson | Viceordf | maria@brfbjorkekärr.se | 070-3456789 | |
```

### 4.2 Kundtyper

| Typ | Beskrivning |
|-----|-------------|
| `brf` | Bostadsrättsförening |
| `kommunalt_fastighetsbolag` | Kommunalt fastighetsbolag |
| `privat_fastighetsbolag` | Privat fastighetsbolag |
| `forvaltningsbolag` | Förvaltningsbolag |
| `stiftelse` | Stiftelse |
| `samfallighet` | Samfällighet |
| `ovrig` | Övrig |

### 4.3 Kundstatus

| Status | Beskrivning |
|--------|-------------|
| `active` | Aktiv kund med pågående avtal |
| `prospekt` | Potentiell kund |
| `vilande` | Vilande/pausad kund |

---

### 4.4 avtal.md

```yaml
---
namn: Ramavtal 2024
typ: timebank
status: active
timpris: 1400
overtidspris: 1600
timmar_inkluderade: 50
timmar_anvanda: 37.5
timmar_kvar: 12.5
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
nummer: C-047
kund: HSB Brf Björkekärr
avtal: Ramavtal 2024
fakturamottagare: Karin Lindström
typ: case
kategori: disturbance
status: active
prioritet: high
titel: Störning Ekvägen 15
beskrivning: Musikstörning nattetid från lgh 1102
ansvarig: Peter
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

| Typ | Prefix | Beskrivning |
|-----|--------|-------------|
| `case` | C-001 | Ärende (störning, andrahand etc.) |
| `project` | P-001 | Projekt (utredning, undersökning) |

### 4.8 Uppdragskategorier

| Kategori | Beskrivning |
|----------|-------------|
| `disturbance` | Störningsutredning |
| `illegal_sublet` | Olovlig andrahandsuthyrning |
| `screening` | Boendeundersökning |
| `renovation_coordination` | Renoveringssamordning |
| `investigation` | Utredning |
| `other` | Övrigt |

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

### 4.10 Journalpost-format

```markdown
### {DATUM} | {TYP} | {KONSULT} | {TID} | {FLAGGOR}
{ANTECKNINGSTEXT}
> Fakturatext: {BILLING_COMMENT}
```

**Fält:**

| Fält | Format | Exempel |
|------|--------|---------|
| Datum | YYYY-MM-DD | 2026-01-18 |
| Typ | samtal/mail/möte/platsbesök/anteckning | Samtal |
| Konsult | Namn | Peter |
| Tid | X min / X h / X.X h | 30 min |
| Flaggor | extra, timbank, övertid | extra |
| Anteckningstext | Fritext | Pratat med... |
| Fakturatext | Efter `> Fakturatext:` | Uppföljningssamtal |

**Entry types:**

| Typ | Intern kod |
|-----|------------|
| Samtal | call |
| Mail | email |
| Möte | meeting |
| Platsbesök | site_visit |
| Anteckning | note |

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

## 5. App-moduler

### 5.1 Modulöversikt

| Modul | Beskrivning | Källa |
|-------|-------------|-------|
| **Dashboard** | Översikt, KPI, uppgifter | Aggregerad |
| **Kunder** | Lista + detalj | /Kunder - GBG + STHLM |
| **Uppdrag** | Lista över alla uppdrag | Aggregerad från kunder |
| **Arbetsyta** | Uppgifter + anteckningar | /Arbetsyta |
| **Fakturering** | Underlag, export | Aggregerad |
| **Kunskapsbank** | Rutiner, juridik | /Kunskapsbank |
| **Intranät** | Intern info | /Intranät |
| **Grannfrid AB** | Ägare: ekonomi, personal | /Grannfrid AB |

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

| Typ | Källa | Trigger |
|-----|-------|---------|
| Tidsregistrering | Journal med timmar | Löpande |
| Övertid | Timbank-split | När banken tar slut |
| Extraarbete | `extra`-flagga | Löpande |
| Månadsavgift | Fastpris-avtal | Månatligen |
| Årsavgift | Timbank/fastpris år | Årligen |

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

| Status | Beskrivning |
|--------|-------------|
| `draft` | Skapad, ej granskad |
| `review` | Under granskning |
| `exported` | Exporterad till Fortnox |
| `locked` | Låst, kan ej ändras |

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

| Funktion | Beskrivning |
|----------|-------------|
| **Söka** | Hitta ärenden, kunder, historik |
| **Sammanfatta** | Sammanfatta ärenden, möten, perioder |
| **Skapa** | Ny kund, nytt ärende, journalpost |
| **Uppdatera** | Logga tid, ändra status, lägga till kontakt |
| **Analysera** | Hitta mönster, jämföra perioder |
| **Generera** | Skriva brev, rapporter, mail |
| **Svara** | Frågor om rutiner, juridik (från Kunskapsbank) |

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

---

## 8. Notifikationer och påminnelser

### 8.1 Teams-notifikationer

| Trigger | Notifikation |
|---------|--------------|
| Ny tilldelad uppgift | "Du har fått en ny uppgift: {titel}" |
| Deadline imorgon | "Påminnelse: {uppgift} förfaller imorgon" |
| Deadline passerad | "⚠️ Förfallen: {uppgift}" |
| Nytt ärende tilldelat | "Nytt ärende: {nummer} {titel}" |
| Omnämnd i journal | "{konsult} nämnde dig i {ärende}" |

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

| Namn | RGB | Hex | Användning |
|------|-----|-----|------------|
| sage | 135, 169, 107 | #87A96B | Primärfärg, CTA |
| terracotta | 212, 103, 74 | #D4674A | Varningar, fel |
| lavender | 155, 143, 191 | #9B8FBF | Info, accenter |
| charcoal | 44, 40, 36 | #2C2824 | Text |
| ash | 90, 85, 80 | #5A5550 | Sekundär text |
| cream | 249, 247, 244 | #F9F7F4 | Bakgrund |
| sand | 240, 237, 232 | #F0EDE8 | Kort, borders |

### 9.3 Typografi

| Typ | Font | Användning |
|-----|------|------------|
| Display | Lora (serif) | Rubriker, titlar |
| Body | Inter (sans-serif) | Brödtext, UI |

### 9.4 Prioritetsindikatorer

| Prioritet | Indikator |
|-----------|-----------|
| Hög | 🔴 Röd punkt |
| Medium | 🟡 Gul punkt |
| Låg | 🟢 Grön punkt |

---

## 10. Säkerhet och GDPR

### 10.1 Autentisering

- Microsoft SSO via MSAL
- Alla användare måste vara inloggade
- Session timeout: 8 timmar

### 10.2 Behörigheter

| Nivå | Åtkomst |
|------|---------|
| Konsult | /Grannfrid (allt utom System) |
| Admin | /Grannfrid + System |
| Ägare | Allt + /Grannfrid AB |

### 10.3 GDPR

- Journalposter och uppdrag kan raderas permanent
- Radering tar bort relaterade filer
- Inga "soft deletes" för persondata
- SharePoint versionshistorik för spårbarhet

### 10.4 Backup

- SharePoint versionshistorik (automatisk)
- Papperskorg 93 dagar
- Microsoft 365 backup ingår

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

| Funktion | Status | Motivering |
|----------|--------|------------|
| Rich text-editor | Bortvald | Plain text räcker |
| Kvällspris | Borttagen | Användes aldrig |
| Attestering | Ej behov | Litet team |
| Offline-läge | Framtid | Sverige har bra nät |
| Kundportal | Framtid | SharePoint-delning räcker |

---

## 13. Migrering från befintlig struktur

### 13.1 Mappning

| Nuvarande | Ny |
|-----------|-----|
| KUNDER - GBG | /Kunder - Göteborg |
| KUNDER - STHLM | /Kunder - Stockholm |
| Kunskapsdokument | /Kunskapsbank |
| MALLAR | /Mallar |
| Rutiner | /Kunskapsbank/Rutiner |
| PERSONAL | /Intranät/Personal |

### 13.2 Kundmapp-migrering

| Nuvarande | Ny |
|-----------|-----|
| Kontaktuppgifter/ | → kund.md (Kontakter-sektion) |
| Nedlagda timmar/ | → uppdrag.md (Journal-sektion) |
| Störningsärenden/ | → /Uppdrag |
| Avtal/ | → /Avtal |

---

## Ändringslogg

| Datum | Version | Ändringar |
|-------|---------|-----------|
| 2026-01-18 | 1.0 | Initial SharePoint-specifikation |
