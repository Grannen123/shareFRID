# Grannfrid - Utvecklingsplan (Roadmap)

## Faser

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  FAS 1          FAS 2          FAS 3          FAS 4          FAS 5     │
│  Foundation     Kärn-UI        Fakturering    AI & Polish    Extra     │
│                                                                         │
│  ██████████     ░░░░░░░░░░     ░░░░░░░░░░     ░░░░░░░░░░     ░░░░░░░░  │
│                                                                         │
│  ~1 vecka       ~2 veckor      ~1 vecka       ~1 vecka       Löpande   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fas 1: Foundation (~1 vecka)

### Mål
Grundläggande projektstruktur och infrastruktur.

### Uppgifter

- [ ] **Projektsetup**
  - [ ] Vite + React + TypeScript
  - [ ] Tailwind CSS konfiguration
  - [ ] ESLint + Prettier
  - [ ] Mappstruktur enligt ARCHITECTURE.md

- [ ] **Auth**
  - [ ] MSAL konfiguration
  - [ ] Microsoft SSO login
  - [ ] AuthContext med token-hantering
  - [ ] Protected routes

- [ ] **Graph Client**
  - [ ] Graph API client setup
  - [ ] Grundläggande fil-operationer (läs/skriv/lista)
  - [ ] Error handling

- [ ] **Markdown-hantering**
  - [ ] Frontmatter parsing (gray-matter)
  - [ ] Sektion-extraktion
  - [ ] Stringify-funktioner

- [ ] **UI Foundation**
  - [ ] AppShell (sidebar, header)
  - [ ] Grundläggande Radix-komponenter
  - [ ] Loading/Error/Empty states
  - [ ] Färgschema enligt spec

### Definition of Done
- [ ] Kan logga in med Microsoft-konto
- [ ] Kan läsa en fil från SharePoint
- [ ] Sidebar navigation fungerar
- [ ] Design matchar spec

---

## Fas 2: Kärn-UI (~2 veckor)

### Mål
Fungerande CRUD för kunder och uppdrag.

### Uppgifter

#### Vecka 1: Kunder

- [ ] **Kundlista**
  - [ ] Lista alla kunder från båda workspaces
  - [ ] Filtrering (status, workspace, sök)
  - [ ] Sortering

- [ ] **Kunddetalj**
  - [ ] Info-tab med alla fält
  - [ ] Kontakter-tab (tabell)
  - [ ] Anteckningar-tab
  - [ ] Filer-tab
  - [ ] Avtal-tab
  - [ ] Uppdrag-tab (lista)

- [ ] **Skapa/redigera kund**
  - [ ] Formulär med Zod-validering
  - [ ] Fortnox-kundnummer som primärnyckel
  - [ ] Skapa mappstruktur automatiskt

#### Vecka 2: Uppdrag

- [ ] **Uppdragslista**
  - [ ] Aggregerad lista från alla kunder
  - [ ] Filtrering (status, prioritet, ansvarig, kund)
  - [ ] Genväg i navigationen

- [ ] **Uppdragsdetalj**
  - [ ] Journal-tab med tidsvisning
  - [ ] Kontakter-tab
  - [ ] Uppgifter-tab (checkboxar)
  - [ ] Filer-tab

- [ ] **Journalposter**
  - [ ] Lägg till journalpost
  - [ ] Tidsregistrering
  - [ ] Entry type-väljare
  - [ ] Fakturatext-fält

- [ ] **Skapa uppdrag**
  - [ ] Formulär med alla fält
  - [ ] Automatiskt nummer (C-xxx/P-xxx)
  - [ ] Koppling till kund och avtal

### Definition of Done
- [ ] Kan lista, visa, skapa och redigera kunder
- [ ] Kan lista, visa, skapa uppdrag
- [ ] Kan lägga till journalposter med tid
- [ ] Uppgifter kan bockas av

---

## Fas 3: Fakturering (~1 vecka)

### Mål
Komplett faktureringsflöde med Fortnox-export.

### Uppgifter

- [ ] **Timbank-logik**
  - [ ] calculateTimebankSplit()
  - [ ] Automatisk split vid registrering
  - [ ] Uppdatera avtal.md med nytt saldo
  - [ ] Visuell indikator för timbank-status

- [ ] **"Att fakturera"-vy**
  - [ ] Lista kunder med förfakturerbart belopp
  - [ ] Drill-down till kundens poster
  - [ ] Gruppering per fakturamottagare
  - [ ] Checkbox för att välja poster

- [ ] **Slå ihop fakturor**
  - [ ] Välj flera poster för samma mottagare
  - [ ] Kombinera till en faktura

- [ ] **Fortnox-export**
  - [ ] Generera CSV i rätt format
  - [ ] Markera poster som exporterade
  - [ ] Spara exportfil i /System/Fakturering/

- [ ] **Avtal-hantering**
  - [ ] Skapa/redigera avtal
  - [ ] Timbank-saldo visning
  - [ ] Förnyelse-påminnelse

### Definition of Done
- [ ] Timbank-split fungerar korrekt
- [ ] Kan se förfakturerbart belopp
- [ ] Kan exportera till Fortnox-format
- [ ] Exporterade poster försvinner från listan

---

## Fas 4: AI & Polish (~1 vecka)

### Mål
AI-integration och UX-förbättringar.

### Uppgifter

- [ ] **AI-chatt**
  - [ ] Chat-panel (alltid synlig eller expanderbar)
  - [ ] Claude API integration
  - [ ] Kontext från aktuell vy
  - [ ] Grundläggande kommandon (sök, sammanfatta)

- [ ] **Kunskapsbank-kontext**
  - [ ] Indexera kunskapsbank
  - [ ] Inkludera relevant kontext i AI-prompts

- [ ] **Whisper-diktering**
  - [ ] Mikrofon-knapp i journal-input
  - [ ] Whisper API integration
  - [ ] Transkribering → förhandsvisning → spara

- [ ] **Arbetsyta**
  - [ ] Uppgifter + Anteckningar kombinerad vy
  - [ ] Snabbanteckning
  - [ ] Koppling till kund/uppdrag

- [ ] **Dashboard**
  - [ ] Personliga KPI:er
  - [ ] Mina uppgifter widget
  - [ ] Senaste aktivitet
  - [ ] Admin-sektion (för Jonas)

- [ ] **Notifikationer**
  - [ ] Tidsloggnings-påminnelse
  - [ ] Deadline-varningar

### Definition of Done
- [ ] Kan ställa frågor till AI om ärenden
- [ ] Kan diktera journalposter
- [ ] Dashboard visar relevant info
- [ ] Påminnelser fungerar

---

## Fas 5: Extra (Löpande)

### Prioritet 1

- [ ] **Intranät**
  - [ ] Fri navigering i /Intranät
  - [ ] Markdown-rendering

- [ ] **Grannfrid AB**
  - [ ] Separat sektion för ägare
  - [ ] Behörighetskontroll

- [ ] **Filer**
  - [ ] Uppladdning till rätt mapp
  - [ ] Förhandsvisning av bilder/PDF

### Prioritet 2

- [ ] **Outlook-integration**
  - [ ] Visa mail i uppdrag
  - [ ] Skicka mail från app

- [ ] **Kalender-integration**
  - [ ] Visa möten
  - [ ] Boka möten

- [ ] **Teams-inbäddning**
  - [ ] Tab app manifest
  - [ ] Teams SSO

### Prioritet 3

- [ ] **PWA**
  - [ ] Service worker
  - [ ] Installbar på hemskärm

- [ ] **Avancerad AI**
  - [ ] Gemini för bulk-operationer
  - [ ] Automatiska sammanfattningar
  - [ ] Mönsterigenkänning

---

## Milstolpar

| Milstolpe | Beskrivning | Mål |
|-----------|-------------|-----|
| **M1: Login** | Kan logga in och se SharePoint-filer | Fas 1 klar |
| **M2: Kunder** | Fullständig kundhantering | Fas 2, vecka 1 |
| **M3: Uppdrag** | Fullständig uppdragshantering | Fas 2, vecka 2 |
| **M4: Fakturering** | Kan exportera till Fortnox | Fas 3 klar |
| **M5: AI** | AI-chatt fungerar | Fas 4 klar |
| **M6: Production** | Redo för daglig användning | Alla faser |

---

## Risker och mitigation

| Risk | Sannolikhet | Påverkan | Mitigation |
|------|-------------|----------|------------|
| Graph API komplexitet | Medium | Hög | Börja med enkel PoC |
| Timbank-logik buggar | Hög | Hög | Omfattande tester |
| MSAL-konfiguration | Medium | Medium | Följ MS dokumentation noga |
| Performance med många filer | Låg | Medium | Caching, lazy loading |
| AI-kostnader | Medium | Låg | Gemini för bulk, övervakning |

---

## Definition of Done (övergripande)

En feature är klar när:

- [ ] Koden är skriven och fungerar
- [ ] TypeScript-typer är kompletta
- [ ] Zod-validering finns för input
- [ ] Felhantering är implementerad
- [ ] Loading states visas
- [ ] Testad manuellt
- [ ] Kritiska paths har enhetstester
- [ ] Dokumentation uppdaterad vid behov
