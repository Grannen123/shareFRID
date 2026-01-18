# Grannfrid

CRM och produktivitetsapp för bostadskonsulter.

## Om projektet

Grannfrid är ett verktyg för konsulter som hanterar störningsärenden, utredningar och bosociala uppdrag för BRF:er och fastighetsbolag i Sverige.

### Funktioner

- **Kundhantering** - Kunder med avtal, kontakter och historik
- **Ärendehantering** - Störningar, andrahandsuthyrning, utredningar
- **Tidsregistrering** - Journal med automatisk timbank-split
- **Fakturering** - Underlag och export till Fortnox
- **AI-assistent** - Claude-driven chat för dagligt arbete
- **Kunskapsbank** - Rutiner och juridik för AI-stöd

### Arkitektur

```
React (Frontend)
    ↓
Microsoft Graph API
    ↓
SharePoint (Markdown-filer = Databas)
```

## Kom igång

Se [docs/SETUP.md](docs/SETUP.md) för installationsinstruktioner.

## Dokumentation

| Dokument                                      | Beskrivning               |
| --------------------------------------------- | ------------------------- |
| [SPEC-SHAREPOINT.md](docs/SPEC-SHAREPOINT.md) | Fullständig specifikation |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)       | Teknisk arkitektur        |
| [ROADMAP.md](docs/ROADMAP.md)                 | Utvecklingsplan           |
| [SETUP.md](docs/SETUP.md)                     | Installationsguide        |
| [CLAUDE.md](CLAUDE.md)                        | AI-instruktioner          |

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **State:** TanStack React Query
- **UI:** Radix UI
- **Auth:** Microsoft SSO (MSAL)
- **Backend:** SharePoint via Graph API
- **AI:** Claude API, Gemini Flash, Whisper

## Utveckling

```bash
# Installera dependencies
npm install

# Starta utvecklingsserver
npm run dev

# Bygg för produktion
npm run build

# Kör tester
npm test
```

## Projektstruktur

```
shareFRID/
├── docs/                    # Dokumentation
│   ├── SPEC-SHAREPOINT.md   # Huvudspecifikation
│   ├── ARCHITECTURE.md      # Arkitektur
│   ├── ROADMAP.md           # Utvecklingsplan
│   └── SETUP.md             # Installation
├── src/                     # Källkod
│   ├── components/          # React-komponenter
│   ├── features/            # Funktionsmoduler
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   ├── pages/               # Sidor/routes
│   └── types/               # TypeScript-typer
├── CLAUDE.md                # AI-instruktioner
└── README.md                # Detta dokument
```

## Licens

Proprietär - Grannfrid AB
