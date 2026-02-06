# Grannfrid CRM

Ett CRM-system för bostadskonsulter som hanterar störningsärenden, utredningar och sociala boendeuppdrag för bostadsrättsföreningar (BRF) och fastighetsbolag i Sverige.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI
- **State Management:** TanStack React Query
- **Forms:** React Hook Form + Zod
- **Routing:** React Router
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **AI:** Claude + Gemini (planerat)

## Snabbstart

### Förutsättningar

- Node.js 18+
- npm eller pnpm
- Supabase-konto

### Installation

```bash
# Klona repot
git clone https://github.com/Grannen123/shareFRID.git
cd shareFRID/app

# Installera beroenden
npm install

# Kopiera miljövariabler
cp .env.example .env.local

# Redigera .env.local med dina Supabase-credentials
```

### Supabase Setup

1. Skapa ett nytt Supabase-projekt på [supabase.com](https://supabase.com)
2. Kör SQL-schemat: `supabase/schema.sql`
3. Kopiera URL och anon key till `.env.local`

### Utveckling

```bash
npm run dev
```

Öppna [http://localhost:5173](http://localhost:5173)

### Produktion

```bash
npm run build
npm run preview
```

## Projektstruktur

```
app/
├── src/
│   ├── components/
│   │   ├── layout/          # AppShell, Sidebar, Header, AIChat
│   │   ├── shared/          # Återanvändbara komponenter
│   │   └── ui/              # Radix-baserade primitiver
│   ├── features/            # Feature-moduler (kunder, ärenden, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── constants.ts     # Svenska labels och konstanter
│   │   ├── supabase.ts      # Supabase-klient
│   │   └── utils.ts         # Hjälpfunktioner
│   ├── pages/               # Sidkomponenter
│   └── types/               # TypeScript-typer
├── supabase/
│   └── schema.sql           # Databasschema
└── .env.example             # Miljövariabel-mall
```

## Kärnfunktioner

### Kunder (Customers)
- Hantera BRF:er och fastighetsbolag
- Kontaktpersoner och fakturamottagare
- Uppdelat på arbetsyta (Göteborg/Stockholm)

### Avtal (Agreements)
- **Löpande:** Alla timmar faktureras
- **Timbank:** X timmar ingår, övertid faktureras separat
- **Fastpris:** Fast belopp per period
- **Engångsbelopp:** Engångsuppdrag

### Ärenden (Cases)
- Störningsärenden (C-26-xxx)
- Projekt (P-26-xxx)
- Journalanteckningar med tidrapportering
- Automatisk timbank-split

### Fakturering (Billing)
- Automatisk beräkning av timbank-split
- Granska och godkänn faktureringsrader
- Export till Fortnox (planerat)

### Kunskapsbank
- Mallar och processbeskrivningar
- Juridisk vägledning
- Sökbar dokumentation

## Bidra

1. Läs [CLAUDE.md](../CLAUDE.md) för kodkonventioner
2. Skapa en feature branch från main
3. Följ commit-meddelandeformatet
4. Skapa en pull request

## Licens

Proprietär - Grannfrid AB
