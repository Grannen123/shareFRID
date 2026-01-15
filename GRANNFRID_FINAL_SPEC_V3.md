# GRANNFRID 2.0 - Oneshot Build Specification

**Version:** 3.0 Final (AI-reviewed)
**Datum:** 2026-01-15
**Syfte:** Komplett specifikation för att bygga Grannfrid-appen i ett svep
**Granskad av:** Grok, Gemini, ChatGPT - alla kritiska buggar åtgärdade

---

## DEL 0: KRITISKA FIXAR (LÄSS FÖRST!)

Denna sektion innehåller fixes som MÅSTE implementeras för att appen ska fungera.

### 0.1 Tailwind Alpha/RGB-problemet

CSS-variabler måste vara i RGB-format för att `/10`, `/20` etc ska fungera:

```css
/* RÄTT - i index.css */
:root {
  --sage: 135 169 107;
  --terracotta: 212 103 74;
  /* ... */
}
```

```javascript
/* RÄTT - i tailwind.config.js */
colors: {
  sage: 'rgb(var(--sage) / <alpha-value>)',
}
```

### 0.2 Vite Alias för @/

Utan detta kraschar alla imports:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```json
// tsconfig.json - lägg till i compilerOptions
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 0.3 React Query Strategy

Utan detta blir appen "buggig" (måste ladda om för att se ändringar):

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    detail: (id: string) => ['customers', id] as const,
    byWorkspace: (wsId: string) => ['customers', 'workspace', wsId] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    detail: (id: string) => ['assignments', id] as const,
    byCustomer: (customerId: string) => ['assignments', 'customer', customerId] as const,
  },
  journal: {
    byAssignment: (assignmentId: string) => ['journal', assignmentId] as const,
  },
  timeEntries: {
    all: ['timeEntries'] as const,
    byCustomer: (customerId: string) => ['timeEntries', 'customer', customerId] as const,
    byPeriod: (year: number, month: number) => ['timeEntries', 'period', year, month] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    byAssignee: (userId: string) => ['tasks', 'assignee', userId] as const,
  },
  agreements: {
    all: ['agreements'] as const,
    byCustomer: (customerId: string) => ['agreements', 'customer', customerId] as const,
    withIndexation: ['agreements', 'indexation'] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    byCustomer: (customerId: string) => ['contacts', 'customer', customerId] as const,
  },
  knowledge: {
    all: ['knowledge'] as const,
    byCategory: (category: string) => ['knowledge', 'category', category] as const,
  },
  profile: {
    current: ['profile', 'current'] as const,
  },
  customerNotes: {
    byCustomer: (customerId: string) => ['customerNotes', customerId] as const,
  },
} as const;
```

**VIKTIGT:** Vid mutation, invalidera relevanta keys:
```typescript
// Exempel i useCustomers.ts
const createCustomer = useMutation({
  mutationFn: async (data: CustomerFormData) => {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return customer;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
  },
});
```

### 0.4 Zod Schemas

```typescript
// src/lib/schemas.ts
import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  org_number: z.string().optional(),
  email: z.string().email('Ogiltig e-post').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  antal_lagenheter: z.number().int().positive().optional(),
  customer_type: z.enum(['brf', 'kommunalt_fastighetsbolag', 'privat_fastighetsbolag', 'forvaltningsbolag', 'stiftelse', 'samfallighet', 'ovrig']).optional(),
  status: z.enum(['active', 'prospekt', 'vilande']).default('active'),
});

export const agreementSchema = z.object({
  customer_id: z.string().uuid(),
  type: z.enum(['hourly', 'timebank', 'fixed']),
  hourly_rate: z.number().positive('Timpris måste vara positivt'),
  hourly_rate_evening: z.number().positive().optional(),
  overtime_rate: z.number().positive().optional(),
  included_hours: z.number().int().positive().optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  billing_advance: z.boolean().default(false),
  fixed_amount: z.number().positive().optional(),
  billing_month: z.number().int().min(1).max(12).optional(),
  valid_from: z.string(),
  valid_to: z.string().optional(),
  next_indexation: z.string().optional(),
}).refine((data) => {
  if (data.type === 'timebank') {
    return data.included_hours && data.period && data.overtime_rate;
  }
  return true;
}, { message: 'Timbank kräver inkluderade timmar, period och övertidspris' })
.refine((data) => {
  if (data.type === 'fixed') {
    return data.fixed_amount && data.period;
  }
  return true;
}, { message: 'Fastpris kräver belopp och period' });

export const assignmentSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1, 'Titel krävs'),
  description: z.string().optional(),
  type: z.enum(['case', 'project']),
  category: z.enum(['disturbance', 'illegal_sublet', 'screening', 'renovation_coordination', 'investigation', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const journalSchema = z.object({
  content: z.string().min(1, 'Innehåll krävs'),
  hours: z.number().min(0).optional(),
  billing_comment: z.string().optional(),
  is_extra_billable: z.boolean().default(false),
  entry_type: z.enum(['call', 'email', 'meeting', 'site_visit', 'note']).default('note'),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Titel krävs'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contact_type: z.enum(['customer', 'assignment', 'standalone']).default('customer'),
  is_invoice_recipient: z.boolean().default(false),
  customer_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
});

export const knowledgeArticleSchema = z.object({
  title: z.string().min(1, 'Titel krävs'),
  content: z.string().min(1, 'Innehåll krävs'),
  category: z.enum(['knowledge', 'policy', 'routine']),
  tags: z.array(z.string()).optional(),
  is_published: z.boolean().default(true),
});

export const profileSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  phone: z.string().optional(),
  title: z.string().optional(),
  default_hourly_rate: z.number().positive().optional(),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(true),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type AgreementFormData = z.infer<typeof agreementSchema>;
export type AssignmentFormData = z.infer<typeof assignmentSchema>;
export type JournalFormData = z.infer<typeof journalSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type KnowledgeArticleFormData = z.infer<typeof knowledgeArticleSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
```

---

## SNABBSTART FÖR CLAUDE CODE

```bash
# 1. Skapa nytt projekt (i NUVARANDE mapp, inte undermapp)
npm create vite@latest . -- --template react-ts

# 2. Installera alla dependencies (kör detta FÖRST)
npm install @supabase/supabase-js@^2.47 @tanstack/react-query@^5.90 \
  react-router-dom@^6.22 \
  @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-label \
  @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-tabs \
  @radix-ui/react-dropdown-menu @radix-ui/react-checkbox \
  @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-switch \
  react-hook-form@^7.69 zod @hookform/resolvers \
  lucide-react date-fns clsx tailwind-merge sonner \
  @tiptap/react@^2.0 @tiptap/pm@^2.0 @tiptap/starter-kit@^2.0

# 3. Installera dev dependencies (TAILWIND V4!)
npm install -D tailwindcss @tailwindcss/postcss @tanstack/react-query-devtools

# OBS: @tailwindcss/line-clamp behövs INTE - ingår i Tailwind core sedan v3.3
# OBS: autoprefixer behövs INTE - ingår i @tailwindcss/postcss
# OBS: tailwind.config.js behövs INTE - Tailwind v4 använder CSS-first config
# OBS: @tanstack/react-query-devtools är devDependency (endast för development)
```

---

## DEL 1: PROJEKTSTRUKTUR

Skapa EXAKT denna mappstruktur:

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Router + providers
├── index.css                # Global styles + design tokens
├── vite-env.d.ts
│
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── utils.ts             # cn() helper
│   ├── constants.ts         # App-wide constants
│   ├── billing-logic.ts     # Timbank-beräkningar
│   ├── queryKeys.ts         # React Query keys (KRITISKT!)
│   └── schemas.ts           # Zod validation schemas
│
├── types/
│   └── database.ts          # TypeScript types för alla tabeller
│
├── contexts/
│   └── AuthContext.tsx      # Auth provider
│
├── hooks/
│   ├── useCustomers.ts      # CRUD för kunder
│   ├── useAssignments.ts    # CRUD för uppdrag
│   ├── useTimeEntries.ts    # Tidsregistrering
│   ├── useTasks.ts          # Uppgifter
│   ├── useNotes.ts          # Snabbanteckningar
│   ├── useCustomerNotes.ts  # Kundanteckningar (ej kopplade till uppdrag)
│   ├── useAgreements.ts     # Avtal
│   ├── useContacts.ts       # Kontakter
│   ├── useKnowledge.ts      # Kunskapsbank
│   └── useProfile.ts        # Användarens profil
│
├── components/
│   ├── ui/                  # Primitiva komponenter
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Dialog.tsx
│   │   ├── Badge.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   ├── Avatar.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── DatePicker.tsx
│   │   ├── SearchInput.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── AlertBanner.tsx
│   │   └── Switch.tsx       # Wrapper för Radix Switch
│   │
│   ├── layout/
│   │   ├── AppShell.tsx     # Huvudlayout med sidebar
│   │   ├── Sidebar.tsx      # Navigation
│   │   └── Header.tsx       # Top header med profil-dropdown
│   │
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       └── ErrorBoundary.tsx
│
├── features/
│   ├── customers/
│   │   ├── CustomerList.tsx
│   │   ├── CustomerDetail.tsx
│   │   ├── CustomerForm.tsx
│   │   ├── CustomerTimeline.tsx
│   │   ├── CustomerNotesTab.tsx
│   │   └── AgreementForm.tsx
│   │
│   ├── assignments/
│   │   ├── AssignmentList.tsx
│   │   ├── AssignmentDetail.tsx
│   │   ├── AssignmentForm.tsx
│   │   ├── JournalEditor.tsx      # TipTap implementation
│   │   └── JournalTimeline.tsx
│   │
│   ├── billing/
│   │   ├── BillingPipeline.tsx
│   │   ├── BillingDetail.tsx
│   │   ├── TimebankWidget.tsx
│   │   └── ExportDialog.tsx
│   │
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   └── TaskForm.tsx
│   │
│   ├── contacts/
│   │   ├── ContactList.tsx
│   │   └── ContactForm.tsx
│   │
│   ├── knowledge/
│   │   ├── KnowledgeList.tsx
│   │   ├── ArticleView.tsx
│   │   └── ArticleEditor.tsx
│   │
│   ├── profile/
│   │   ├── ProfilePage.tsx
│   │   ├── ProfileForm.tsx
│   │   └── NotificationSettings.tsx
│   │
│   └── dashboard/
│       ├── DashboardView.tsx
│       ├── KPICards.tsx
│       ├── ActivityFeed.tsx
│       ├── TaskWidget.tsx
│       └── IndexationAlert.tsx
│
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── CustomersPage.tsx
    ├── AssignmentsPage.tsx
    ├── TasksPage.tsx
    ├── ContactsPage.tsx
    ├── BillingPage.tsx
    ├── NotesPage.tsx
    ├── KnowledgePage.tsx
    └── ProfilePage.tsx
```

---

## DEL 2: DESIGN TOKENS (index.css)

**VIKTIGT:** Färger måste vara i RGB-format för Tailwind alpha att fungera!

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@700;800&family=Inter:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* === FÄRGPALETT: "Editorial Magazine Style" === */
  /* RGB-format för Tailwind alpha support (bg-sage/10 etc) */

  /* Primärfärger */
  --sage: 135 169 107;
  --sage-dark: 116 147 93;
  --terracotta: 212 103 74;
  --terracotta-dark: 194 90 62;
  --lavender: 155 143 191;

  /* Text - förbättrad kontrast (ChatGPT feedback) */
  --charcoal: 44 40 36;
  --ash: 90 85 80;  /* Ändrad från #6B6661 till #5A5550 för bättre kontrast */

  /* Bakgrunder */
  --warm-white: 253 252 251;
  --cream: 249 247 244;
  --sand: 240 237 232;

  /* Status */
  --warning: 245 158 11;
  --success: 135 169 107;
  --error: 212 103 74;
  --info: 155 143 191;

  /* === TYPOGRAFI === */
  --font-display: 'Lora', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* === SPACING (Tailwind-kompatibel) === */
  --space-1: 0.5rem;   /* 8px */
  --space-2: 0.75rem;  /* 12px */
  --space-3: 1rem;     /* 16px */
  --space-4: 1.5rem;   /* 24px */
  --space-5: 2rem;     /* 32px */
  --space-6: 3rem;     /* 48px */

  /* === SHADOWS === */
  --shadow-organic: 0 2px 12px rgba(44,40,36,0.03), 0 8px 24px rgba(135,169,107,0.04);
  --shadow-floating: 0 8px 32px rgba(135,169,107,0.18);
  --shadow-focus: 0 0 0 3px rgba(135,169,107,0.3);
  --shadow-focus-error: 0 0 0 3px rgba(212,103,74,0.3);

  /* === BORDER RADIUS === */
  --radius-sm: 0.5rem;   /* 8px */
  --radius-md: 0.75rem;  /* 12px */
  --radius-lg: 1rem;     /* 16px */
  --radius-xl: 1.25rem;  /* 20px */
}

/* Base styles */
body {
  font-family: var(--font-body);
  background: rgb(var(--cream));
  color: rgb(var(--charcoal));
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 700;
}

/* Focus styles (WCAG AA) */
*:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* Utility för line-clamp */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## DEL 3: TAILWIND V4 CONFIG

**VIKTIGT:** Tailwind v4 använder "CSS-first configuration". Setup är annorlunda än v3!

### postcss.config.js
```javascript
// postcss.config.js - TAILWIND V4 SYNTAX
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### src/index.css (Tailwind v4 import + design tokens)
```css
/* TAILWIND V4: Importera via @import */
@import "tailwindcss";

/* Custom CSS variables för tema */
@theme {
  /* Färgpalett - RGB format för alpha support */
  --color-sage: 135 169 107;
  --color-sage-dark: 116 147 93;
  --color-terracotta: 212 103 74;
  --color-terracotta-dark: 194 90 62;
  --color-lavender: 155 143 191;
  --color-charcoal: 44 40 36;
  --color-ash: 90 85 80;
  --color-warm-white: 253 252 251;
  --color-cream: 249 247 244;
  --color-sand: 240 237 232;
  --color-warning: 245 158 11;
  --color-success: 135 169 107;
  --color-error: 212 103 74;
  --color-info: 155 143 191;

  /* Typografi */
  --font-display: 'Lora', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Border radius */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
}

/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@700;800&family=Inter:wght@400;500;600&display=swap');

/* Base styles */
body {
  font-family: var(--font-body);
  background: rgb(var(--color-cream));
  color: rgb(var(--color-charcoal));
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 700;
}

/* Focus styles */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(var(--color-sage) / 0.3);
}
```

### Dependencies för Tailwind v4
```bash
# Tailwind v4 dependencies
npm install -D tailwindcss @tailwindcss/postcss

# OBS: @tailwindcss/line-clamp behövs INTE - ingår i Tailwind core sedan v3.3
# OBS: autoprefixer behövs INTE - ingår i @tailwindcss/postcss
```

### Användning i komponenter
```tsx
// Tailwind v4 med CSS variables fungerar så här:
<div className="bg-sage text-charcoal">         // Solid färg
<div className="bg-sage/10 text-sage/80">       // Med alpha
<div className="rounded-md shadow-organic">     // Custom values
```

---

## DEL 4: VITE CONFIG

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**tsconfig.json** - lägg till paths:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## DEL 5: DATABASSCHEMA (Supabase SQL)

### Workspace/Multitenancy-modell
Grannfrid är en **single-tenant applikation** med workspace som organisatorisk indelning:
- **Två workspaces:** Göteborg och Stockholm (geografiska kontor)
- **Workspace används för:** Rapportering och filtrering (inte åtkomstkontroll)
- **RLS filtrerar på:** `auth.uid()` (inloggad användare), INTE workspace_id
- **Konsultansvarig:** Varje kund har en `responsible_consultant_id` för ägandeskap
- **I praktiken:** Alla inloggade användare ser all data (litet team, full transparens)

Kör detta i Supabase Dashboard → SQL Editor:

```sql
-- ============================================================================
-- GRANNFRID 2.0 - KOMPLETT DATABASSCHEMA v3
-- Med concurrency-safe sequences och proper RLS
-- ============================================================================

-- Aktivera pgcrypto för gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SEQUENCES för concurrency-safe nummer-generering
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS assignment_case_seq START 1;
CREATE SEQUENCE IF NOT EXISTS assignment_project_seq START 1;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. WORKSPACES
-- ============================================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO workspaces (name, location) VALUES
  ('Göteborg', 'Göteborg'),
  ('Stockholm', 'Stockholm');

-- ============================================================================
-- 2. USER PROFILES
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'readonly')),
  default_hourly_rate NUMERIC(10,2),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Okänd användare'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 3. KUNDER
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  customer_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  org_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  antal_lagenheter INTEGER,
  customer_type TEXT CHECK (customer_type IN ('brf', 'kommunalt_fastighetsbolag', 'privat_fastighetsbolag', 'forvaltningsbolag', 'stiftelse', 'samfallighet', 'ovrig')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'prospekt', 'vilande')),
  responsible_consultant_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Concurrency-safe customer number generation
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := 'K-' || LPAD(nextval('customer_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION generate_customer_number();

-- ============================================================================
-- 4. KUNDANTECKNINGAR
-- ============================================================================
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER customer_notes_updated_at
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. AVTAL
-- ============================================================================
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hourly', 'timebank', 'fixed')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  hourly_rate NUMERIC(10,2) NOT NULL,
  hourly_rate_evening NUMERIC(10,2),
  overtime_rate NUMERIC(10,2),
  included_hours INTEGER,
  period TEXT CHECK (period IN ('monthly', 'yearly')),
  billing_advance BOOLEAN DEFAULT false,
  fixed_amount NUMERIC(10,2),
  billing_month INTEGER CHECK (billing_month BETWEEN 1 AND 12),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  notice_period_months INTEGER DEFAULT 3,
  auto_renewal BOOLEAN DEFAULT true,
  next_indexation DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT timebank_requires_fields CHECK (
    type != 'timebank' OR (included_hours IS NOT NULL AND period IS NOT NULL AND overtime_rate IS NOT NULL)
  ),
  CONSTRAINT fixed_requires_fields CHECK (
    type != 'fixed' OR (fixed_amount IS NOT NULL)
  )
);

CREATE TRIGGER agreements_updated_at
  BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. UPPDRAG
-- ============================================================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES agreements(id),
  assignment_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('case', 'project')),
  category TEXT CHECK (category IN ('disturbance', 'illegal_sublet', 'screening', 'renovation_coordination', 'investigation', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  responsible_consultant_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Concurrency-safe assignment number generation
CREATE OR REPLACE FUNCTION generate_assignment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_number IS NULL THEN
    IF NEW.type = 'project' THEN
      NEW.assignment_number := 'P-' || LPAD(nextval('assignment_project_seq')::TEXT, 3, '0');
    ELSE
      NEW.assignment_number := 'C-' || LPAD(nextval('assignment_case_seq')::TEXT, 3, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_assignment_number
  BEFORE INSERT ON assignments
  FOR EACH ROW EXECUTE FUNCTION generate_assignment_number();

-- ============================================================================
-- 7. JOURNALANTECKNINGAR
-- ============================================================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'tiptap_json')),
  hours NUMERIC(5,2),
  billing_comment TEXT,
  is_extra_billable BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  entry_type TEXT DEFAULT 'note' CHECK (entry_type IN ('call', 'email', 'meeting', 'site_visit', 'note')),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. TIDSREGISTRERINGAR
-- ============================================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES agreements(id),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,  -- SET NULL istället för CASCADE
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
  description TEXT,
  hourly_rate NUMERIC(10,2),
  billing_type TEXT DEFAULT 'hourly' CHECK (billing_type IN ('timebank', 'overtime', 'hourly', 'fixed', 'internal')),
  is_billable BOOLEAN DEFAULT true,
  is_exported BOOLEAN DEFAULT false,
  export_batch_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. UPPGIFTER
-- ============================================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 10. KONTAKTER
-- ============================================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  contact_type TEXT DEFAULT 'customer' CHECK (contact_type IN ('customer', 'assignment', 'standalone')),
  is_invoice_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. SNABBANTECKNINGAR
-- ============================================================================
CREATE TABLE quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  is_processed BOOLEAN DEFAULT false,
  processed_journal_id UUID REFERENCES journal_entries(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER quick_notes_updated_at
  BEFORE UPDATE ON quick_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 12. FILER
-- ============================================================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. FAKTURERINGSBATCHER
-- ============================================================================
CREATE TABLE billing_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'exported', 'locked')),
  total_amount NUMERIC(12,2),
  exported_at TIMESTAMPTZ,
  exported_by UUID REFERENCES auth.users(id),
  fortnox_invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, period_year, period_month)
);

CREATE TRIGGER billing_batches_updated_at
  BEFORE UPDATE ON billing_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 14. KUNSKAPSBANK
-- ============================================================================
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('knowledge', 'policy', 'routine')),
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 15. AKTIVITETSLOGG
-- ============================================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_customers_workspace ON customers(workspace_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_assignments_customer ON assignments(customer_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_journal_assignment ON journal_entries(assignment_id);
CREATE INDEX idx_journal_archived ON journal_entries(is_archived) WHERE is_archived = false;
CREATE INDEX idx_time_entries_customer ON time_entries(customer_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_exported ON time_entries(is_exported) WHERE is_exported = false;
CREATE INDEX idx_time_entries_billing_type ON time_entries(billing_type);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'done';
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_knowledge_category ON knowledge_articles(category);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_agreements_indexation ON agreements(next_indexation) WHERE next_indexation IS NOT NULL;
CREATE INDEX idx_agreements_customer ON agreements(customer_id);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES med WITH CHECK (kritiskt för INSERT/UPDATE)
-- ============================================================================

-- Profiles: endast sin egen profil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Customers: workspace-baserad (förberett för multi-tenant)
-- För MVP: alla autentiserade kan allt
CREATE POLICY "authenticated_select" ON customers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert" ON customers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_update" ON customers
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete" ON customers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Applicera samma mönster på övriga tabeller
-- Customer Notes
CREATE POLICY "authenticated_all" ON customer_notes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Agreements
CREATE POLICY "authenticated_all" ON agreements
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Assignments
CREATE POLICY "authenticated_all" ON assignments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Journal Entries
CREATE POLICY "authenticated_all" ON journal_entries
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Time Entries
CREATE POLICY "authenticated_all" ON time_entries
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Tasks
CREATE POLICY "authenticated_all" ON tasks
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Contacts
CREATE POLICY "authenticated_all" ON contacts
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Quick Notes
CREATE POLICY "authenticated_all" ON quick_notes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Files
CREATE POLICY "authenticated_all" ON files
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Billing Batches
CREATE POLICY "authenticated_all" ON billing_batches
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Knowledge Articles
CREATE POLICY "authenticated_all" ON knowledge_articles
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Activity Log (endast läsning för icke-admin)
CREATE POLICY "authenticated_select" ON activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_insert" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- VIEW för Timbank-status (on-the-fly beräkning)
-- ============================================================================
CREATE OR REPLACE VIEW timebank_current_status AS
SELECT
  a.id as agreement_id,
  a.customer_id,
  a.included_hours,
  a.period,
  COALESCE(SUM(
    CASE
      WHEN te.billing_type IN ('timebank', 'overtime')
      AND te.date >= date_trunc(
        CASE WHEN a.period = 'monthly' THEN 'month' ELSE 'year' END,
        CURRENT_DATE
      )
      THEN te.hours
      ELSE 0
    END
  ), 0) as hours_used_this_period,
  a.included_hours - COALESCE(SUM(
    CASE
      WHEN te.billing_type = 'timebank'
      AND te.date >= date_trunc(
        CASE WHEN a.period = 'monthly' THEN 'month' ELSE 'year' END,
        CURRENT_DATE
      )
      THEN te.hours
      ELSE 0
    END
  ), 0) as hours_remaining
FROM agreements a
LEFT JOIN time_entries te ON te.agreement_id = a.id
WHERE a.type = 'timebank' AND a.status = 'active'
GROUP BY a.id, a.customer_id, a.included_hours, a.period;
```

---

## DEL 6: TYPESCRIPT TYPES

```typescript
// src/types/database.ts

export type CustomerType =
  | 'brf'
  | 'kommunalt_fastighetsbolag'
  | 'privat_fastighetsbolag'
  | 'forvaltningsbolag'
  | 'stiftelse'
  | 'samfallighet'
  | 'ovrig';

export type CustomerStatus = 'active' | 'prospekt' | 'vilande';

export type AgreementType = 'hourly' | 'timebank' | 'fixed';
export type AgreementStatus = 'draft' | 'active' | 'expired' | 'terminated';
export type AgreementPeriod = 'monthly' | 'yearly';

export type AssignmentType = 'case' | 'project';
export type AssignmentStatus = 'active' | 'paused' | 'closed';
export type AssignmentCategory =
  | 'disturbance'
  | 'illegal_sublet'
  | 'screening'
  | 'renovation_coordination'
  | 'investigation'
  | 'other';

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'done';

export type BillingType = 'timebank' | 'overtime' | 'hourly' | 'fixed' | 'internal';
export type BatchStatus = 'draft' | 'review' | 'exported' | 'locked';

export type EntryType = 'call' | 'email' | 'meeting' | 'site_visit' | 'note';

export type KnowledgeCategory = 'knowledge' | 'policy' | 'routine';

export type UserRole = 'admin' | 'consultant' | 'readonly';

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface Profile {
  id: string;
  workspace_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
  role: UserRole;
  default_hourly_rate: number | null;
  notifications_enabled: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  customer_number: string;
  name: string;
  org_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  antal_lagenheter: number | null;
  customer_type: CustomerType | null;
  status: CustomerStatus;
  responsible_consultant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Agreement {
  id: string;
  customer_id: string;
  type: AgreementType;
  status: AgreementStatus;
  hourly_rate: number;
  hourly_rate_evening: number | null;
  overtime_rate: number | null;
  included_hours: number | null;
  period: AgreementPeriod | null;
  billing_advance: boolean;
  fixed_amount: number | null;
  billing_month: number | null;
  valid_from: string;
  valid_to: string | null;
  notice_period_months: number;
  auto_renewal: boolean;
  next_indexation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  customer_id: string;
  agreement_id: string | null;
  assignment_number: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  category: AssignmentCategory | null;
  status: AssignmentStatus;
  priority: Priority;
  responsible_consultant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  assignment_id: string;
  content: string;
  content_type: 'text' | 'tiptap_json';
  hours: number | null;
  billing_comment: string | null;
  is_extra_billable: boolean;
  is_pinned: boolean;
  entry_type: EntryType;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  customer_id: string;
  assignment_id: string | null;
  agreement_id: string | null;
  journal_entry_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  hourly_rate: number | null;
  billing_type: BillingType;
  is_billable: boolean;
  is_exported: boolean;
  export_batch_id: string | null;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  customer_id: string | null;
  assignment_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  customer_id: string | null;
  assignment_id: string | null;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  contact_type: 'customer' | 'assignment' | 'standalone';
  is_invoice_recipient: boolean;
  created_at: string;
}

export interface QuickNote {
  id: string;
  content: string;
  customer_id: string | null;
  assignment_id: string | null;
  is_processed: boolean;
  processed_journal_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BillingBatch {
  id: string;
  batch_id: string;
  customer_id: string;
  period_year: number;
  period_month: number;
  status: BatchStatus;
  total_amount: number | null;
  exported_at: string | null;
  exported_by: string | null;
  fortnox_invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[] | null;
  is_published: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  performed_by: string;
  performed_at: string;
}

// ============================================================================
// EXTENDED TYPES (med relationer)
// ============================================================================

export interface CustomerWithAgreement extends Customer {
  agreement: Agreement | null;
}

export interface AssignmentWithCustomer extends Assignment {
  customer: Customer;
}

export interface JournalEntryWithAuthor extends JournalEntry {
  author: Profile;
}

export interface TaskWithRelations extends Task {
  customer?: Customer;
  assignment?: Assignment;
  assignee?: Profile;
}

export interface CustomerNoteWithAuthor extends CustomerNote {
  author: Profile;
}

export interface AgreementWithCustomer extends Agreement {
  customer: Customer;
}

// Timbank status från view
export interface TimebankCurrentStatus {
  agreement_id: string;
  customer_id: string;
  included_hours: number;
  period: AgreementPeriod;
  hours_used_this_period: number;
  hours_remaining: number;
}
```

---

## DEL 7: KRITISK AFFÄRSLOGIK

```typescript
// src/lib/billing-logic.ts

import type { Agreement, BillingType, TimebankCurrentStatus } from '@/types/database';

// ============================================================================
// TIMBANK STATUS
// ============================================================================

export interface TimebankStatus {
  includedHours: number;
  hoursUsed: number;
  hoursRemaining: number;
  overtimeHours: number;
  percentUsed: number;
  isOvertime: boolean;
}

export function calculateTimebankStatus(
  agreement: Agreement,
  hoursThisPeriod: number
): TimebankStatus {
  const includedHours = agreement.included_hours || 0;
  const hoursRemaining = Math.max(0, includedHours - hoursThisPeriod);
  const overtimeHours = Math.max(0, hoursThisPeriod - includedHours);
  const percentUsed = includedHours > 0 ? (hoursThisPeriod / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed: hoursThisPeriod,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursThisPeriod > includedHours,
  };
}

export function timebankStatusFromView(view: TimebankCurrentStatus): TimebankStatus {
  const includedHours = view.included_hours;
  const hoursUsed = view.hours_used_this_period;
  const hoursRemaining = Math.max(0, view.hours_remaining);
  const overtimeHours = Math.max(0, hoursUsed - includedHours);
  const percentUsed = includedHours > 0 ? (hoursUsed / includedHours) * 100 : 0;

  return {
    includedHours,
    hoursUsed,
    hoursRemaining,
    overtimeHours,
    percentUsed: Math.min(percentUsed, 100),
    isOvertime: hoursUsed > includedHours,
  };
}

// ============================================================================
// BILLING CALCULATION MED SPLIT-SUPPORT
// ============================================================================

export interface TimeEntrySplit {
  hours: number;
  billingType: BillingType;
  hourlyRate: number;
  amount: number;
}

export interface BillingResult {
  entries: TimeEntrySplit[];
  totalAmount: number;
}

/**
 * Beräknar hur nya timmar ska delas upp mellan timebank och overtime.
 * Returnerar en eller två time_entry "splits" beroende på om gränsen passeras.
 */
export function calculateBillingWithSplit(
  agreement: Agreement,
  timebankStatus: TimebankStatus | null,
  newHours: number,
  isExtraBillable: boolean = false
): BillingResult {
  // Löpande timpris - enkel beräkning
  if (agreement.type === 'hourly') {
    const amount = newHours * agreement.hourly_rate;
    return {
      entries: [{
        hours: newHours,
        billingType: 'hourly',
        hourlyRate: agreement.hourly_rate,
        amount,
      }],
      totalAmount: amount,
    };
  }

  // Fastpris - timmar loggas för statistik
  if (agreement.type === 'fixed') {
    if (isExtraBillable) {
      // Explicit extraarbete debiteras som hourly
      const amount = newHours * agreement.hourly_rate;
      return {
        entries: [{
          hours: newHours,
          billingType: 'hourly',
          hourlyRate: agreement.hourly_rate,
          amount,
        }],
        totalAmount: amount,
      };
    }
    return {
      entries: [{
        hours: newHours,
        billingType: 'fixed',
        hourlyRate: 0,
        amount: 0,
      }],
      totalAmount: 0,
    };
  }

  // Timbank - komplex logik med split
  if (agreement.type === 'timebank') {
    // Explicit extraarbete = alltid overtime
    if (isExtraBillable) {
      const rate = agreement.overtime_rate || agreement.hourly_rate;
      const amount = newHours * rate;
      return {
        entries: [{
          hours: newHours,
          billingType: 'overtime',
          hourlyRate: rate,
          amount,
        }],
        totalAmount: amount,
      };
    }

    const remaining = timebankStatus?.hoursRemaining ?? agreement.included_hours ?? 0;
    const overtimeRate = agreement.overtime_rate || agreement.hourly_rate;

    // Allt ryms inom timbanken
    if (remaining >= newHours) {
      return {
        entries: [{
          hours: newHours,
          billingType: 'timebank',
          hourlyRate: 0,
          amount: 0,
        }],
        totalAmount: 0,
      };
    }

    // Split: en del timebank, en del overtime
    if (remaining > 0) {
      const overtimeHours = newHours - remaining;
      const overtimeAmount = overtimeHours * overtimeRate;

      return {
        entries: [
          {
            hours: remaining,
            billingType: 'timebank',
            hourlyRate: 0,
            amount: 0,
          },
          {
            hours: overtimeHours,
            billingType: 'overtime',
            hourlyRate: overtimeRate,
            amount: overtimeAmount,
          },
        ],
        totalAmount: overtimeAmount,
      };
    }

    // Allt är övertid
    const amount = newHours * overtimeRate;
    return {
      entries: [{
        hours: newHours,
        billingType: 'overtime',
        hourlyRate: overtimeRate,
        amount,
      }],
      totalAmount: amount,
    };
  }

  // Fallback
  return {
    entries: [{
      hours: newHours,
      billingType: 'internal',
      hourlyRate: 0,
      amount: 0,
    }],
    totalAmount: 0,
  };
}

// ============================================================================
// INDEXATION ALERT CHECK
// ============================================================================

export interface IndexationAlert {
  agreement_id: string;
  customer_name: string;
  days_until: number;
  indexation_date: string;
}

export function checkIndexationAlerts(
  agreements: (Agreement & { customer: { name: string } })[],
  daysThreshold: number = 7
): IndexationAlert[] {
  const today = new Date();
  const alerts: IndexationAlert[] = [];

  for (const agreement of agreements) {
    if (!agreement.next_indexation) continue;

    const indexDate = new Date(agreement.next_indexation);
    const diffTime = indexDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= daysThreshold) {
      alerts.push({
        agreement_id: agreement.id,
        customer_name: agreement.customer.name,
        days_until: diffDays,
        indexation_date: agreement.next_indexation,
      });
    }
  }

  return alerts.sort((a, b) => a.days_until - b.days_until);
}
```

---

## DEL 8: CORE KOMPONENTER

### 8.1 Switch Wrapper (Radix)

```tsx
// src/components/ui/Switch.tsx
import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  className?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
      'border-2 border-transparent transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-sage data-[state=unchecked]:bg-sand',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0',
        'transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = 'Switch';
```

### 8.2 JournalEditor (TipTap)

```tsx
// src/features/assignments/JournalEditor.tsx
import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { journalSchema, type JournalFormData } from '@/lib/schemas';
import { LABELS } from '@/lib/constants';
import type { EntryType } from '@/types/database';

interface JournalEditorProps {
  assignmentId: string;
  onSave: (data: JournalFormData & { content: string }) => Promise<void>;
  initialContent?: string;
  isLoading?: boolean;
}

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'note', label: LABELS.note },
  { value: 'call', label: LABELS.call },
  { value: 'email', label: LABELS.email },
  { value: 'meeting', label: LABELS.meeting },
  { value: 'site_visit', label: LABELS.site_visit },
];

export function JournalEditor({
  assignmentId,
  onSave,
  initialContent = '',
  isLoading = false
}: JournalEditorProps) {
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none',
      },
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      entry_type: 'note',
      is_extra_billable: false,
    },
  });

  const isExtraBillable = watch('is_extra_billable');

  const onSubmit = async (data: JournalFormData) => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const content = editor.getJSON();
      await onSave({
        ...data,
        content: JSON.stringify(content),
      });
      editor.commands.clearContent();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ny journalanteckning</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Editor */}
          <div className="border border-sand rounded-lg overflow-hidden bg-white">
            <EditorContent editor={editor} />
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Entry type */}
            <div className="w-40">
              <label className="text-sm font-medium text-charcoal block mb-1">
                Typ
              </label>
              <Select {...register('entry_type')}>
                {ENTRY_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>

            {/* Hours */}
            <div className="w-24">
              <label className="text-sm font-medium text-charcoal block mb-1">
                {LABELS.hours}
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                {...register('hours', { valueAsNumber: true })}
              />
            </div>

            {/* Extra billable */}
            <div className="flex items-center gap-2">
              <Switch
                checked={isExtraBillable}
                onCheckedChange={(checked) => setValue('is_extra_billable', checked)}
              />
              <label className="text-sm text-charcoal">
                {LABELS.extra_billable}
              </label>
            </div>
          </div>

          {/* Billing comment (visible when hours > 0) */}
          {watch('hours') && watch('hours') > 0 && (
            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                {LABELS.billing_comment}
              </label>
              <Input
                placeholder="Beskriv arbetet för fakturan..."
                {...register('billing_comment')}
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? 'Sparar...' : LABELS.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 8.3 ProfilePage (med useEffect fix)

```tsx
// src/features/profile/ProfilePage.tsx
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileFormData } from '@/lib/schemas';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Switch } from '@/components/ui/Switch';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { LABELS } from '@/lib/constants';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, isLoading, isUpdating } = useProfile();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Synka form med profile data när den laddas
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        phone: profile.phone || '',
        title: profile.title || '',
        default_hourly_rate: profile.default_hourly_rate || undefined,
        notifications_enabled: profile.notifications_enabled,
        email_notifications: profile.email_notifications,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      toast.success('Profil uppdaterad');
    } catch (error) {
      toast.error('Kunde inte spara profilen');
    }
  };

  const handleNotificationChange = async (field: 'notifications_enabled' | 'email_notifications', value: boolean) => {
    setValue(field, value, { shouldDirty: false });
    try {
      await updateProfile({ [field]: value });
      toast.success('Inställning sparad');
    } catch (error) {
      toast.error('Kunde inte spara inställning');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl text-charcoal">{LABELS.my_profile}</h1>

      {/* Profilkort */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar
            src={profile?.avatar_url}
            fallback={profile?.name?.charAt(0) || 'U'}
            size="lg"
          />
          <div>
            <CardTitle>{profile?.name}</CardTitle>
            <p className="text-ash">{profile?.title || 'Konsult'}</p>
            <p className="text-sm text-ash">{profile?.email}</p>
          </div>
        </CardHeader>
      </Card>

      {/* Personuppgifter */}
      <Card>
        <CardHeader>
          <CardTitle>{LABELS.personal_info}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                Namn
              </label>
              <Input {...register('name')} />
              {errors.name && (
                <p className="text-sm text-error mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                {LABELS.phone}
              </label>
              <Input {...register('phone')} placeholder="070-123 45 67" />
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                {LABELS.title}
              </label>
              <Input {...register('title')} placeholder="T.ex. Senior bostadskonsult" />
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                {LABELS.default_hourly_rate} (kr)
              </label>
              <Input
                type="number"
                {...register('default_hourly_rate', { valueAsNumber: true })}
                placeholder="1200"
              />
            </div>

            {isDirty && (
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Sparar...' : LABELS.save}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Notifikationsinställningar */}
      <Card>
        <CardHeader>
          <CardTitle>{LABELS.notifications}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal">Aktivera notifikationer</p>
              <p className="text-sm text-ash">Få påminnelser om deadlines och uppgifter</p>
            </div>
            <Switch
              checked={watch('notifications_enabled')}
              onCheckedChange={(checked) => handleNotificationChange('notifications_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal">E-postnotifikationer</p>
              <p className="text-sm text-ash">Skicka notifikationer via e-post</p>
            </div>
            <Switch
              checked={watch('email_notifications')}
              onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Konto */}
      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium text-charcoal">E-post</p>
            <p className="text-ash">{user?.email}</p>
          </div>

          <div>
            <p className="font-medium text-charcoal">Roll</p>
            <p className="text-ash capitalize">{profile?.role}</p>
          </div>

          <div className="pt-4 border-t border-sand">
            <Button variant="ghost" className="text-error" onClick={signOut}>
              Logga ut
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8.4 KnowledgeList (fixad Tabs)

```tsx
// src/features/knowledge/KnowledgeList.tsx
import { useState, useMemo } from 'react';
import { useKnowledge } from '@/hooks/useKnowledge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Book, FileText, ListChecks, Plus } from 'lucide-react';
import { LABELS } from '@/lib/constants';
import type { KnowledgeCategory } from '@/types/database';

const CATEGORY_CONFIG: Record<KnowledgeCategory, { label: string; icon: typeof Book }> = {
  knowledge: { label: LABELS.knowledge, icon: Book },
  policy: { label: LABELS.policy, icon: FileText },
  routine: { label: LABELS.routine, icon: ListChecks },
};

const CATEGORIES: (KnowledgeCategory | 'all')[] = ['all', 'knowledge', 'policy', 'routine'];

export function KnowledgeList() {
  const { articles, isLoading } = useKnowledge();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'all'>('all');

  const filteredArticles = useMemo(() => {
    return articles?.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(search.toLowerCase()) ||
        article.content.toLowerCase().includes(search.toLowerCase()) ||
        article.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        activeCategory === 'all' || article.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [articles, search, activeCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl text-charcoal">{LABELS.knowledge}</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ny artikel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          placeholder="Sök artiklar..."
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
      </div>

      {/* Category tabs - rendered as buttons instead of Radix Tabs */}
      <div className="flex gap-2 border-b border-sand pb-2">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          const config = category === 'all' ? null : CATEGORY_CONFIG[category];
          const Icon = config?.icon;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-sage text-white'
                  : 'text-ash hover:bg-sand hover:text-charcoal'
                }
              `}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {category === 'all' ? 'Alla' : config?.label}
            </button>
          );
        })}
      </div>

      {/* Article list */}
      {filteredArticles?.length === 0 ? (
        <EmptyState
          title="Inga artiklar hittades"
          description={search ? 'Försök med andra sökord' : 'Skapa din första artikel'}
        />
      ) : (
        <div className="grid gap-4">
          {filteredArticles?.map((article) => {
            const config = CATEGORY_CONFIG[article.category];
            const Icon = config.icon;

            return (
              <Card key={article.id} className="cursor-pointer hover:shadow-floating transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sage/10">
                        <Icon className="w-5 h-5 text-sage" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{article.title}</CardTitle>
                        <p className="text-sm text-ash mt-1">
                          Uppdaterad {new Date(article.updated_at).toLocaleDateString('sv-SE')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={article.is_published ? 'success' : 'default'}>
                      {article.is_published ? 'Publicerad' : 'Utkast'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-ash line-clamp-2">
                    {article.content.substring(0, 200)}...
                  </p>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## DEL 9: EXAMPLE HOOK (useCustomers)

```typescript
// src/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Customer, CustomerFormData } from '@/lib/schemas';
import type { CustomerWithAgreement } from '@/types/database';

export function useCustomers() {
  const queryClient = useQueryClient();

  // Fetch all customers
  const { data: customers, isLoading, error } = useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Customer[];
    },
  });

  // Fetch customers with agreements
  const { data: customersWithAgreements } = useQuery({
    queryKey: [...queryKeys.customers.all, 'with-agreements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          agreement:agreements(*)
        `)
        .order('name');

      if (error) throw error;
      return data as CustomerWithAgreement[];
    },
  });

  // Create customer
  const createCustomer = useMutation({
    mutationFn: async (data: CustomerFormData & { workspace_id: string; responsible_consultant_id: string }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });

  // Update customer
  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CustomerFormData> & { id: string }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
  });

  // Delete customer (admin only)
  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });

  return {
    customers,
    customersWithAgreements,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}

// Hook for single customer
export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          agreement:agreements(*),
          assignments(*),
          contacts(*),
          customer_notes(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

---

## DEL 10: SVENSKA UI-TEXTER

```typescript
// src/lib/constants.ts

// WORKSPACE IDs (från Supabase)
export const WORKSPACES = {
  GOTEBORG: '20306238-6c3a-4eb8-985e-cb096c999a89',
  STOCKHOLM: '28656dac-4559-4136-acfe-7b349889f72a',
} as const;

// Default workspace för nya kunder/uppdrag
export const DEFAULT_WORKSPACE_ID = WORKSPACES.GOTEBORG;

export const LABELS = {
  // Navigation
  dashboard: 'Översikt',
  customers: 'Kunder',
  assignments: 'Uppdrag',
  tasks: 'Uppgifter',
  contacts: 'Kontakter',
  notes: 'Anteckningar',
  billing: 'Fakturering',
  knowledge: 'Kunskapsbank',
  profile: 'Min profil',
  settings: 'Inställningar',

  // Customer types
  brf: 'Bostadsrättsförening',
  kommunalt_fastighetsbolag: 'Kommunalt fastighetsbolag',
  privat_fastighetsbolag: 'Privat fastighetsbolag',
  forvaltningsbolag: 'Förvaltningsbolag',
  stiftelse: 'Stiftelse',
  samfallighet: 'Samfällighet',
  ovrig: 'Övrig',

  // Agreement types
  hourly: 'Löpande timpris',
  timebank: 'Timbank',
  fixed: 'Fastpris',

  // Assignment categories
  disturbance: 'Störningsutredning',
  illegal_sublet: 'Olovlig andrahandsuthyrning',
  screening: 'Boendeundersökning',
  renovation_coordination: 'Renoveringssamordning',
  investigation: 'Utredning',
  other: 'Övrigt',

  // Statuses
  active: 'Aktiv',
  paused: 'Vilande',
  closed: 'Avslutad',
  pending: 'Att göra',
  in_progress: 'Pågående',
  done: 'Klar',
  draft: 'Utkast',
  expired: 'Utgånget',
  terminated: 'Avslutat',

  // Priorities
  low: 'Låg',
  medium: 'Medium',
  high: 'Hög',

  // Entry types
  call: 'Telefonsamtal',
  email: 'E-post',
  meeting: 'Möte',
  site_visit: 'Platsbesök',
  note: 'Anteckning',

  // Knowledge categories
  knowledge: 'Kunskap',
  policy: 'Policy',
  routine: 'Rutin',

  // Actions
  save: 'Spara',
  cancel: 'Avbryt',
  delete: 'Ta bort',
  archive: 'Arkivera',
  edit: 'Redigera',
  create: 'Skapa',
  export: 'Exportera',
  search: 'Sök',
  filter: 'Filtrera',

  // Billing
  billing_comment: 'Faktureringskommentar',
  extra_billable: 'Debiterbart extraarbete',
  hours: 'Timmar',
  hourly_rate: 'Timpris',
  hourly_rate_evening: 'Kvälls-/nattimpris',
  overtime_rate: 'Övertidspris',
  included_hours: 'Inkluderade timmar',
  antal_lagenheter: 'Antal lägenheter',

  // Profile
  my_profile: 'Min profil',
  personal_info: 'Personuppgifter',
  notifications: 'Notifikationer',
  default_hourly_rate: 'Standardtimpris',
  title: 'Titel',
  phone: 'Telefon',

  // Misc
  loading: 'Laddar...',
  no_results: 'Inga resultat',
  confirm_delete: 'Är du säker på att du vill ta bort detta?',
  confirm_archive: 'Är du säker på att du vill arkivera detta?',
} as const;

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm';
export const CURRENCY = 'SEK';
export const CURRENCY_LOCALE = 'sv-SE';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('sv-SE');
}

export function formatHours(hours: number): string {
  return `${hours}h`;
}
```

---

## DEL 11: CHECKLISTA FÖR ONESHOT

### Innan du börjar

- [ ] Supabase projekt skapat
- [ ] SQL-schema kört (DEL 5)
- [ ] Auth konfigurerat (Email + eventuellt Google)
- [ ] `.env` fil med `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY`

### Fas 1: Foundation

- [ ] Projekt skapat med Vite
- [ ] Alla dependencies installerade (inkl. TipTap, line-clamp plugin)
- [ ] `vite.config.ts` med @/ alias
- [ ] `tsconfig.json` med paths
- [ ] Tailwind konfigurerat (ESM, RGB-färger)
- [ ] Design tokens i index.css (RGB-format!)
- [ ] `lib/supabase.ts` - Supabase client
- [ ] `lib/utils.ts` - cn() helper
- [ ] `lib/queryKeys.ts` - React Query keys
- [ ] `lib/schemas.ts` - Zod schemas
- [ ] `contexts/AuthContext.tsx` implementerat
- [ ] `components/layout/AppShell.tsx` med Sidebar
- [ ] Routing konfigurerat (react-router-dom)
- [ ] Toasts (sonner) konfigurerat i App.tsx
- [ ] QueryClientProvider i App.tsx

### Fas 2: Kunder

- [ ] `hooks/useCustomers.ts` med React Query
- [ ] CustomerList visar kunder med pagination
- [ ] CustomerForm skapar kunder (använd Zod schema)
- [ ] CustomerDetail med flikar
- [ ] CustomerTimeline
- [ ] CustomerNotesTab
- [ ] AgreementForm med kvälls-/nattimpris
- [ ] Kundnummer auto-genereras (K-001) via DB trigger

### Fas 3: Uppdrag

- [ ] `hooks/useAssignments.ts`
- [ ] AssignmentList visar uppdrag
- [ ] AssignmentForm skapar uppdrag
- [ ] AssignmentDetail med Journal-flik
- [ ] JournalEditor med TipTap
- [ ] JournalTimeline (arkiverade entries döljs men kan visas)
- [ ] Uppdragsnummer auto-genereras (C-001, P-001)

### Fas 4: Fakturering

- [ ] `lib/billing-logic.ts` med split-support
- [ ] Tidsregistrering från journal skapar time_entries
- [ ] Split-entries när timbank överskrids
- [ ] TimebankWidget med ProgressBar (använd view)
- [ ] BillingPipeline visar underlag per kund/månad
- [ ] ExportDialog med CSV-export

### Fas 5: Dashboard + Tasks

- [ ] Dashboard med KPICards
- [ ] IndexationAlert (varning <7 dagar)
- [ ] ActivityFeed
- [ ] TaskList med gruppering/filter
- [ ] TaskForm

### Fas 6: Övriga moduler

- [ ] ContactList och ContactForm
- [ ] KnowledgeList med kategorifilter (utan Radix Tabs-bug)
- [ ] ArticleEditor/ArticleView
- [ ] ProfilePage (med useEffect fix)
- [ ] Header med profil-dropdown

---

## SAMMANFATTNING AV V3 ÄNDRINGAR

Baserat på feedback från **Grok**, **Gemini** och **ChatGPT**:

### Kritiska fixar implementerade:
1. **Tailwind RGB-format** - Färger nu i `135 169 107` format för alpha-support
2. **Vite alias @/** - Tillagt i vite.config.ts och tsconfig.json
3. **TipTap dependencies** - @tiptap/react, @tiptap/pm, @tiptap/starter-kit
4. **line-clamp plugin** - @tailwindcss/line-clamp tillagd
5. **ESM-konsekvent tailwind.config** - import istället för require
6. **queryKeys.ts** - React Query key factory för cache-hantering
7. **schemas.ts** - Zod validation schemas
8. **RLS med WITH CHECK** - Proper policies för INSERT/UPDATE
9. **Concurrency-safe sequences** - customer_number_seq etc
10. **updated_at triggers** - Auto-uppdatering på alla tabeller
11. **time_entries.journal_entry_id SET NULL** - Inte CASCADE
12. **Switch wrapper** - Proper Radix Switch implementation
13. **ProfilePage useEffect** - Synkar form med loaded profile
14. **KnowledgeList utan Tabs-bug** - Button-baserad filtrering
15. **Förbättrad färgkontrast** - ash: #5A5550
16. **Billing split-support** - Hanterar entries som spräcker timbank
17. **timebank_current_status VIEW** - On-the-fly beräkning

### Dependencies uppdaterade:
```bash
npm install @tiptap/react@^2.0 @tiptap/pm@^2.0 @tiptap/starter-kit@^2.0
npm install -D @tailwindcss/line-clamp
```

**Bygg i denna ordning:**
1. Foundation (alla configs, auth, layout, routing)
2. Kunder + Avtal + Kundanteckningar
3. Uppdrag + Journal (TipTap, arkivering)
4. Fakturering + Timbank (split-logik)
5. Dashboard + Tasks + Indexationsvarning
6. Kontakter + Kunskapsbank + Profil

Lycka till! 🚀
