# Grannfrid - Komplett Applikationsbeskrivning för Utvecklare

**Version:** 1.0.0
**Datum:** 2025-11-21
**Applikationstyp:** Modern konsult- och case management-plattform
**Målgrupp:** Svenska konsultföretag inom fastighet, socialtjänst och konsultsektorn

---

## Innehållsförteckning

1. [Executive Summary](#1-executive-summary)
2. [Teknisk Stack och Arkitektur](#2-teknisk-stack-och-arkitektur)
3. [Design System och Filosofi](#3-design-system-och-filosofi)
4. [Datamodeller och Typer](#4-datamodeller-och-typer)
5. [Routing och Navigation](#5-routing-och-navigation)
6. [Vyer och Komponenter](#6-vyer-och-komponenter)
7. [State Management och Kontext](#7-state-management-och-kontext)
8. [Integrationer och Services](#8-integrationer-och-services)
9. [Testing och Kvalitetssäkring](#9-testing-och-kvalitetssäkring)
10. [Byggprocess och Deployment](#10-byggprocess-och-deployment)
11. [Tillgänglighet och Performance](#11-tillgänglighet-och-performance)
12. [Utvecklingsmiljö och Verktyg](#12-utvecklingsmiljö-och-verktyg)

---

## 1. Executive Summary

### 1.1 Vad är Grannfrid?

Grannfrid är en avancerad konsult- och case management-plattform speciellt byggd för svenska företag. Applikationen kombinerar:

- **Uppdragshantering** - Centraliserad hantering av cases och projekt
- **Automatisk tidsspårning** - Fånga varje debiterbar minut
- **Ekonomi och fakturering** - Live invoice preview, olika avtalstyper (Löpande, Timbank, Fastpris)
- **Dokumentautomation** - Mallar med smart merge fields
- **Kundportal funktionalitet** - Säker kommunikation och dokumentdelning
- **SharePoint-integration** - Microsoft 365 arbetsytor direkt i applikationen
- **AI-assistans** - Google Gemini API för sammanfattningar, rengöring av anteckningar, och mer
- **Dashboard och Analytics** - Real-time KPI:er och rapporter

### 1.2 Kärnfunktionalitet

**Huvudmoduler:**

1. **Dashboard** - Översikt med widgets, KPI:er, aktivitetsflöde
2. **Kunder** - CRM-funktionalitet med avtalsstyrning
3. **Uppdrag** - Unified vy för både Cases och Projekt
4. **Ekonomi** - Faktureringsunderlag, tidbank-övervakning, avtalsrapporter
5. **Uppgifter** - Uppgiftshantering med prioritering och koppling till kunder/uppdrag
6. **Kontakter** - Både kundkontakter och fristående kontakter (leverantörer, partners)
7. **Anteckningar** - Snabbanteckningar som kan kopplas till uppdrag/kunder
8. **Kunskapsbank** - Dokumenthantering för interna policies och rutiner
9. **Mallar** - Dokumentmallar för vanliga arbetsflöden
10. **Inställningar** - Systemkonfiguration och användarprofilhantering

### 1.3 Unika Särdrag

- **Svenskt fokus** - All text, datum, valuta i svenska format
- **Varm humanistisk design** - Aldrig kall eller steril, inspirerad av Folk.app och Notion
- **Typografi-driven UI** - Inter för allt UI, kristallklar hierarki
- **Uppdragscentrerad arkitektur** - Allt kretsar kring Cases och Projekt
- **Flexibla avtalsmodeller** - Stöd för tre olika avtalstyper med automatisk faktureringslogik
- **Lokal-först utveckling** - Mock data i localStorage för snabb utveckling, Supabase för produktion

---

## 2. Teknisk Stack och Arkitektur

### 2.1 Frontend Stack

```json
{
  "core": {
    "runtime": "React 18.3.1",
    "language": "TypeScript 5.8.2",
    "buildTool": "Vite 6.2.0",
    "routing": "React Router DOM 7.9.3"
  },
  "styling": {
    "framework": "Tailwind CSS 3.4.17",
    "animations": "Framer Motion 12.23.24",
    "customTokens": "CSS Custom Properties (design-tokens.css)"
  },
  "uiPrimitives": {
    "radixUI": "38+ komponenter från @radix-ui/*",
    "patterns": "shadcn/ui komponentmönster",
    "icons": "Lucide React 0.544.0"
  },
  "richText": {
    "editor": "Tiptap 2.5.7 (ProseMirror-baserad)",
    "extensions": "Tables, Placeholder, Starter Kit"
  },
  "stateManagement": {
    "global": "React Context API (AppContext, UIContext, DataContext)",
    "server": "TanStack Query 5.90.2",
    "localStorage": "Custom hooks (useLocalStorage)"
  },
  "dataLayer": {
    "mock": "localStorage med mockdata",
    "production": "Supabase 2.58.0 (PostgreSQL)"
  }
}
```

### 2.2 Development Tools

```json
{
  "testing": {
    "unit": "Vitest 3.2.4",
    "e2e": "Playwright 1.56.1",
    "visualRegression": "@playwright/test",
    "componentDevelopment": "Storybook 9.1.8"
  },
  "codeQuality": {
    "linting": "ESLint 9.36.0 + TypeScript ESLint",
    "accessibility": "eslint-plugin-jsx-a11y 6.10.2",
    "formatting": "Prettier (via ESLint)",
    "gitHooks": "Husky 9.1.7"
  },
  "performance": {
    "bundleAnalysis": "rollup-plugin-visualizer 6.0.4",
    "listVirtualization": "@tanstack/react-virtual 3.13.12"
  }
}
```

### 2.3 Integrationer

```json
{
  "ai": "Google Gemini API (@google/genai 1.12.0)",
  "microsoft365": "SharePoint REST API (custom implementation)",
  "backend": "Supabase (PostgreSQL, Auth, Storage)"
}
```

### 2.4 Projektstruktur

```
grannfrid-clean/
├── App.tsx                          # Root component
├── main.tsx                         # Entry point
├── routes.tsx                       # React Router configuration
├── types.ts                         # Globala TypeScript types
│
├── design-system/                   # Kanoniska komponenter (V4)
│   ├── components/                  # Specialiserade komponenter
│   │   ├── CommandCenter.tsx        # Cmd+K kommando-palett
│   │   └── KeyboardShortcutsHelp.tsx
│   ├── layouts/                     # Layout-komponenter
│   │   ├── RootLayout.tsx           # Huvudlayout med navigation
│   │   ├── PageHeader.tsx           # Standardiserad sidtopp
│   │   ├── ListViewLayout.tsx       # 3-kolumns listvy
│   │   ├── DetailViewLayout.tsx     # Detaljvy med sidebar
│   │   ├── DashboardLayout.tsx      # Dashboard grid
│   │   ├── CollapsibleSidebar.tsx   # Kollapsbar sidokolumn
│   │   ├── LeftColumn.tsx           # Vänster kolumn (listor)
│   │   ├── CenterColumn.tsx         # Mitten kolumn (arbetsyta)
│   │   ├── RightColumn.tsx          # Höger kolumn (kontext)
│   │   ├── DashboardSection.tsx     # Dashboard-sektion wrapper
│   │   └── FormView.tsx             # Formulärvy
│   ├── modals/                      # Modal komponenter
│   │   ├── AppModals.tsx            # Modal router
│   │   ├── AddCustomerModal.tsx
│   │   ├── AddCaseModal.tsx
│   │   ├── AddProjectModal.tsx
│   │   ├── AddTaskModal.tsx
│   │   ├── AddContactModal.tsx
│   │   ├── AIChatModal.tsx          # AI assistent modal
│   │   └── InvoiceBatchDetailModal.tsx
│   ├── state/                       # State-relaterade komponenter
│   │   ├── Spinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── typography/                  # Typografi komponenter
│   │   ├── Heading.tsx
│   │   ├── Text.tsx
│   │   └── Label.tsx
│   ├── ui/                          # UI primitiver (Radix-baserade)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Table.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Switch.tsx
│   │   ├── Tabs.tsx
│   │   ├── Dialog.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── IconWrapper.tsx
│   │   └── ... (38+ Radix UI komponenter)
│   └── views/                       # Huvudvyer
│       ├── DashboardRedesign.tsx    # Dashboard (primär)
│       ├── CustomersRedesign.tsx    # Kundlista
│       ├── CustomerDetailView.tsx   # Kunddetalj
│       ├── AssignmentsRedesign.tsx  # Uppdragslista
│       ├── CaseDetailView.tsx       # Case-detalj
│       ├── ProjectDetailView.tsx    # Projekt-detalj
│       ├── AssignmentDetailRedirect.tsx  # Router för uppdrag
│       ├── ContactsListView.tsx     # Kontaktlista
│       ├── ContactDetailView.tsx    # Kontaktdetalj
│       ├── EconomyView.tsx          # Ekonomivy
│       ├── TasksView.tsx            # Uppgiftsvy
│       ├── NotesListView.tsx        # Anteckningar
│       ├── TemplatesView.tsx        # Mallar
│       ├── KnowledgeBaseView.tsx    # Kunskapsbank
│       ├── SettingsView.tsx         # Inställningar
│       ├── ProfileView.tsx          # Användarprofil
│       ├── DeveloperView.tsx        # Utvecklarverktyg
│       └── InternalView.tsx         # Interna vyer
│
├── context/                         # React Context providers
│   ├── AppProvider.tsx              # Root provider
│   ├── AppContext.tsx               # Global app state
│   ├── UIContext.tsx                # UI state (modals, toasts)
│   ├── DataContext.tsx              # Data state & CRUD operations
│   ├── SelectionContext.tsx         # Selecterade entiteter
│   └── ActionsContext.tsx           # Global actions
│
├── data/                            # Mock data & seeds
│   ├── mockData.ts                  # MOCK_CUSTOMERS, MOCK_CASES, etc.
│   ├── prompts.ts                   # DEFAULT_AI_PROMPTS
│   └── defaultDashboard.ts          # DEFAULT_DASHBOARD_LAYOUT
│
├── hooks/                           # Custom hooks
│   ├── useLocalStorage.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useCommandCenterActions.ts
│   ├── useCustomers.ts              # TanStack Query för kunder
│   ├── useCases.ts                  # TanStack Query för cases
│   └── useProjects.ts               # TanStack Query för projekt
│
├── lib/                             # Utilities
│   ├── supabaseClient.ts            # Supabase konfiguration
│   └── utils.ts                     # Helper funktioner (cn, etc.)
│
├── repositories/                    # Data access layer
│   ├── factory.ts                   # Repository factory
│   ├── CustomerRepository.ts
│   ├── CaseRepository.ts
│   ├── ProjectRepository.ts
│   └── ... (repositories för varje entitet)
│
├── services/                        # Business logic services
│   ├── dataSource.ts                # Data source resolver
│   ├── index.ts                     # Service factory
│   ├── CustomerService.ts
│   ├── CaseService.ts
│   ├── ProjectService.ts
│   ├── JournalService.ts
│   ├── TodoService.ts
│   ├── ContactService.ts
│   ├── FreestandingContactService.ts
│   ├── NoteService.ts
│   ├── FileService.ts
│   ├── geminiService.ts             # AI service
│   ├── sharepointIntegration.ts     # SharePoint API
│   └── db.ts                        # IndexedDB för filer
│
├── styles/                          # Global styles
│   ├── app.css                      # Main stylesheet
│   ├── design-tokens.css            # CSS custom properties
│   ├── fonts.css                    # Font faces (Inter)
│   └── dashboard-animations.css     # Dashboard-specifika animationer
│
├── docs/                            # Dokumentation
│   ├── Finaldesign.md               # Design guide V4 (auktoritativ)
│   ├── finaldesignToDo.md           # Implementeringsplan
│   ├── WCAG_COMPLIANCE_EXPLANATION.md
│   ├── issues/                      # Design audits & backlog
│   │   ├── typography-issues.json
│   │   ├── spacing-issues.json
│   │   └── token-backlog.json
│   └── qa/                          # QA dokumentation
│
├── scripts/                         # Automation scripts
│   ├── typography-audit.cjs
│   ├── color-audit.cjs
│   ├── spacing-audit.cjs
│   ├── migrate-typography.cjs
│   ├── fix-spacing.cjs
│   └── fix-colors.cjs
│
├── tests/                           # Test configuration
│   └── visual-regression.spec.ts    # Playwright visual tests
│
├── config/                          # Configuration files
│   └── appConfig.ts                 # App configuration
│
├── tailwind.config.ts               # Tailwind configuration
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies & scripts
└── README.md                        # Project README
```

### 2.5 Arkitektoniska Beslut

**Separation of Concerns:**

1. **Presentation Layer** (`design-system/`)
   - Fokuserar på UI och användarinteraktion
   - Inga business logic-beroenden
   - Återanvändbara komponenter

2. **State Management Layer** (`context/`)
   - Global state med Context API
   - Server state med TanStack Query
   - Separation mellan UI state och Data state

3. **Business Logic Layer** (`services/`)
   - CRUD operationer
   - Business rules
   - External integrations

4. **Data Access Layer** (`repositories/`)
   - Abstraherar datakälla (mock vs Supabase)
   - Enhetlig interface oavsett backend
   - Factory pattern för repository creation

**Repository Pattern:**

```typescript
// Exempel: CustomerRepository interface
interface ICustomerRepository {
  getAll(): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  create(customer: Omit<Customer, "id" | "createdAt">): Promise<Customer>;
  update(customer: Customer): Promise<void>;
  delete(id: string): Promise<void>;
}

// Mock implementation
class MockCustomerRepository implements ICustomerRepository {
  // localStorage-baserad implementation
}

// Supabase implementation
class SupabaseCustomerRepository implements ICustomerRepository {
  // Supabase-baserad implementation
}
```

**TanStack Query Integration:**

```typescript
// hooks/useCustomers.ts
export const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const repo = createCustomerRepository();
      return repo.getAll();
    },
  });
};

export const useAddCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Omit<Customer, "id" | "createdAt">) => {
      const repo = createCustomerRepository();
      return repo.create(customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
```

---

## 3. Design System och Filosofi

### 3.1 Designfilosofi: "Varm Humanistisk Modernism"

Grannfrid följer en unik designfilosofi inspirerad av Folk.app, Notion och moderna SaaS-appar, men anpassad för svenskt konsultarbete.

**5 Kärnprinciper:**

1. **Typografisk Disciplin** (huvudprincip)
   - Appen är "Typography-Driven"
   - All UI-text använder **Inter**
   - Kristallklar hierarki via:
     - Inter Semibold (600) för titlar/rubriker
     - Inter Regular (400) för brödtext
   - Playfair Display används ENDAST i statiska artiklar (t.ex. Kunskapsbank)

2. **Generös & Konsekvent Luft (Whitespace)**
   - Allt ska andas
   - Padding och marginaler följer strikt **8px grid system**
   - Konsistens i spacing skapar lugn, fokus och närvaro
   - Standardspacing: 8px, 16px, 24px, 32px, 48px

3. **Varm Humanistisk Estetik**
   - Aldrig kald eller steril
   - Varm färgpalett: beige, taupe, warm grey
   - Mjuk, organisk geometri: `rounded-2xl` är standarden
   - Ljusa bakgrunder med varma undertoner

4. **Återhållsam Minimalism**
   - Färger används endast för accenter (badges, aktiva statusar)
   - Text och siffror är alltid mörka, varma toner
   - Skuggor är minimala (`--shadow-xs`) för att minska brus

5. **Polerade Interaktioner**
   - Samtliga interaktioner använder `ease-out 250ms`
   - Hover-effekter är mjuka, responsen känns "levande"
   - Kvaliteten i mikrointeraktioner signalerar hantverk

### 3.2 Färgpalett (WCAG AA-compliant)

```css
/* Design Tokens (styles/design-tokens.css) */

/* --- NEUTRALS (Foundation) --- */
--true-black: #0a0a0a; /* Text, ikoner */
--charcoal: #2d2d2d; /* Sekundär text */
--warm-grey-700: #4a4a4a; /* Tertiär text */
--warm-grey-500: #6b6b6b; /* Disabled text */
--warm-grey-300: #9e9e9e; /* Borders, dividers */
--warm-grey-100: #d4d4d4; /* Subtle borders */
--warm-grey-50: #f0f0ee; /* Light backgrounds */

/* --- WARM BACKGROUNDS --- */
--off-white: #fdfcfa; /* Page background */
--warm-white: #faf9f7; /* Card backgrounds */
--light-beige: #f5f3f0; /* Sidebar backgrounds */
--cream: #f9f7f4; /* Hover states */
--soft-taupe: #ebe8e3; /* Borders */

/* --- ACCENT COLORS (Sparsamt används) --- */
--sage-green: #8fa98e; /* Success, active states */
--terracotta: #c67b5c; /* Alerts, high priority */
--dusty-blue: #7a9bb8; /* Info, links */
--warm-ochre: #d4a574; /* Warnings */

/* --- STATUS COLORS --- */
--status-success: #8fa98e;
--status-warning: #d4a574;
--status-error: #c67b5c;
--status-info: #7a9bb8;

/* --- SHADOWS (Minimal & Soft) --- */
--shadow-xs: 0 1px 2px rgba(10, 10, 10, 0.05);
--shadow-sm: 0 2px 4px rgba(10, 10, 10, 0.06);
--shadow-md: 0 4px 8px rgba(10, 10, 10, 0.08);
--shadow-lg: 0 8px 16px rgba(10, 10, 10, 0.1);

/* --- TRANSITIONS --- */
--duration-base: 250ms;
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
```

**Färganvändning:**

- **Text:** Alltid `--true-black` eller `--charcoal` (aldrig färgad text)
- **Bakgrunder:** Varma nyanser (`--off-white`, `--warm-white`, `--light-beige`)
- **Accenter:** Badges, statusindikationer, hover states
- **Borders:** `--soft-taupe` eller `--warm-grey-300`

### 3.3 Typografi

**Fonter:**

```css
/* styles/fonts.css */

/* Inter - Primary UI font */
@font-face {
  font-family: "Inter";
  src: url("/fonts/Inter-Regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Inter";
  src: url("/fonts/Inter-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-display: swap;
}
```

**Typografi-skala:**

| Element    | Font  | Weight | Size | Line Height | Usage              |
| ---------- | ----- | ------ | ---- | ----------- | ------------------ |
| H1         | Inter | 600    | 32px | 1.2         | Page titles        |
| H2         | Inter | 600    | 24px | 1.3         | Section headers    |
| H3         | Inter | 600    | 20px | 1.4         | Card headers       |
| H4         | Inter | 600    | 16px | 1.4         | Subsection headers |
| Body Large | Inter | 400    | 16px | 1.5         | Primary text       |
| Body       | Inter | 400    | 14px | 1.5         | Default text       |
| Body Small | Inter | 400    | 13px | 1.4         | Secondary text     |
| Caption    | Inter | 400    | 12px | 1.3         | Metadata, labels   |

**Typografi-komponenter:**

```tsx
// design-system/typography/Heading.tsx
<Heading level="h1" weight="semibold">Dashboard</Heading>
<Heading level="h2" weight="semibold">Aktiva uppdrag</Heading>

// design-system/typography/Text.tsx
<Text size="base" color="primary">Normal text</Text>
<Text size="sm" color="secondary">Secondary text</Text>
<Text size="xs" color="tertiary">Metadata</Text>

// design-system/typography/Label.tsx
<Label htmlFor="input-id">Input label</Label>
```

### 3.4 Spacing System (8px Grid)

All spacing följer ett strikt 8px grid system:

```css
/* Tailwind spacing (tailwind.config.ts) */
spacing: {
  '0': '0',
  '1': '8px',   // Base unit
  '2': '16px',  // 2x
  '3': '24px',  // 3x
  '4': '32px',  // 4x
  '5': '40px',  // 5x
  '6': '48px',  // 6x
  '8': '64px',  // 8x
  '12': '96px', // 12x
  '16': '128px' // 16x
}
```

**Spacing-regler:**

- **Padding inuti kort:** `p-4` (32px)
- **Gap mellan element i en grupp:** `gap-2` (16px)
- **Margin mellan sektioner:** `mb-6` (48px)
- **Page padding:** `p-6` eller `p-8` (48px eller 64px)

### 3.5 Layoutarkitektur

**3-kolumns "Mail-app" Layout** (Standard för huvudmoduler):

```
┌────┬──────────┬─────────────────────┬──────────────────┐
│ NAV│ KOLUMN 1 │ KOLUMN 2            │ KOLUMN 3         │
│64px│ (360px)  │ (flex-1)            │ (384px)          │
├────┼──────────┼─────────────────────┼──────────────────┤
│Icon│ Lista    │ Arbetsyta/Detaljvy  │ Kontext/Metadata │
│Rail│ - Sök    │ - Header + Tabs     │ - Todos          │
│    │ - Filter │ - Huvudinnehåll     │ - Kontakter      │
│    │ - Lista  │ - Inmatning (fast)  │ - Detaljer       │
└────┴──────────┴─────────────────────┴──────────────────┘
```

**Kolumn 1 (Vänster - Listor):**

- Bredd: `360px` (fast)
- Sök-input högst upp
- Filter/Tabs
- Scrollbar lista med kort eller tabellrader
- Kollapsbar med knapp (`<<`)

**Kolumn 2 (Mitten - Arbetsyta):**

- Bredd: `flex-1` (expanderbar)
- Header med titel, breadcrumbs, actions
- Tabs för olika vyer
- Huvudinnehåll (scrollbar)
- Fast inmatningsfält i botten (om tillämpligt)

**Kolumn 3 (Höger - Kontext):**

- Bredd: `384px` (`w-96`)
- Widgets relaterade till vald entitet
- Todos, kontakter, metadata
- Kollapsbar med knapp (`>>`)

**Specialvyer:**

| Vy            | Layout      | Kolumner                         |
| ------------- | ----------- | -------------------------------- |
| Dashboard     | Widget Grid | 1 (fullskärm)                    |
| Uppgifter     | Workspace   | 1 (fullskärm med vyväxlare)      |
| Ekonomi       | Report      | 1 (fullskärm med stora tabeller) |
| Kunskapsbank  | Document    | 2 (70% innehåll, 30% sidebar)    |
| Inställningar | Document    | 2 (30% sidomeny, 70% innehåll)   |

### 3.6 Komponenter

**UI Primitives** (`design-system/ui/`):

Baserade på Radix UI + shadcn/ui patterns:

- **Button** - Variants: primary, secondary, ghost, destructive
- **Input** - Text inputs med validering
- **Badge** - Status badges med färgkodning
- **Card** - Containrar med shadow och padding
- **Table** - Datavisning med sorting, filtering
- **Select** - Dropdown select med search
- **Checkbox** - Checkboxes med indeterminate state
- **Switch** - Toggle switches
- **Tabs** - Tab navigation
- **Dialog/Modal** - Modal dialogs
- **DropdownMenu** - Context menus
- **Tooltip** - Hover tooltips
- **Avatar** - User avatars
- **Progress** - Progress bars
- **Skeleton** - Loading skeletons
- **Separator** - Visual dividers
- **ScrollArea** - Custom scrollbars
- **Command** - Command palette (Cmd+K)

**Layout Components** (`design-system/layouts/`):

- **RootLayout** - Huvudlayout med navigation rail
- **PageHeader** - Standardiserad sidtopp
- **ListViewLayout** - 3-kolumns listvy
- **DetailViewLayout** - Detaljvy med sidebar
- **DashboardLayout** - Dashboard grid
- **CollapsibleSidebar** - Kollapsbar sidebar
- **FormView** - Formulärvy

**Typography Components** (`design-system/typography/`):

- **Heading** - H1-H6 headers
- **Text** - Paragraphs och spans
- **Label** - Form labels

**Specialized Components** (`design-system/components/`):

- **CommandCenter** - Cmd+K kommandopalett
- **KeyboardShortcutsHelp** - Keyboard shortcuts overlay

### 3.7 Design Tokens

Alla design tokens definieras i `styles/design-tokens.css` som CSS custom properties och kan användas i både CSS och Tailwind:

```css
/* Exempel användning */
.custom-button {
  background: var(--warm-white);
  color: var(--true-black);
  border: 1px solid var(--soft-taupe);
  box-shadow: var(--shadow-xs);
  transition: all var(--duration-base) var(--ease-out);
}

.custom-button:hover {
  background: var(--cream);
  box-shadow: var(--shadow-sm);
}
```

```tsx
// I Tailwind (via tailwind.config.ts)
<div className="bg-warm-white text-true-black border border-soft-taupe shadow-xs">
  Content
</div>
```

---

## 4. Datamodeller och Typer

All typ-information finns i `types.ts`. Här är de viktigaste datamodellerna:

### 4.1 Kunder (Customer)

```typescript
export enum CustomerType {
  Brf = "Brf",
  Fastighetsbolag = "Fastighetsbolag",
  Forvaltningsbolag = "Förvaltningsbolag",
  Samfallighet = "Samfällighet",
  Annan = "Annan",
}

export interface Customer {
  id: string;
  customerNumber: string; // Auto-genererad: K-001, K-002, etc.
  customerType: CustomerType;
  realtyCompanySubType?: RealtyCompanySubType;
  otherCustomerType?: string;
  numberOfApartments?: number;
  orgNumber?: string; // Org-/Personnummer
  name: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  invoiceEmail?: string;
  website?: string;
  responsibleConsultant?: string; // Ansvarig konsult
  invoiceAddress: {
    address1: string;
    address2?: string;
    zipCode: string;
    city: string;
    country: string;
    countryCode: string;
  };
  createdAt: string; // ISO 8601
  agreement?: Agreement; // Se nedan
}
```

### 4.2 Avtal (Agreement)

Grannfrid stöder tre olika avtalstyper:

```typescript
export enum AgreementType {
  PayPerHour = "Löpande timdebitering",
  TimeBank = "Timbank",
  FixedPrice = "Fastpris",
}

export type AgreementPeriod = "monthly" | "yearly";
export type BillingCycle = "advance" | "arrears"; // Förskott / Efterskott

export interface BaseAgreement {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  noticePeriodMonths: 3 | 6;
  autoRenew: boolean;
  nextIndexationDate?: string; // YYYY-MM-DD
}

// 1. Löpande timdebitering
export interface PayPerHourAgreement extends BaseAgreement {
  type: AgreementType.PayPerHour;
  hourlyRate: number; // SEK per timme
}

// 2. Timbank
export interface TimeBankAgreement extends BaseAgreement {
  type: AgreementType.TimeBank;
  period: AgreementPeriod; // 'monthly' eller 'yearly'
  hoursIncluded: number; // Inkluderade timmar
  price: number; // Pris för perioden (månad/år)
  overtimeRate: number; // SEK per övertidstimme
  billingCycle: BillingCycle; // 'advance' (förskott) eller 'arrears' (efterskott)
}

// 3. Fastpris
export interface FixedPriceAgreement extends BaseAgreement {
  type: AgreementType.FixedPrice;
  annualPrice: number; // Årligt fastpris
  billableRate: number; // Timpris för arbete utanför scope
}

export type Agreement =
  | PayPerHourAgreement
  | TimeBankAgreement
  | FixedPriceAgreement;
```

**Faktureringslogik:**

- **PayPerHour:** Alla timmar faktureras direkt à `hourlyRate`
- **TimeBank:** Inkluderade timmar ingår i `price`, överskjutande timmar à `overtimeRate`
- **FixedPrice:** Årlig avgift faktureras enligt `annualPrice`, extra arbete à `billableRate`

### 4.3 Uppdrag (Assignment)

Unified modell för både Cases och Projekt:

```typescript
export enum AssignmentKind {
  Case = "case",
  Project = "project",
}

export enum AssignmentStatus {
  Active = "Pågående",
  Paused = "Vilande",
  Closed = "Avslutat",
}

export enum AssignmentPriority {
  High = "Hög prioritet",
  Medium = "Medium prioritet",
  Low = "Låg prioritet",
}

export interface Assignment {
  id: string;
  customerId: string;
  title: string;
  referenceNumber?: string; // Externt referensnummer
  caseNumber?: string; // Auto-genererad: C-001, C-002
  projectNumber?: string; // Auto-genererad: P-001, P-002
  kind: AssignmentKind;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  responsibleConsultant?: string;
  invoiceRecipientContactId?: string; // Vilken kontakt som ska få fakturan
  createdAt: string;
  updatedAt: string;

  // Fastpris-specifika fält
  isFixedPrice?: boolean;
  fixedPriceAmount?: number;
  fixedPriceBillingType?: "advance" | "arrears";
  advanceInvoiceDate?: string; // YYYY-MM-DD
}

// Type guards för Case vs Project
export type Case = Assignment & {
  kind: AssignmentKind.Case;
  caseNumber: string;
  projectNumber?: never;
};

export type Project = Assignment & {
  kind: AssignmentKind.Project;
  projectNumber: string;
  caseNumber?: never;
};
```

### 4.4 Journalanteckningar (JournalEntry)

Kopplade till Cases eller Projekt:

```typescript
export type JournalEntryType = "call" | "email" | "meeting" | "visit";

export interface JournalEntry {
  id: string;
  caseId: string;
  content: string; // HTML content (Tiptap)
  createdAt: string;

  // Tid och fakturering
  hours?: number;
  invoiceComment?: string; // Kommentar som visas på fakturan
  attachmentIds?: string[]; // Referenser till CaseFile
  isBillable?: boolean; // För FixedPrice/TimeBank: markera extraarbete
  rateApplied?: number; // Timpris som användes
  amount?: number; // hours × rateApplied

  // Metadata
  entryType?: JournalEntryType;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  isPinned?: boolean; // Viktiga anteckningar
}

// Motsvarande för projekt
export interface ProjectJournalEntry {
  // Samma fält som JournalEntry men med projectId istället för caseId
  id: string;
  projectId: string;
  // ... resten samma
}
```

### 4.5 Uppgifter (Todo)

```typescript
export enum TodoPriority {
  High = "Hög",
  Medium = "Medium",
  Low = "Låg",
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  priority: TodoPriority;
  dueDate: string; // YYYY-MM-DD
  caseId?: string; // Koppling till case
  projectId?: string; // Koppling till projekt
  customerId?: string; // Koppling till kund
  assignedTo?: string; // Tilldelad konsult
}
```

### 4.6 Kontakter

**Kundkontakter** (CustomerContact):

```typescript
export interface CustomerContact {
  id: string;
  customerId: string;
  name: string;
  role: string; // Ex: "Styrelseordförande"
  email?: string;
  phone?: string;
  isInvoiceRecipient: boolean; // Ska få fakturor?
  otherInfo?: string;
}
```

**Case-kontakter** (CaseContact):

```typescript
export interface CaseContact {
  id: string;
  caseId: string;
  name: string;
  role: string; // Ex: "Vittne", "Granne", "Fastighetsskötare"
  email?: string;
  phone?: string;
  otherInfo?: string;
  isGlobalContact?: boolean; // Synlig i global kontaktlista?
}
```

**Fristående kontakter** (Contact):

```typescript
export enum ContactType {
  Supplier = "Leverantör",
  Partner = "Samarbetspartner",
  Other = "Övrig",
}

export interface Contact {
  id: string;
  contactType: ContactType;
  name: string;
  role: string;
  company?: string;
  email?: string;
  phone?: string;
  otherInfo?: string;
  createdAt: string;
}
```

### 4.7 Fakturering

**InvoiceBatch** (Faktureringsunderlag):

```typescript
export type InvoiceLineItemSource =
  | "journal"
  | "project_journal"
  | "agreement_fixed"
  | "manual";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number; // Timmar eller 1 för fasta poster
  unit: "tim" | "st";
  rate: number; // Timpris
  amount: number; // quantity × rate
  sourceType: InvoiceLineItemSource;
  sourceId: string; // ID till JournalEntry, Agreement, etc.
}

export type InvoiceBatchStatus = "open" | "ready_for_export" | "exported";

export interface InvoiceBatch {
  id: string; // Format: "customerId-caseId-YYYY-MM"
  customerId: string;
  recipientContactId?: string; // Vem som får fakturan
  caseOrProjectId: string; // Case/Project ID eller "agreement"
  type: "case" | "project" | "agreement";
  year: number;
  month: number; // 1-12
  status: InvoiceBatchStatus;
  lineItems: InvoiceLineItem[];
}
```

**StatisticalBatch** (Statistikunderlag för Timbank/Fastpris):

```typescript
export interface StatisticalLineItem {
  id: string;
  description: string;
  hours: number;
  sourceId: string; // JournalEntry ID
}

export interface StatisticalBatch {
  id: string;
  customerId: string;
  caseOrProjectId: string;
  type: "case" | "project";
  year: number;
  month: number;
  lineItems: StatisticalLineItem[];
}
```

### 4.8 Övriga Typer

**Filer:**

```typescript
export interface CaseFile {
  id: string; // Används även som IndexedDB key
  caseId: string;
  name: string;
  type: string; // MIME type
  size: number; // Bytes
  createdAt: string;
}

export interface CustomerFile {
  id: string;
  customerId: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}
```

**Snabbanteckningar:**

```typescript
export interface QuickNote {
  id: string;
  content: string; // HTML content
  createdAt: string;
  updatedAt: string;
}
```

**Dokument (Kunskapsbank):**

```typescript
export type DocumentType = "knowledge" | "policy" | "routine";

export interface AppDocument {
  id: string;
  title: string;
  content: string; // HTML content
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
}
```

**Användarprofil:**

```typescript
export interface UserProfile {
  name: string;
  title?: string;
  weeklyHourGoal: number;
  monthlyHourGoal: number;
  yearlyHourGoal: number;
}
```

**Dashboard Widgets:**

```typescript
export type WidgetType =
  | "STAT_CARD"
  | "GOALS"
  | "RECENT_CASES"
  | "ACTIVE_TODOS"
  | "QUICK_NOTES"
  | "MY_DAY";
export type StatCardType = "customers" | "cases" | "todos" | "hours";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  w: number; // Bredd i grid units
  h: number; // Höjd i grid units
  statType?: StatCardType; // För STAT_CARD widgets
}
```

---

## 5. Routing och Navigation

### 5.1 React Router Setup

Applikationen använder React Router v7 med `createBrowserRouter`:

```typescript
// routes.tsx
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary><RootLayout /></ErrorBoundary>,
    children: [
      // Routes här
    ],
  },
]);
```

### 5.2 Routing Tabell

| Path                         | Komponent                | Beskrivning                     |
| ---------------------------- | ------------------------ | ------------------------------- |
| `/`                          | DashboardRedesign        | Dashboard (hem)                 |
| `/customers`                 | CustomersRedesign        | Kundlista                       |
| `/customers/:customerId`     | CustomerDetailView       | Kunddetalj                      |
| `/assignments`               | AssignmentsRedesign      | Uppdragslista (cases + projekt) |
| `/assignments/:assignmentId` | AssignmentDetailRedirect | Router till case/projekt        |
| `/cases/:caseId`             | CaseDetailView           | Case-detalj                     |
| `/projects/:projectId`       | ProjectDetailView        | Projekt-detalj                  |
| `/contacts`                  | ContactsListView         | Kontaktlista                    |
| `/contacts/:contactId`       | ContactDetailView        | Kontaktdetalj                   |
| `/ekonomi`                   | EconomyView              | Ekonomivy (fakturering)         |
| `/tasks`                     | TasksView                | Uppgiftsvy                      |
| `/notes`                     | NotesListView            | Anteckningar                    |
| `/kunskapsbank`              | KnowledgeBaseView        | Kunskapsbank                    |
| `/mallar`                    | TemplatesView            | Dokumentmallar                  |
| `/profile`                   | ProfileView              | Användarprofil                  |
| `/settings`                  | SettingsView             | Inställningar                   |
| `/developer`                 | DeveloperView            | Utvecklarverktyg                |
| `/internal`                  | InternalView             | Interna vyer                    |
| `*`                          | NotFoundPage             | 404-sida                        |

**Redirects:**

- `/finance` → `/ekonomi`
- `/cases` → `/assignments`
- `/projects` → `/assignments`
- `/test-forms` → `/customers`
- `/test-cards` → `/customers`

**Legacy Routes (gamla versioner):**

- `/dashboard-old` → DashboardWithRail
- `/customers-old` → CustomersListViewOld
- `/assignments-old` → AssignmentsListViewOld

### 5.3 Navigation Rail

Vänster ikonkolumn (64px bredd) med huvudnavigation:

```tsx
// design-system/layouts/RootLayout.tsx

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: "home" },
  { label: "Kunder", path: "/customers", icon: "users" },
  { label: "Uppdrag", path: "/assignments", icon: "briefcase" },
  { label: "Ekonomi", path: "/ekonomi", icon: "wallet" },
  { label: "Uppgifter", path: "/tasks", icon: "check-square" },
  { label: "Kontakter", path: "/contacts", icon: "user-circle" },
  { label: "Anteckningar", path: "/notes", icon: "sticky-note" },
  { label: "Kunskapsbank", path: "/kunskapsbank", icon: "book-open" },
  { label: "Mallar", path: "/mallar", icon: "file-text" },
];
```

**Aktiv indikering:**

- Aktiv route får `bg-warm-grey-100` bakgrund
- Ikon får `text-true-black` färg
- Hover state: `bg-warm-grey-50`

### 5.4 Breadcrumbs

Används i PageHeader för att visa navigationskontext:

```tsx
// Exempel från CustomerDetailView
<PageHeader
  breadcrumbs={[
    { label: "Kunder", href: "/customers" },
    { label: customer.name, href: `/customers/${customer.id}` },
  ]}
  title={customer.name}
/>
```

### 5.5 Deep Linking

Applikationen stöder deep linking för att komma direkt till specifika vyer:

```
/customers/cust-123                   # Direkt till kund
/cases/case-456                       # Direkt till case
/assignments/assign-789               # Routar till rätt case/projekt
/customers/cust-123?tab=contacts      # Direkt till kontakter-fliken
/cases/case-456?tab=journal           # Direkt till journal-fliken
```

### 5.6 Protected Routes

För framtida autentisering (inte implementerat än):

```typescript
// Framtida implementation
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

---

## 6. Vyer och Komponenter

### 6.1 Dashboard (DashboardRedesign)

**Design Philosophy:**

- Nordisk precision med organisk värme
- Asymmetrisk 3-kolumn layout: Kalender (240px) | Feed (fluid) | Uppgifter (320px)
- Non-scrollable container med sticky command center
- Editorial/Magazine meets Brutalism

**Layout:**

```
┌─────────────┬──────────────────────┬─────────────┐
│  KALENDER   │   AKTIVITETSFEED     │  UPPGIFTER  │
│  (240px)    │   (flex-1)           │  (320px)    │
│             │                      │             │
│  Idag       │  KPI Metrics (4st)   │  Öppna (8)  │
│  - 09:00    │  ─────────────────   │  - Task 1   │
│  - 11:00    │                      │  - Task 2   │
│  - 14:00    │  Senaste aktivitet:  │  - Task 3   │
│             │  - Journal entry     │             │
│  I morgon   │  - Nytt case         │  Denna vecka│
│  - 10:00    │  - Tidslogg          │  - Task 4   │
│             │  - Ny anteckning     │  - Task 5   │
└─────────────┴──────────────────────┴─────────────┘
```

**Komponenter:**

- **KPI Metrics** (4 kort):
  - Aktiva uppdrag (med delta)
  - Deadlines denna vecka
  - Timmar denna månad
  - Olästa meddelanden

- **Kalender** (Vänster kolumn):
  - Dagens möten
  - Kommande veckas möten
  - Emoji-ikoner för händelsetyper

- **Aktivitetsfeed** (Mitten):
  - Senaste journalanteckningar
  - Nya cases/projekt
  - Tidsloggningar
  - Anteckningar
  - Grupperat per dag

- **Uppgifter** (Höger):
  - Försenade (röd badge)
  - Idag (gul badge)
  - Denna vecka
  - Övriga

**Keyboard Shortcuts:**

- `Cmd+K` - Öppna command center
- `N` - Ny uppgift
- `C` - Nytt case
- `P` - Nytt projekt

**Fil:** `design-system/views/DashboardRedesign.tsx`

### 6.2 Kunder (CustomersRedesign)

**Layout:** 3-kolumns Mail-app layout

**Kolumn 1 (Vänster - Lista):**

- Sökfält
- Filter: Alla / Aktiva / Onboarding / Prospekt
- Tabell med kolumner:
  - Kundnamn
  - Kundnummer
  - Status badge
  - Avtal
  - Ansvarig
  - Senaste interaktion

**Kolumn 2 (Mitten - Kundöversikt):**

- Header med kundnamn, badge, actions
- Tabs:
  - **Översikt** - Sammanfattning, nyckelinfo
  - **Uppdrag** - Lista på cases/projekt
  - **Kontakter** - Kundkontakter
  - **Anteckningar** - Kundanteckningar
  - **Ekonomi** - Avtalsinfo, faktureringshistorik
  - **Filer** - Uppladdade dokument
  - **Tidslinje** - Alla aktiviteter i kronologisk ordning

**Kolumn 3 (Höger - Snabbinfo):**

- Detaljer-kort:
  - Kundnummer
  - Avtal
  - Org-nummer
  - Ansvarig konsult
  - Adress
- Uppgifter-kort (relaterade todos)
- Senaste aktiviteter

**Fil:** `design-system/views/CustomersRedesign.tsx`

### 6.3 Kunddetalj (CustomerDetailView)

**Layout:** DetailViewLayout med sidebar

**Main Content:**

- PageHeader med breadcrumbs, titel, actions
- Tabs (samma som Kolumn 2 i CustomersRedesign)
- Innehåll baserat på vald tab

**Sidebar (Höger):**

- Detaljer-kort
- Uppgifter-kort
- Kontakter-kort
- Senaste aktiviteter-kort

**Actions:**

- Redigera kund
- Lägg till kontakt
- Lägg till anteckning
- Skapa nytt uppdrag
- Ladda upp fil

**Fil:** `design-system/views/CustomerDetailView.tsx`

### 6.4 Uppdrag (AssignmentsRedesign)

**Layout:** 3-kolumns Mail-app layout

**Kolumn 1 (Vänster - Lista):**

- Sökfält
- Filter:
  - Alla / Cases / Projekt
  - Status: Pågående / Vilande / Avslutat
  - Prioritet: Hög / Medium / Låg
- Tabell/Kortvy med:
  - Uppdragstitel
  - Typ (Case/Projekt)
  - Kund
  - Status badge
  - Prioritet badge
  - Ansvarig
  - Senaste uppdatering

**Kolumn 2 (Mitten - Uppdragsöversikt):**

- Header med titel, badge, actions
- Tabs:
  - **Översikt** - Sammanfattning
  - **Checklista** - Uppgifter/milstolpar
  - **Tidslinje** - Aktivitetshistorik
  - **Tid** - Tidsloggning

**Kolumn 3 (Höger - Metadata):**

- Detaljer:
  - Uppdragsnummer
  - Kund (länk)
  - Status
  - Prioritet
  - Ansvarig
  - Skapad datum
- Uppgifter
- Kontakter

**Fil:** `design-system/views/AssignmentsRedesign.tsx`

### 6.5 Case-detalj (CaseDetailView)

**Layout:** DetailViewLayout med sidebar

**Main Content:**

- PageHeader med breadcrumbs, case-nummer, titel
- Tabs:
  - **Journal** - Journalanteckningar (Tiptap editor)
  - **Uppgifter** - Case-specifika todos
  - **Kontakter** - Case-kontakter
  - **Filer** - Bifogade dokument
  - **Tidlogg** - Tidsloggning
  - **Översikt** - Case-sammanfattning

**Journal-fliken:**

- Tiptap rich text editor (fast i botten)
- Lista med tidigare journalanteckningar (scrollbar)
- Varje entry visar:
  - Datum/tid
  - Författare
  - Innehåll (HTML)
  - Timmar (om angett)
  - Faktureringskommentar
  - Bifogade filer
  - Pin-ikon för viktiga anteckningar

**Tidlogg-fält i Journal:**

- Timmar (input)
- Faktureringskommentar (textarea)
- Debiterbar? (checkbox för FixedPrice/TimeBank)
- Bifoga filer (file upload)

**Sidebar:**

- Case-detaljer kort
- Kundinfo (länk)
- Uppgifter kort
- Kontakter kort

**Fil:** `design-system/views/CaseDetailView.tsx`

### 6.6 Projekt-detalj (ProjectDetailView)

**Layout:** Samma som CaseDetailView men för projekt

**Tabs:**

- **Journal** - Projektanteckningar
- **Uppgifter** - Projekt-todos
- **Kontakter** - Projektkontakter
- **Filer** - Projektfiler
- **Tidlogg** - Tidsspårning
- **Översikt** - Projektsammanfattning

**Fil:** `design-system/views/ProjectDetailView.tsx`

### 6.7 Ekonomi (EconomyView)

**Layout:** Fullskärm rapport-layout

**Tabs:**

- **Underlag** - Faktureringsunderlag (öppna batches)
- **Fakturerat** - Exporterade fakturor
- **Avtal** - Avtalsöversikt

**Underlag-fliken:**

**Pipeline (Vänster):**

- Lista på kunder med öppet faktureringsunderlag
- Visar:
  - Kundnamn
  - Total summa
  - Avtalstyp
  - Status badge (Klar / Granskning)
  - Timbank-progress bar (om tillämpligt)

**Mottagare (Mitten):**

- När kund väljs: lista på fakturamottagare
- Varje mottagare visar:
  - Namn
  - Summa
  - Antal uppdrag

**Underlag (Höger):**

- När mottagare väljs: fakturarader
- Tabell med:
  - Uppdrag (case/projekt-nummer + titel)
  - Timmar
  - À-pris
  - Kommentar
  - Summa

**Actions:**

- Exportera underlag (genererar CSV/Excel)
- Markera som exporterad
- Redigera rader

**Avtal-fliken:**

- Tabell med alla kunder som har avtal
- Visar:
  - Kund
  - Avtalstyp
  - Startdatum / Slutdatum
  - Pris
  - Timbank status (om tillämpligt)
  - Nästa indexering

**Fil:** `design-system/views/EconomyView.tsx`

### 6.8 Uppgifter (TasksView)

**Layout:** Fullskärm workspace-layout

**Vyväxlare:**

- Lista
- Kanban (TODO: ej implementerad än)
- Kalender (TODO: ej implementerad än)

**Lista-vy:**

**Filter/Sortering:**

- Filter: Alla / Öppna / Slutförda
- Prioritet: Hög / Medium / Låg
- Tilldelad: Alla / Mig / Specifik konsult
- Relaterad till: Alla / Specifik kund / Specifikt uppdrag

**Gruppering:**

- Försenade
- Idag
- Denna vecka
- Senare

**Tabell:**

- Checkbox (markera som klar)
- Titel
- Prioritet badge
- Förfallodatum
- Tilldelad
- Relaterad till (kund/uppdrag) med länk

**Actions:**

- Ny uppgift
- Bulk-markera som klara
- Bulk-ta bort

**Fil:** `design-system/views/TasksView.tsx`

### 6.9 Kontakter (ContactsListView)

**Layout:** 3-kolumns Mail-app layout

**Kolumn 1 (Vänster - Lista):**

- Sökfält
- Filter:
  - Alla / Kundkontakter / Fristående
  - Typ: Leverantör / Partner / Övrig
- Tabell:
  - Namn
  - Företag/Kund
  - Roll
  - Email
  - Telefon

**Kolumn 2 (Mitten - Kontaktdetalj):**

- Header med namn, badge
- Information:
  - Roll
  - Företag/Kund (länk)
  - Email (klickbar)
  - Telefon (klickbar)
  - Övrig info
- Relaterade uppdrag (om tillämpligt)
- Senaste interaktioner

**Kolumn 3 (Höger - Snabbinfo):**

- Detaljer kort
- Relaterade uppdrag kort
- Uppgifter relaterade till kontakten

**Fil:** `design-system/views/ContactsListView.tsx`

### 6.10 Anteckningar (NotesListView)

**Layout:** 2-kolumns layout

**Vänster kolumn (Lista):**

- Sökfält
- Lista med anteckningar (kortvy):
  - Första raden av innehåll (preview)
  - Datum
  - Kopplingar (till kund/uppdrag)

**Höger kolumn (Detalj):**

- Anteckningseditor (Tiptap)
- Actions:
  - Spara
  - Koppla till case
  - Koppla till kund
  - Skapa nytt case från anteckning
  - Ta bort

**AI-funktioner:**

- "Rensa upp anteckning" (formatera och gör mer läsbar)
- "Extrahera kontakter" (hitta namn och kontaktinfo i text)
- "Extrahera journal och kontakter" (skapa journal entry + kontakter)

**Fil:** `design-system/views/NotesListView.tsx`

### 6.11 Kunskapsbank (KnowledgeBaseView)

**Layout:** 2-kolumns dokumentvy (70% innehåll, 30% sidebar)

**Sidebar (Vänster):**

- Kategorier:
  - Kunskap
  - Policies
  - Rutiner
- Dokumentlista
- Sökfält

**Innehåll (Höger):**

- Dokumentrubrik
- Metadata (skapad, uppdaterad)
- Dokumentinnehåll (Tiptap rich text)
- Actions:
  - Redigera
  - Ta bort
  - Exportera (PDF)

**Fil:** `design-system/views/KnowledgeBaseView.tsx`

### 6.12 Mallar (TemplatesView)

**Layout:** Grid-baserad layout

**Kategorier:**

- Avtal
- Fakturor
- Brev
- Protokoll
- Rapporter

**Varje mall:**

- Namn
- Beskrivning
- Preview-ikon
- Actions:
  - Använd mall
  - Redigera
  - Duplicera
  - Ta bort

**Mall-redigerare:**

- Tiptap editor
- Merge fields: `{{kundnamn}}`, `{{case.titel}}`, `{{datum.idag}}`, etc.
- Preview med verklig data

**Fil:** `design-system/views/TemplatesView.tsx`

### 6.13 Inställningar (SettingsView)

**Layout:** 2-kolumns (30% sidomeny, 70% innehåll)

**Sidomeny:**

- Allmänt
- Användare
- Ekonomi
- Integrationer
- AI-inställningar
- System

**Allmänt-fliken:**

- Företagsnamn
- Logotyp
- Primärfärg
- Språk (Svenska)
- Tidszon
- Datumformat

**AI-inställningar:**

- Gemini API-nyckel
- Anpassade AI-prompts:
  - Rensa upp anteckning
  - Sammanfatta case
  - Faktureringskommentar
  - Företagsinfo från org-nummer
  - Extrahera kontakter
  - Extrahera journal + kontakter

**Integrationer:**

- SharePoint:
  - Aktivera/inaktivera
  - Tenant ID
  - Client ID
  - Site ID
- Supabase:
  - URL
  - Anon Key

**Fil:** `design-system/views/SettingsView.tsx`

### 6.14 Profil (ProfileView)

**Layout:** Centered form layout

**Innehåll:**

- Profilbild
- Namn
- Titel
- Email
- Timmål:
  - Vecka
  - Månad
  - År
- Lösenord (ändra)

**Fil:** `design-system/views/ProfileView.tsx`

---

## 7. State Management och Kontext

### 7.1 Context-arkitektur

Grannfrid använder React Context API för global state management:

```
AppProvider (root)
├── UIContext (UI state)
├── SelectionContext (selected entities)
├── DataContext (data & CRUD)
└── ActionsContext (global actions)
```

### 7.2 AppProvider

Root provider som wrappar hela applikationen:

```tsx
// context/AppProvider.tsx
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <SelectionProvider>
          <DataProvider>
            <ActionsProvider>{children}</ActionsProvider>
          </DataProvider>
        </SelectionProvider>
      </UIProvider>
      <TanStackQueryDevtools />
    </QueryClientProvider>
  );
};
```

### 7.3 UIContext

Hanterar UI-state som inte är relaterad till data:

```typescript
interface UIContextType {
  // Modals
  openModal: (type: ModalType, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  modalState: ModalState;

  // Toasts
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];

  // Confirm dialogs
  openConfirmDialog: (props: ConfirmModalProps) => void;
  closeConfirmDialog: () => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}
```

**Modal Types:**

```typescript
export type ModalType =
  | "ADD_CUSTOMER"
  | "ADD_CASE"
  | "ADD_PROJECT"
  | "ADD_TASK"
  | "QUICK_NOTE"
  | "CONNECT_NOTE"
  | "JOURNAL_EDIT"
  | "CUSTOMER_NOTE"
  | "CUSTOMER_CONTACT"
  | "ADD_CONTACT"
  | "CONTACT_IMPORT"
  | "JOURNAL_IMPORT"
  | "CONFIRM"
  | "DOCUMENT_VIEWER"
  | "DOCUMENT_EDITOR"
  | "VACATION_REQUEST"
  | "UNSAVED_CHANGES"
  | "INVOICE_BATCH_DETAIL"
  | "ADD_WIDGET"
  | "AI_CHAT";
```

**Användning:**

```tsx
const { openModal, addToast } = useUIContext();

// Öppna modal
openModal("ADD_CUSTOMER");

// Öppna modal med props
openModal("JOURNAL_EDIT", { entryId: "journal-123" });

// Toast notification
addToast("Kund skapad!", "success");
addToast("Fel vid sparande", "error");
```

**Fil:** `context/UIContext.tsx`

### 7.4 SelectionContext

Håller reda på vilka entiteter som är valda:

```typescript
interface SelectionContextType {
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;

  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;

  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;

  selectedAssignmentId: string | null;
  setSelectedAssignmentId: (id: string | null) => void;
}
```

**Användning:**

```tsx
const { selectedCustomerId, setSelectedCustomerId } = useSelectionContext();

// När användaren klickar på en kund i listan
<CustomerRow onClick={() => setSelectedCustomerId(customer.id)} />;

// I Kolumn 2/3 för att visa detaljer om vald kund
{
  selectedCustomerId && <CustomerDetail customerId={selectedCustomerId} />;
}
```

**Fil:** `context/SelectionContext.tsx`

### 7.5 DataContext

Huvudsaklig data-context med all CRUD-funktionalitet:

```typescript
interface DataContextType {
  // Data source
  dataSourceType: DataSourceType; // 'mock' | 'supabase'

  // Global data
  consultants: string[];
  userProfile: UserProfile;

  // Entities (arrays)
  customers: Customer[];
  assignments: Assignment[];
  cases: Case[];
  projects: Project[];
  journalEntries: JournalEntry[];
  projectJournalEntries: ProjectJournalEntry[];
  todos: Todo[];
  contacts: Contact[];
  customerContacts: CustomerContact[];
  caseContacts: CaseContact[];
  projectContacts: ProjectContact[];
  quickNotes: QuickNote[];
  appDocuments: AppDocument[];
  invoiceBatches: InvoiceBatch[];
  statisticalBatches: StatisticalBatch[];
  // ... etc.

  // Loading states
  isLoadingCustomers: boolean;
  isLoadingCases: boolean;
  isLoadingProjects: boolean;

  // Computed/derived data (för vald entitet)
  caseData: Case | undefined;
  parentCustomer: Customer | undefined;
  caseJournalEntries: JournalEntry[];
  customerCases: Case[];
  selectedCustomerContacts: CustomerContact[];
  // ... etc.

  // CRUD operations
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'customerNumber'>) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<void>;

  addCase: (caseData: ...) => Promise<Case>;
  updateCase: (caseData: Case) => Promise<void>;

  addJournalEntry: (entry: ..., files: File[]) => Promise<void>;
  updateJournalEntry: (entry: JournalEntry) => void;
  deleteJournalEntry: (entryId: string) => boolean;

  addTodo: (todo: ...) => void;
  updateTodo: (todo: Todo) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;

  // ... alla andra CRUD operations

  // Special operations
  saveQuickNote: (note: { content: string, id?: string }) => string;
  connectQuickNoteToCase: (noteId: string, caseId: string, details: ...) => void;

  // AI prompts
  aiPrompts: AIPrompts;
  updateAIPrompt: (key: keyof AIPrompts, newPrompt: string) => void;

  // Dashboard
  dashboardLayout: DashboardWidget[];
  addWidgetToDashboard: (widgetType: WidgetType, statType?: StatCardType) => void;
  removeWidgetFromDashboard: (widgetId: string) => void;
  updateDashboardLayout: (newLayout: DashboardWidget[]) => void;
}
```

**Data Flow:**

1. **Bootstrap** - Vid app-start laddas initial data:
   - Mock: från `data/mockData.ts` → localStorage
   - Supabase: från Supabase → TanStack Query cache

2. **Queries** - TanStack Query hooks för läsning:

   ```tsx
   const { data: customers, isLoading } = useCustomers();
   ```

3. **Mutations** - TanStack Query mutations för skrivning:

   ```tsx
   const addCustomerMutation = useAddCustomer();
   await addCustomerMutation.mutateAsync(newCustomer);
   ```

4. **Cache Invalidation** - Efter mutation invalideras relevanta queries:
   ```tsx
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ["customers"] });
   };
   ```

**Computed Data:**

DataContext beräknar filtrerad/derived data baserat på SelectionContext:

```typescript
// Exempel: caseData
const caseData = useMemo(() => {
  if (!selectedCaseId) return undefined;
  return cases.find((c) => c.id === selectedCaseId);
}, [cases, selectedCaseId]);

// Exempel: caseJournalEntries
const caseJournalEntries = useMemo(() => {
  if (!selectedCaseId) return [];
  return journalEntries
    .filter((e) => e.caseId === selectedCaseId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}, [journalEntries, selectedCaseId]);
```

**Fil:** `context/DataContext.tsx`

### 7.6 ActionsContext

Globala actions som inte direkt är CRUD:

```typescript
interface ActionsContextType {
  // Command center actions
  executeCommand: (commandId: string) => void;

  // Bulk operations
  bulkDeleteTodos: (todoIds: string[]) => void;
  bulkMarkTodosComplete: (todoIds: string[]) => void;

  // Export operations
  exportInvoiceBatch: (batchId: string) => void;
  exportStatisticalBatch: (batchId: string) => void;

  // Refresh
  refreshAllData: () => Promise<void>;
}
```

**Fil:** `context/ActionsContext.tsx`

### 7.7 TanStack Query Setup

```typescript
// main.tsx eller App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuter
      gcTime: 10 * 60 * 1000,   // 10 minuter (tidigare cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Query Keys:**

```typescript
// Query keys convention
["customers"][("customers", customerId)]["cases"][("cases", caseId)][ // Alla kunder // En specifik kund // Alla cases // Ett specifikt case
  ("cases", { customerId })
][("journalEntries", { caseId })]; // Cases för en kund // Journal entries för ett case
```

---

## 8. Integrationer och Services

### 8.1 Service Layer

All business logic finns i `services/`-mappen:

**Service Factory:**

```typescript
// services/index.ts
export const createServices = (
  dataSource: DataSourceType,
  supabaseClient?: SupabaseClient,
) => {
  const repositories = createRepositories(dataSource, supabaseClient);

  return {
    customerService: new CustomerService(repositories.customerRepository),
    caseService: new CaseService(repositories.caseRepository),
    projectService: new ProjectService(repositories.projectRepository),
    journalService: new JournalService(repositories.journalRepository),
    todoService: new TodoService(repositories.todoRepository),
    contactService: new ContactService(repositories.contactRepository),
    noteService: new NoteService(repositories.noteRepository),
    fileService: new FileService(),
    geminiService: new GeminiService(),
    sharepointService: new SharePointService(),
  };
};
```

**Services:**

| Service           | Ansvar                                      |
| ----------------- | ------------------------------------------- |
| CustomerService   | CRUD för kunder, avtalsstyrning             |
| CaseService       | CRUD för cases, case-nummer generering      |
| ProjectService    | CRUD för projekt, projekt-nummer generering |
| JournalService    | Journal entries, timberäkningar             |
| TodoService       | Uppgifter, prioritering, deadline-hantering |
| ContactService    | Kontakter (kund-, case-, fristående)        |
| NoteService       | Snabbanteckningar, koppling till uppdrag    |
| FileService       | Filuppladdning, IndexedDB-lagring           |
| GeminiService     | AI-funktioner via Google Gemini API         |
| SharePointService | SharePoint-integration                      |

### 8.2 Google Gemini AI Integration

**Setup:**

```typescript
// services/geminiService.ts
import { GoogleGenerativeAI } from "@google/genai";

export class GeminiService {
  private genai: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.genai = new GoogleGenerativeAI(apiKey);
    this.model = this.genai.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async cleanupNote(content: string, prompt: string): Promise<string> {
    const fullPrompt = `${prompt}\n\nText:\n${content}`;
    const result = await this.model.generateContent(fullPrompt);
    return result.response.text();
  }

  async getCaseSummary(
    caseData: Case,
    journalEntries: JournalEntry[],
    prompt: string,
  ): Promise<string> {
    // Implementering
  }

  async getInvoiceCommentSuggestion(
    entry: JournalEntry,
    prompt: string,
  ): Promise<string> {
    // Implementering
  }

  async getCompanyInfoFromOrgNr(
    orgNr: string,
    prompt: string,
  ): Promise<Partial<Customer>> {
    // Implementering (kan använda externa APIs också)
  }

  async extractContactsFromText(
    text: string,
    prompt: string,
  ): Promise<Contact[]> {
    // Implementering
  }

  async extractJournalAndContactsFromText(
    text: string,
    prompt: string,
  ): Promise<{ journal: string; contacts: Contact[] }> {
    // Implementering
  }
}
```

**AI Prompts:**

Konfigurerbara i Settings → AI-inställningar:

```typescript
// data/prompts.ts
export const DEFAULT_AI_PROMPTS: AIPrompts = {
  cleanupNote: `Du är en professionell assistent som hjälper till att formatera och strukturera anteckningar.
    Ta emot oformaterad text och returnera välformaterad text med:
    - Korrekt stavning och grammatik
    - Tydlig struktur med punktlistor eller stycken
    - Behåll all faktainformation
    - Returnera endast den formaterade texten, inga kommentarer`,

  getCaseSummary: `Sammanfatta följande case baserat på journalanteckningar.
    Inkludera: Huvudsakligt ärende, viktiga händelser, status.
    Max 200 ord, svenska.`,

  getInvoiceCommentSuggestion: `Baserat på följande journalanteckning, föreslå en kort fakturakommentar.
    Max 100 tecken, professionell ton, svenska.`,

  getCompanyInfoFromOrgNr: `Sök upp företagsinformation för organisationsnummer: {orgNr}
    Returnera JSON med: { name, address, city, zipCode }`,

  extractContactsFromText: `Extrahera alla kontaktpersoner från följande text.
    Returnera JSON-array med: [{ name, role, email, phone }]`,

  extractJournalAndContactsFromText: `Från följande text, extrahera:
    1. En ren journalanteckning (fakta, inga kontaktuppgifter)
    2. Alla kontakter som nämns
    Returnera JSON: { journal: string, contacts: [{ name, role, email, phone }] }`,
};
```

**Användning i komponenter:**

```tsx
// Exempel: Cleanup Note
const { geminiService } = useServices();
const { aiPrompts } = useDataContext();

const handleCleanup = async () => {
  const cleaned = await geminiService.cleanupNote(
    noteContent,
    aiPrompts.cleanupNote,
  );
  setNoteContent(cleaned);
};
```

**Fil:** `services/geminiService.ts`

### 8.3 SharePoint Integration

**Setup:**

SharePoint-integration aktiveras via environment variables:

```env
VITE_SHAREPOINT_ENABLED=true
VITE_SHAREPOINT_TENANT_ID=your-tenant-id
VITE_SHAREPOINT_CLIENT_ID=your-client-id
VITE_SHAREPOINT_SITE_ID=your-site-id
```

**SharePoint Service:**

```typescript
// services/sharepointIntegration.ts
export class SharePointService {
  private config: SharePointConfig;

  async authenticate(): Promise<string> {
    // OAuth2 flow för att få access token
  }

  async createDocumentLibrary(
    customerId: string,
    customerName: string,
  ): Promise<void> {
    // Skapa dokumentbibliotek för kund
  }

  async createCaseFolder(
    caseId: string,
    caseTitle: string,
    customerId: string,
  ): Promise<void> {
    // Skapa mapp för case
  }

  async uploadDocument(file: File, targetPath: string): Promise<void> {
    // Ladda upp dokument
  }

  async getDocuments(path: string): Promise<SharePointDocument[]> {
    // Hämta dokumentlista
  }

  async getDocumentTemplates(): Promise<SharePointTemplate[]> {
    // Hämta dokumentmallar (Word, Excel, PowerPoint)
  }

  async createFromTemplate(
    templateId: string,
    targetPath: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    // Skapa dokument från mall med merge fields
  }
}
```

**Användning:**

```tsx
// I CustomerDetailView
const { sharepointService } = useServices();

const openSharePoint = async () => {
  await sharepointService.createDocumentLibrary(customer.id, customer.name);
  window.open(`https://yourtenant.sharepoint.com/sites/.../${customer.id}`);
};
```

**Fil:** `services/sharepointIntegration.ts`

### 8.4 Supabase Backend

**Setup:**

```typescript
// lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

**Database Schema (exempel för kunder):**

```sql
-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_number TEXT NOT NULL UNIQUE,
  customer_type TEXT NOT NULL,
  realty_company_sub_type TEXT,
  other_customer_type TEXT,
  number_of_apartments INTEGER,
  org_number TEXT,
  name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  invoice_email TEXT,
  website TEXT,
  responsible_consultant TEXT,
  invoice_address JSONB NOT NULL,
  agreement JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_customer_number ON customers(customer_number);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_responsible ON customers(responsible_consultant);

-- RLS policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**Supabase Repository Implementation:**

```typescript
// repositories/SupabaseCustomerRepository.ts
export class SupabaseCustomerRepository implements ICustomerRepository {
  constructor(private supabase: SupabaseClient) {}

  async getAll(): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data.map(this.mapToCustomer);
  }

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return this.mapToCustomer(data);
  }

  async create(
    customer: Omit<Customer, "id" | "createdAt" | "customerNumber">,
  ): Promise<Customer> {
    // Generate customer number
    const customerNumber = await this.generateCustomerNumber();

    const { data, error } = await this.supabase
      .from("customers")
      .insert([{ ...customer, customer_number: customerNumber }])
      .select()
      .single();

    if (error) throw error;
    return this.mapToCustomer(data);
  }

  async update(customer: Customer): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .update(this.mapFromCustomer(customer))
      .eq("id", customer.id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  private mapToCustomer(row: any): Customer {
    // Map database row to Customer type
  }

  private mapFromCustomer(customer: Customer): any {
    // Map Customer type to database row
  }

  private async generateCustomerNumber(): Promise<string> {
    // Logic för att generera nästa kundnummer
  }
}
```

**Fil:** `repositories/SupabaseCustomerRepository.ts`

### 8.5 File Storage (IndexedDB)

För mock data-läget används IndexedDB för fillagring:

```typescript
// services/db.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface GrannfridDB extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      file: File;
      metadata: {
        name: string;
        type: string;
        size: number;
        createdAt: string;
      };
    };
  };
}

let db: IDBPDatabase<GrannfridDB>;

export async function initDB() {
  db = await openDB<GrannfridDB>("grannfrid-files", 1, {
    upgrade(db) {
      db.createObjectStore("files", { keyPath: "id" });
    },
  });
}

export async function saveFile(id: string, file: File) {
  await db.put("files", {
    id,
    file,
    metadata: {
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function getFile(id: string): Promise<File | undefined> {
  const record = await db.get("files", id);
  return record?.file;
}

export async function deleteFile(id: string) {
  await db.delete("files", id);
}
```

**FileService:**

```typescript
// services/FileService.ts
export class FileService {
  async uploadFile(
    file: File,
    entityType: "customer" | "case" | "project",
    entityId: string,
  ): Promise<string> {
    const fileId = `${entityType}-${entityId}-${Date.now()}-${file.name}`;

    if (appConfig.dataSource === "mock") {
      // Spara till IndexedDB
      await saveFile(fileId, file);
    } else {
      // Ladda upp till Supabase Storage
      const { data, error } = await supabase.storage
        .from("files")
        .upload(`${entityType}/${entityId}/${fileId}`, file);

      if (error) throw error;
    }

    return fileId;
  }

  async downloadFile(fileId: string): Promise<Blob> {
    if (appConfig.dataSource === "mock") {
      const file = await getFile(fileId);
      if (!file) throw new Error("File not found");
      return file;
    } else {
      const { data, error } = await supabase.storage
        .from("files")
        .download(fileId);

      if (error) throw error;
      return data;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (appConfig.dataSource === "mock") {
      await deleteFile(fileId);
    } else {
      const { error } = await supabase.storage.from("files").remove([fileId]);

      if (error) throw error;
    }
  }
}
```

**Fil:** `services/FileService.ts`

---

## 9. Testing och Kvalitetssäkring

### 9.1 Unit Testing (Vitest)

**Setup:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
  },
});
```

**Test Setup:**

```typescript
// tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

**Exempel Test:**

```typescript
// design-system/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant class', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('bg-true-black');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

**Köra tester:**

```bash
npm run test              # Run all tests
npm run test:ui           # Interactive UI
npm run test:coverage     # Coverage report
```

### 9.2 E2E Testing (Playwright)

**Setup:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Visual Regression Tests:**

```typescript
// tests/visual-regression.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test("Dashboard screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("dashboard.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("Customers list screenshot", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("customers-list.png");
  });

  test("Customer detail screenshot", async ({ page }) => {
    await page.goto("/customers/cust-001");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("customer-detail.png");
  });
});
```

**E2E Flow Tests:**

```typescript
// tests/e2e/customer-flow.spec.ts
import { test, expect } from "@playwright/test";

test("Create customer flow", async ({ page }) => {
  await page.goto("/customers");

  // Click "Ny kund" button
  await page.click('button:has-text("Ny kund")');

  // Fill form
  await page.fill('input[name="name"]', "Test BRF");
  await page.selectOption('select[name="customerType"]', "Brf");
  await page.fill('input[name="orgNumber"]', "556000-0000");
  await page.fill('input[name="invoiceAddress.address1"]', "Testgatan 1");
  await page.fill('input[name="invoiceAddress.zipCode"]', "12345");
  await page.fill('input[name="invoiceAddress.city"]', "Stockholm");

  // Submit
  await page.click('button[type="submit"]');

  // Verify toast
  await expect(page.locator("text=Kund skapad!")).toBeVisible();

  // Verify customer in list
  await expect(page.locator("text=Test BRF")).toBeVisible();
});
```

**Köra tester:**

```bash
npm run test:visual               # Visual regression
npm run test:visual:update        # Update snapshots
npx playwright test               # All E2E tests
npx playwright test --ui          # Interactive UI
npx playwright show-report        # View report
```

### 9.3 Accessibility Testing

**eslint-plugin-jsx-a11y:**

```bash
npm run lint:a11y
```

Detta kör ESLint med fokus på tillgänglighetsregler:

```javascript
// eslint.config.js
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
    },
  },
];
```

**Axe-core Playwright:**

```typescript
// tests/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Dashboard accessibility", async ({ page }) => {
  await page.goto("/");

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test("Customer form accessibility", async ({ page }) => {
  await page.goto("/customers");
  await page.click('button:has-text("Ny kund")');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### 9.4 Storybook

**Setup:**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../design-system/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

**Exempel Story:**

```tsx
// design-system/ui/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "destructive"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <IconWrapper name="plus" size="sm" />
        Ny kund
      </>
    ),
  },
};
```

**Köra Storybook:**

```bash
npm run storybook            # Dev server på localhost:6006
npm run build-storybook      # Build static version
```

### 9.5 Design System Audits

Automatiska design audits för att säkerställa efterlevnad:

**Typography Audit:**

```bash
npm run design:audit:typography
```

Skapar `docs/typography-issues.json` med alla avvikelser från typografi-standarden.

**Spacing Audit:**

```bash
npm run design:audit:spacing
```

Hittar alla hårdkodade spacing-värden som inte följer 8px-gridet.

**Color Audit:**

```bash
npm run design:audit:colors
```

Hittar alla hårdkodade hex-färger som borde använda design tokens.

**Komplett Audit:**

```bash
npm run design:audit
```

Kör alla audits och genererar rapporter.

**Fix Scripts:**

```bash
npm run design:fix:spacing         # Dry-run
npm run design:fix:spacing:apply   # Applicera fixes
npm run design:fix:colors          # Dry-run
npm run design:fix:colors:apply    # Applicera fixes
```

### 9.6 Quality Gates

**Pre-commit Hook (Husky):**

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run test
```

**Validation Script:**

```bash
npm run design:validate
```

Detta kör:

1. ESLint (med max 0 warnings)
2. Unit tests (alla måste passera)
3. Design audits (genererar rapporter)

---

## 10. Byggprocess och Deployment

### 10.1 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu" /* ... */,
          ],
          tiptap: ["@tiptap/react", "@tiptap/core", "@tiptap/starter-kit"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
});
```

### 10.2 Build Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx",
    "design:validate": "npm run lint -- --max-warnings=0 && npm test && npm run design:audit"
  }
}
```

### 10.3 Environment Variables

**Development (.env.local):**

```env
# Data Source
VITE_DATA_SOURCE=mock

# Gemini AI
VITE_GEMINI_API_KEY=your-key-here

# SharePoint (optional)
VITE_SHAREPOINT_ENABLED=false
```

**Production (.env.production):**

```env
# Data Source
VITE_DATA_SOURCE=supabase

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI
VITE_GEMINI_API_KEY=your-production-key

# SharePoint
VITE_SHAREPOINT_ENABLED=true
VITE_SHAREPOINT_TENANT_ID=your-tenant
VITE_SHAREPOINT_CLIENT_ID=your-client
VITE_SHAREPOINT_SITE_ID=your-site
```

### 10.4 Deployment

**Vercel Deployment:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**vercel.json:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Netlify Deployment:**

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 10.5 Bundle Size Optimization

**Nuvarande bundlestorlek:**

- **Total:** 262.61 kB (gzip: 68.58 kB)
- **React chunk:** ~45 kB
- **UI vendor:** ~80 kB
- **Tiptap:** ~60 kB
- **Main:** ~50 kB

**Optimeringsstrategier:**

1. **Code splitting** - Lazy loading av routes
2. **Manual chunks** - Vendor code separerat
3. **Tree shaking** - Endast använd kod inkluderas
4. **Image optimization** - Sharp för bildoptimering
5. **List virtualization** - TanStack Virtual för stora listor

**Analyze Bundle:**

```bash
npm run build
npx vite-bundle-visualizer
```

---

## 11. Tillgänglighet och Performance

### 11.1 WCAG 2.1 AA Compliance

**Kontrast:**

- **Text:** 4.5:1 (Level AA)
  - `--true-black` (#0A0A0A) på `--off-white` (#FDFCFA): 18.2:1 ✅
  - `--charcoal` (#2D2D2D) på `--off-white`: 13.5:1 ✅
  - `--warm-grey-700` (#4A4A4A) på `--off-white`: 8.2:1 ✅

- **UI Components:** 3:1 (Level AA)
  - Buttons: `--true-black` på `--warm-white`: 17.8:1 ✅
  - Borders: `--soft-taupe` (#EBE8E3) på `--off-white`: 1.3:1 ⚠️ (Dekorativ, inte kritisk)

**Tangentbordsnavigation:**

- All funktionalitet tillgänglig via tangentbord
- `Tab` för att navigera framåt
- `Shift+Tab` för att navigera bakåt
- `Enter` eller `Space` för att aktivera
- `Escape` för att stänga modals/dropdowns
- `Arrow keys` för att navigera i listor

**Focus Management:**

```css
/* Focus-visible för tangentbordsnavigation */
*:focus-visible {
  outline: 2px solid var(--true-black);
  outline-offset: 2px;
}

/* Dölj focus för musklick (men behåll för tangentbord) */
*:focus:not(:focus-visible) {
  outline: none;
}
```

**ARIA Labels:**

Alla interaktiva element har ARIA labels:

```tsx
<Button aria-label="Ny kund">
  <IconWrapper name="plus" aria-hidden="true" />
</Button>

<Input
  id="customer-name"
  aria-label="Kundnamn"
  aria-required="true"
  aria-invalid={errors.name ? 'true' : 'false'}
/>

<Table aria-label="Kundlista">
  <thead>
    <tr>
      <th scope="col">Kundnamn</th>
      <th scope="col">Kundnummer</th>
    </tr>
  </thead>
</Table>
```

**Screen Reader Support:**

- Semantisk HTML (`<nav>`, `<main>`, `<article>`, `<aside>`)
- ARIA landmarks
- Live regions för dynamiskt innehåll:

```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {toastMessage}
</div>
```

**Keyboard Shortcuts:**

| Shortcut           | Action                  |
| ------------------ | ----------------------- |
| `Cmd+K` / `Ctrl+K` | Öppna command center    |
| `Cmd+N`            | Ny kund                 |
| `Cmd+Shift+N`      | Nytt case               |
| `Cmd+P`            | Nytt projekt            |
| `Cmd+T`            | Ny uppgift              |
| `Cmd+/`            | Keyboard shortcuts help |
| `Escape`           | Stäng modal/dialog      |

### 11.2 Performance

**Lighthouse Scores:**

- **Performance:** 95+
- **Accessibility:** 100
- **Best Practices:** 95+
- **SEO:** 90+

**Core Web Vitals:**

- **LCP (Largest Contentful Paint):** <1.5s
- **FID (First Input Delay):** <100ms
- **CLS (Cumulative Layout Shift):** <0.1

**Optimeringsstrategier:**

1. **Code Splitting & Lazy Loading:**

   ```tsx
   const DashboardRedesign = lazy(
     () => import("./design-system/views/DashboardRedesign"),
   );
   ```

2. **List Virtualization:**

   ```tsx
   import { useVirtualizer } from "@tanstack/react-virtual";

   const rowVirtualizer = useVirtualizer({
     count: customers.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 60,
     overscan: 5,
   });
   ```

3. **React.memo för widgets:**

   ```tsx
   export const StatCard = React.memo(
     ({ title, value, icon }: StatCardProps) => {
       // ...
     },
   );
   ```

4. **Debounced search:**

   ```tsx
   const [searchTerm, setSearchTerm] = useState("");
   const debouncedSearch = useMemo(() => debounce(setSearchTerm, 300), []);
   ```

5. **Optimistic Updates:**
   ```tsx
   const addCustomerMutation = useAddCustomer({
     onMutate: async (newCustomer) => {
       await queryClient.cancelQueries({ queryKey: ["customers"] });
       const previousCustomers = queryClient.getQueryData(["customers"]);
       queryClient.setQueryData(["customers"], (old) => [...old, newCustomer]);
       return { previousCustomers };
     },
     onError: (err, newCustomer, context) => {
       queryClient.setQueryData(["customers"], context.previousCustomers);
     },
   });
   ```

**Network Performance:**

- **Initial Load:** <1.5s på 3G
- **Time to Interactive:** <2.5s
- **Bundle gzip:** 68.58 kB

**Caching Strategy:**

- **TanStack Query:** 5 min staleTime, 10 min gcTime
- **Static assets:** Infinite cache (cache-busting via hashes)
- **API calls:** Optimistic updates + background refetch

---

## 12. Utvecklingsmiljö och Verktyg

### 12.1 Utvecklingsverktyg

**VS Code Extensions (rekommenderade):**

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **TypeScript Vue Plugin (Volar)** - Better TypeScript support
- **Path Intellisense** - Path autocomplete
- **Auto Rename Tag** - Auto rename paired tags

**Browser DevTools:**

- **React DevTools** - Component inspection
- **TanStack Query DevTools** - Query debugging (inbyggd i appen)
- **Axe DevTools** - Accessibility testing

**Command Line Tools:**

```bash
# Development server
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Tests
npm run test
npm run test:ui
npm run test:coverage

# Linting
npm run lint
npm run lint:a11y

# Design audits
npm run design:audit
npm run design:audit:typography
npm run design:audit:spacing
npm run design:audit:colors

# Storybook
npm run storybook
npm run build-storybook

# E2E tests
npm run test:visual
npm run test:visual:update
npx playwright test
```

### 12.2 Git Workflow

**Branch Strategy:**

```
main                    # Production-ready code
├── develop             # Development branch
│   ├── feature/xxx     # New features
│   ├── fix/xxx         # Bug fixes
│   └── refactor/xxx    # Refactoring
```

**Commit Convention:**

```
feat: Add customer dashboard widget
fix: Correct invoice calculation for TimeBank
refactor: Extract journal editor to separate component
docs: Update API documentation
style: Format with Prettier
test: Add unit tests for CustomerService
chore: Update dependencies
```

**Pull Request Template:**

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation

## Checklist

- [ ] Code follows style guide
- [ ] Tests pass
- [ ] Design audit passes
- [ ] Accessibility checked
- [ ] Documentation updated

## Screenshots (if applicable)
```

### 12.3 Debugging

**React DevTools:**

- Inspect component props/state
- Track re-renders
- Profile performance

**TanStack Query DevTools:**

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>;
```

**Console Debugging:**

```typescript
// Debug DataContext
console.log("Customers:", useDataContext().customers);

// Debug SelectionContext
console.log("Selected Customer ID:", useSelectionContext().selectedCustomerId);

// Debug TanStack Query cache
import { useQueryClient } from "@tanstack/react-query";
const queryClient = useQueryClient();
console.log("Query Cache:", queryClient.getQueryCache().getAll());
```

**Vite Debug Mode:**

```bash
DEBUG=vite:* npm run dev
```

### 12.4 Troubleshooting

**Common Issues:**

1. **"Module not found" errors**
   - Check import paths (använd `@/` för root imports)
   - Verify `tsconfig.json` paths configuration
   - Run `npm install` för att säkerställa dependencies

2. **TypeScript errors i editor men inte i build**
   - Restart TS server: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
   - Check `tsconfig.json` settings

3. **Tailwind classes inte appliceras**
   - Verify `tailwind.config.ts` content paths
   - Check class name spelling
   - Restart dev server

4. **TanStack Query data inte uppdateras**
   - Check `queryKey` är korrekt
   - Verify `invalidateQueries` after mutations
   - Inspect TanStack Query DevTools

5. **Supabase connection issues**
   - Verify `.env` variables är satta
   - Check `VITE_DATA_SOURCE` är 'supabase'
   - Inspect network tab för error responses

**Debug Mode:**

```typescript
// config/appConfig.ts
export const appConfig = {
  dataSource: (import.meta.env.VITE_DATA_SOURCE as DataSourceType) || "mock",
  debug: import.meta.env.DEV, // true i development
};

// Usage
if (appConfig.debug) {
  console.log("Debug info:", data);
}
```

### 12.5 Documentation

**Inline Documentation:**

````typescript
/**
 * Adds a new customer to the system.
 *
 * @param customer - Customer data without id, createdAt, and customerNumber
 * @returns Promise resolving to the created customer with generated fields
 * @throws Error if customer creation fails
 *
 * @example
 * ```typescript
 * const newCustomer = await addCustomer({
 *   name: 'BRF Älvsäter',
 *   customerType: CustomerType.Brf,
 *   invoiceAddress: {
 *     address1: 'Testgatan 1',
 *     zipCode: '12345',
 *     city: 'Stockholm',
 *     country: 'Sverige',
 *     countryCode: 'SE',
 *   },
 * });
 * ```
 */
async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'customerNumber'>): Promise<Customer>
````

**Component Documentation (Storybook):**

All UI components har Storybook stories med:

- Props documentation
- Usage examples
- Interactive playground
- Accessibility info

**README Files:**

- Root `README.md` - Overview, setup, scripts
- `docs/` folder - Design guide, WCAG compliance, etc.

---

## Sammanfattning

Grannfrid är en modern, svenskfokuserad konsult- och case management-plattform med:

✅ **Modern Tech Stack** - React 18, TypeScript, Vite, Tailwind, Radix UI, Supabase
✅ **Varm Humanistisk Design** - Typography-driven UI med generös whitespace
✅ **Flexibel Datahantering** - Mock data för utveckling, Supabase för produktion
✅ **Tre Avtalstyper** - Löpande, Timbank, Fastpris med automatisk faktureringslogik
✅ **AI-Integration** - Google Gemini för sammanfattningar och textbearbetning
✅ **SharePoint-Integration** - Microsoft 365 arbetsytor direkt i appen
✅ **WCAG AA-Compliant** - Fullständig tillgänglighet
✅ **95+ Performance** - Optimerad bundle size, code splitting, virtualization
✅ **Omfattande Testing** - Unit tests (Vitest), E2E (Playwright), Visual regression
✅ **Design System Audits** - Automatisk efterlevnadskontroll
✅ **Dokumentation** - Inline docs, Storybook, README:er

**Nyckelmoduler:**

1. Dashboard - KPI:er, aktivitetsflöde, kalender, uppgifter
2. Kunder - CRM med avtalsstyrning
3. Uppdrag - Unified Cases + Projekt
4. Ekonomi - Faktureringsunderlag, timbank-övervakning
5. Uppgifter - Prioritering, deadlines, koppling till uppdrag
6. Kontakter - Kund-, case- och fristående kontakter
7. Anteckningar - Snabbanteckningar med AI-assistans
8. Kunskapsbank - Intern dokumentation
9. Mallar - Dokumentmallar med merge fields
10. Inställningar - System- och AI-konfiguration

**Utvecklarupplevelse:**

- Hot reload med Vite
- Type-safe med TypeScript
- Tailwind för snabb styling
- Radix UI för tillgängliga primitiver
- TanStack Query för server state
- Storybook för komponentutveckling
- Husky för pre-commit hooks
- ESLint för code quality
- Playwright för E2E testing

Denna beskrivning täcker hela Grannfrid-applikationen från A till Ö och ger en utvecklare all information som behövs för att förstå, underhålla och vidareutveckla systemet.
