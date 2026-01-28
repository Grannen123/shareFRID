# Testing Strategy - Grannfrid App

**Version:** 1.0
**Datum:** 2026-01-18
**Syfte:** Etablera en omfattande testningsstrategi för Grannfrid 2.0 CRM-appen

---

## 1. Testning av Grannfrid idag

### 1.1 Nuvarande status

**E2E Tests (Playwright):**

- ✅ `tests/smoke.spec.ts` – Grundläggande smoke test
- ✅ Playwright konfigurerat (`playwright.config.ts`)
- ✅ E2E runner skript (`scripts/run-e2e.mjs`)
- ✅ Environment variables för test-användare

**Unit Tests:**

- ❌ Inga unit tests för business logic
- ❌ Ingen Vitest eller Jest konfiguration
- ❌ Ingen test coverage monitoring

**Component Tests:**

- ❌ Inga React component tests
- ❌ Ingen testing library setup
- ❌ Inga snapshot tests

**Test Utilities:**

- ⚠️ Minimal test-stöd (bara smoke test fixtures)
- ❌ Ingen mock-strategi för Supabase
- ❌ Ingen test data builders/factories

### 1.2 Kritiska områden utan tester

1. **billing-logic.ts** – Komplex timbank-split-logik (HÖGT RISKOMRODE)
2. **React Query hooks** – 17 data-hooks utan coverage
3. **Forms** – Zod-validering inte testad
4. **AuthContext** – Session-hantering kritisk men otestadSuggested
5. **E2E flows** – Endast 1 smoke test, många scenarier saknas

---

## 2. Rekommenderad testningsstrategi

### 2.1 Test pyramid

```
                  /\
                 /E2E\                  ← 5-10 kritiska user journeys
                /-----\
               /  Integ\               ← 10-15 integration tests (hooks + DB)
              /---------\
             / Components \            ← 20-30 component tests (forms, dialogs)
            /-------------\
           /     Unit      \           ← 30-50 unit tests (logic, utils)
          /-------------------\
```

**Rekommenderad fördelning:**

- **Unit tests:** 40% (fokus på billing-logic, validators, helpers)
- **Component tests:** 25% (forms, dialogs, widgets)
- **Integration tests:** 20% (hooks + Supabase queries)
- **E2E tests:** 15% (kritiska user flows)

### 2.2 Prioriterade testningsområden

#### Prioritet 1: KRITISKA (Vecka 1)

1. **billing-logic.ts** – Timbank-split, beräkningar
   - Test timbank status-beräkningar
   - Test split-logik (3h timbank + 5h registrering = 2 entries)
   - Test overtime-beräkningar
   - Test fast price-logik

2. **Form Validation** (Zod schemas)
   - customerSchema validation
   - agreementSchema dengan refine rules
   - journalSchema

3. **AuthContext** – Session persistence
   - Login flow
   - Logout flow
   - Session refresh

#### Prioritet 2: HÖGA (Vecka 2-3)

4. **Data Hooks** (React Query)
   - useCustomers, useAgreements, useAssignments
   - useBilling, useJournal, useTimeEntries
   - Mock Supabase responses

5. **Component Testing**
   - TimebankWidget
   - CustomerForm
   - AgreementForm
   - JournalEntryForm
   - TaskForm

6. **Critical E2E Flows**
   - Create customer → Agreement → Assignment → Journal → Time entry
   - Timebank split (edge case)
   - File upload/download
   - Billing export

#### Prioritet 3: MEDIUM (Vecka 4+)

7. **Additional E2E Scenarios**
   - Task management
   - Knowledge bank
   - Contact management
   - Notes linking

8. **Performance Tests**
   - Large data sets (1000+ time entries)
   - Query performance
   - Component render times

---

## 3. Testning av Unit - Verktyg och setup

### 3.1 Rekommenderad teststack

| Layer                 | Tool                         | Version  | Motivering                               |
| --------------------- | ---------------------------- | -------- | ---------------------------------------- |
| **Unit/Component**    | Vitest                       | ^2.0     | Vite-native, snabbt, bra TypeScript-stöd |
| **React Testing**     | @testing-library/react       | ^15.0    | Standard för React component-tests       |
| **DOM Testing**       | @testing-library/dom         | ^10.0    | Accessibilty-first testing               |
| **Mocking**           | Vitest's vi.mock()           | built-in | Native support, inga extra beroenden     |
| **Assertions**        | Vitest expect                | built-in | Kompatibel med Jest                      |
| **User Interactions** | @testing-library/user-event  | ^15.0    | Realistiska user-events                  |
| **Supabase Mocking**  | jest-mock-extended OR manual | ^1.0     | Mock av Supabase client                  |
| **E2E**               | Playwright                   | ^1.57    | Already configured                       |

### 3.2 Installation commands

```bash
# Unit testing dependencies
npm install -D vitest @vitest/ui @vitest/coverage-v8

# React testing library
npm install -D @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event

# Supabase mocking (choose one)
npm install -D jest-mock-extended  # Option 1: Full mocking
# OR Manual mock strategy (recommended for your case)

# Utilities
npm install -D jsdom  # DOM simulation for unit tests
npm install -D @vitest/expect-playwright  # Optional: Playwright matchers
```

### 3.3 Vitest configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/App.tsx", "src/types/**", "src/**/*.d.ts"],
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 3.4 Test setup file (`tests/setup.ts`)

```typescript
import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup efter varje test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Supabase globally (see section 3.5)
```

---

## 4. Supabase Mock-strategi

### 4.1 Manual mock approach (REKOMMENDERAT)

Skapa `tests/mocks/supabase.ts`:

```typescript
import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

export const createMockSupabaseClient = (): SupabaseClient => {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
      })),
    },
  } as unknown as SupabaseClient;
};

export const mockSupabaseAuth = {
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        user: {
          id: "test-user-123",
          email: "test@grannfrid.se",
        },
      },
    },
    error: null,
  }),
};
```

### 4.2 Mock supabase i tests

```typescript
// tests/mocks/handlers.ts
import { vi } from "vitest";
import * as supabaseModule from "@/lib/supabase";
import { createMockSupabaseClient } from "./supabase";

export const mockSupabase = createMockSupabaseClient();

vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
  withTimeout: vi.fn((query) => query),
}));
```

### 4.3 Använda mocks i tests

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSupabase } from "@/tests/mocks/handlers";

describe("useCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch customers", async () => {
    const mockData = [
      { id: "1", name: "Kund A", customer_number: "K-001" },
      { id: "2", name: "Kund B", customer_number: "K-002" },
    ];

    mockSupabase.from("customers").select.mockResolvedValueOnce({
      data: mockData,
      error: null,
    });

    // Test here
  });
});
```

---

## 5. Unit Testing Plan - Prioriterad lista

### 5.1 KRITISKT: billing-logic.ts (8 test files)

Skapa `src/lib/billing-logic.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateTimebankStatus,
  calculateBillingWithSplit,
} from "@/lib/billing-logic";
import type { Agreement } from "@/types/database";

describe("calculateTimebankStatus", () => {
  it("should calculate hours remaining correctly", () => {
    const agreement: Agreement = {
      id: "1",
      type: "timebank",
      included_hours: 20,
      hourly_rate: 500,
    };

    const status = calculateTimebankStatus(agreement, 15);

    expect(status.hoursRemaining).toBe(5);
    expect(status.percentUsed).toBe(75);
    expect(status.isOvertime).toBe(false);
  });

  it("should mark as overtime when hours exceed included", () => {
    const agreement: Agreement = {
      type: "timebank",
      included_hours: 20,
    };

    const status = calculateTimebankStatus(agreement, 25);

    expect(status.overtimeHours).toBe(5);
    expect(status.isOvertime).toBe(true);
  });
});

describe("calculateBillingWithSplit", () => {
  it("should split correctly: 3h timebank remaining + 8h new = 3h TB + 5h OT", () => {
    const agreement: Agreement = {
      type: "timebank",
      included_hours: 20,
      hourly_rate: 500,
      overtime_rate: 750,
    };

    const timebankStatus = {
      includedHours: 20,
      hoursUsed: 17,
      hoursRemaining: 3,
      overtimeHours: 0,
      percentUsed: 85,
      isOvertime: false,
    };

    const result = calculateBillingWithSplit(agreement, timebankStatus, 8);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      hours: 3,
      billingType: "timebank",
      amount: 0,
    });
    expect(result.entries[1]).toMatchObject({
      hours: 5,
      billingType: "overtime",
      amount: 3750, // 5 * 750
    });
    expect(result.totalAmount).toBe(3750);
  });

  it("should handle hourly agreement (no split)", () => {
    const agreement: Agreement = {
      type: "hourly",
      hourly_rate: 500,
    };

    const result = calculateBillingWithSplit(agreement, null, 8);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      hours: 8,
      billingType: "hourly",
      amount: 4000,
    });
  });

  it("should handle fixed agreement with extra billable hours", () => {
    const agreement: Agreement = {
      type: "fixed",
      fixed_amount: 10000,
      hourly_rate: 500,
    };

    const result = calculateBillingWithSplit(agreement, null, 5, true);

    expect(result.entries[0]).toMatchObject({
      billingType: "hourly",
      amount: 2500, // 5 * 500
    });
  });

  it("should handle edge case: no timebank remaining", () => {
    const agreement: Agreement = {
      type: "timebank",
      included_hours: 20,
      overtime_rate: 750,
    };

    const timebankStatus = {
      hoursRemaining: 0,
      // ... other fields
    };

    const result = calculateBillingWithSplit(agreement, timebankStatus, 8);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      billingType: "overtime",
      hours: 8,
      amount: 6000, // 8 * 750
    });
  });
});

describe("isIndexationWarningNeeded", () => {
  it("should return true if indexation in 3 days", () => {
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const result = isIndexationWarningNeeded(inThreeDays.toISOString());

    expect(result).toBe(true);
  });

  it("should return false if indexation in 10 days", () => {
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);

    const result = isIndexationWarningNeeded(inTenDays.toISOString());

    expect(result).toBe(false);
  });
});
```

### 5.2 KRITISKT: Form Validation (3 test files)

Skapa `src/lib/schemas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { customerSchema, agreementSchema, journalSchema } from "@/lib/schemas";

describe("customerSchema", () => {
  it("should validate customer with required fields", () => {
    const valid = customerSchema.parse({
      name: "Brf Almen",
      status: "active",
    });
    expect(valid.name).toBe("Brf Almen");
  });

  it("should fail when name is empty", () => {
    expect(() =>
      customerSchema.parse({
        name: "",
      }),
    ).toThrow();
  });

  it("should validate email if provided", () => {
    const result = customerSchema.safeParse({
      name: "Kund",
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("agreementSchema", () => {
  it("should require included_hours for timebank", () => {
    expect(() =>
      agreementSchema.parse({
        customer_id: "123",
        type: "timebank",
        hourly_rate: 500,
        // Missing included_hours, period, overtime_rate
      }),
    ).toThrow();
  });

  it("should accept complete timebank agreement", () => {
    const valid = agreementSchema.parse({
      customer_id: "123",
      type: "timebank",
      hourly_rate: 500,
      included_hours: 20,
      period: "monthly",
      overtime_rate: 750,
      valid_from: "2026-01-01",
    });
    expect(valid.type).toBe("timebank");
  });

  it("should require fixed_amount for fixed agreement", () => {
    expect(() =>
      agreementSchema.parse({
        customer_id: "123",
        type: "fixed",
        hourly_rate: 500,
        // Missing fixed_amount
      }),
    ).toThrow();
  });
});

describe("journalSchema", () => {
  it("should require content", () => {
    expect(() =>
      journalSchema.parse({
        content: "",
      }),
    ).toThrow();
  });

  it("should accept hours >= 0", () => {
    const valid = journalSchema.parse({
      content: "Besök på plats",
      hours: 2.5,
    });
    expect(valid.hours).toBe(2.5);
  });

  it("should reject negative hours", () => {
    expect(() =>
      journalSchema.parse({
        content: "Test",
        hours: -1,
      }),
    ).toThrow();
  });
});
```

### 5.3 Övriga unit tests

**useTimebank.test.ts:**

- Parse timebank period
- Calculate remaining hours
- Handle null values

**billing-logic-helpers.test.ts:**

- getPeriodStartDate()
- Period calculations (monthly vs yearly)

---

## 6. Component Testing Plan

### 6.1 Testable components (prioriterad lista)

| Komponent            | Test file                                      | Fokus                                    |
| -------------------- | ---------------------------------------------- | ---------------------------------------- |
| **TimebankWidget**   | features/customers/TimebankWidget.test.tsx     | Render av status, split visuals          |
| **CustomerForm**     | features/customers/CustomerForm.test.tsx       | Form submission, validation              |
| **AgreementForm**    | features/customers/AgreementForm.test.tsx      | Conditional fields, agreement type logic |
| **JournalEntryForm** | features/assignments/JournalEntryForm.test.tsx | Hours validation, split preview          |
| **TaskForm**         | features/tasks/TaskForm.test.tsx               | Assignment/customer linking              |
| **Switch wrapper**   | components/ui/Switch.test.tsx                  | A11y, interaction                        |
| **ErrorState**       | components/shared/ErrorState.test.tsx          | Props rendering, retry callback          |

### 6.2 Exempel: TimebankWidget.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimebankWidget } from '@/features/customers/TimebankWidget';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('TimebankWidget', () => {
  it('should display hours remaining', () => {
    const timebankStatus = {
      hoursRemaining: 5,
      percentUsed: 75,
      isOvertime: false,
    };

    render(
      <TimebankWidget status={timebankStatus} />,
      { wrapper }
    );

    expect(screen.getByText(/5 timmar kvar/i)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('should show warning when overtime', () => {
    const timebankStatus = {
      hoursRemaining: 0,
      overtimeHours: 8,
      isOvertime: true,
    };

    render(
      <TimebankWidget status={timebankStatus} />,
      { wrapper }
    );

    expect(screen.getByText(/övertid/i)).toBeInTheDocument();
  });
});
```

---

## 7. Integration Testing Plan

### 7.1 Hook integration tests

Skapa `src/hooks/useBilling.integration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useBillingBatches } from '@/hooks/useBilling';
import { mockSupabase } from '@/tests/mocks/handlers';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useBillingBatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch billing batches', async () => {
    const mockBatches = [
      {
        id: '1',
        period_year: 2026,
        period_month: 1,
        customer: { name: 'Kund A', customer_number: 'K-001' },
      },
    ];

    mockSupabase.from('billing_batches').select.mockResolvedValueOnce({
      data: mockBatches,
      error: null,
    });

    const { result } = renderHook(() => useBillingBatches(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBatches);
  });

  it('should handle errors gracefully', async () => {
    mockSupabase.from('billing_batches').select.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const { result } = renderHook(() => useBillingBatches(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### 7.2 Hook + form integration tests

Testa form submissions med React Query mutations.

---

## 8. E2E Testing Plan (Playwright)

### 8.1 Kritiska user journeys

Redan finns: `tests/smoke.spec.ts` (grundläggande)

Nya tester att lägga till:

#### tests/e2e/customer-workflow.spec.ts

```
1. Skapa ny kund
2. Lägg till avtal (timebank)
3. Skapa uppdrag
4. Registrera journal med timmar
5. Verify timbank-split in form
6. Submit och verify time entries skapades
```

#### tests/e2e/billing-flow.spec.ts

```
1. Navigera till Billing
2. Skapa fakturaunderlag
3. Verifiera grouped time entries
4. Export CSV
5. Verify split entries i export
```

#### tests/e2e/task-workflow.spec.ts

```
1. Skapa uppgift kopplad till kund
2. Tilldela till kollega
3. Ändra status (pending → in_progress → done)
4. Verify ändringar i listan
```

#### tests/e2e/form-validation.spec.ts

```
1. Testa customer form med invalid input
2. Testa agreement form (timebank kräver extra fält)
3. Testa journal form med negative hours
4. Verify error messages
```

### 8.2 Exempel: customer-workflow.spec.ts

```typescript
import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL ?? "test@grannfrid.se";
const password = process.env.E2E_PASSWORD ?? "Test1234!";

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("complete customer workflow: create → agreement → assignment → journal", async ({
  page,
}) => {
  await login(page);

  // 1. Create customer
  await page.goto("/customers");
  await page.getByRole("button", { name: "Ny kund" }).click();

  await page.locator("#name").fill("Test BRF 2026");
  await page.locator("#customer_type").selectOption("brf");
  await page.getByRole("button", { name: "Spara" }).click();

  await expect(page.getByText("Test BRF 2026")).toBeVisible();

  // 2. Add timebank agreement
  await page.getByRole("tab", { name: "Avtal" }).click();
  await page.getByRole("button", { name: "Lägg till avtal" }).click();

  await page.locator("#type").selectOption("timebank");
  await page.locator("#included_hours").fill("20");
  await page.locator("#hourly_rate").fill("500");
  await page.locator("#overtime_rate").fill("750");
  await page.locator("#period").selectOption("monthly");
  await page.getByRole("button", { name: "Spara avtal" }).click();

  await expect(page.getByText("20 timmar")).toBeVisible();

  // 3. Create assignment
  await page.getByRole("tab", { name: "Uppdrag" }).click();
  await page.getByRole("button", { name: "Ny uppdrag" }).click();

  await page.locator("#title").fill("Störningsutredning");
  await page.locator("#type").selectOption("case");
  await page.getByRole("button", { name: "Skapa" }).click();

  // 4. Add journal entry with timebank split
  await page.getByRole("button", { name: "Ny journalpost" }).click();
  await page.locator("#content").fill("Besök på plats");
  await page.locator("#hours").fill("8");

  // Verify split preview
  await expect(page.getByText(/3 timmar timebank/)).toBeVisible();
  await expect(page.getByText(/5 timmar övertid/)).toBeVisible();

  await page.getByRole("button", { name: "Spara" }).click();

  // Verify time entries were created
  await expect(page.getByText("3 timmar")).toBeVisible();
  await expect(page.getByText("5 timmar")).toBeVisible();
});
```

---

## 9. Testning av märkning implementation

### 9.1 npm scripts för testing

Lägg till i `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "node scripts/run-e2e.mjs",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### 9.2 CI/CD integration

Lägg till i `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - run: npm run test:e2e
        env:
          E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
```

---

## 10. Mock-strategi sammanfattning

### 10.1 Vad att mocka

**✅ Mocka:**

- Supabase client (`from()`, `auth`, `storage`)
- React Query hooks (via MSW eller manual mocks)
- External APIs (Fortnox later)
- Date/time (för tidsrelaterade tester)
- localStorage (för sessioner)

**❌ Mocka inte:**

- Zod schemas (testa verklig validering)
- date-fns utilities (testa verklig datum-logik)
- Tailwind CSS (testa via visual regression senare)
- React hooks (context, useState, useEffect)

### 10.2 Mock organization

```
tests/
├── mocks/
│   ├── supabase.ts        # Supabase mock factory
│   ├── handlers.ts        # Global mock setup
│   ├── data.ts            # Mock data/fixtures
│   └── factories.ts       # Data builders
├── setup.ts               # Global test setup
├── smoke.spec.ts          # E2E smoke test
├── fixtures/
│   └── sample-upload.txt
└── e2e/
    ├── customer-workflow.spec.ts
    ├── billing-flow.spec.ts
    └── ...
```

---

## 11. Implementeringsplan

### Phase 1: Foundation (Vecka 1)

- [ ] Install Vitest + dependencies
- [ ] Create vitest.config.ts
- [ ] Create tests/setup.ts
- [ ] Create Supabase mock strategy
- [ ] Write billing-logic.test.ts
- [ ] Write schemas.test.ts

**Commits:**

```bash
git commit -m "test: setup Vitest and Supabase mocks"
git commit -m "test: add billing-logic unit tests (8 test cases)"
git commit -m "test: add form validation tests"
```

### Phase 2: Components (Vecka 2)

- [ ] TimebankWidget tests
- [ ] Form component tests
- [ ] Error/Loading state tests
- [ ] Accessibility tests

**Commits:**

```bash
git commit -m "test: add component tests for forms"
git commit -m "test: add TimebankWidget tests"
```

### Phase 3: Integration (Vecka 3)

- [ ] Hook integration tests
- [ ] React Query mock strategy
- [ ] Form + mutation tests

**Commits:**

```bash
git commit -m "test: add integration tests for hooks"
git commit -m "test: add form submission tests"
```

### Phase 4: E2E (Vecka 4)

- [ ] Enhance existing smoke test
- [ ] Add customer workflow E2E
- [ ] Add billing flow E2E
- [ ] Add form validation E2E

**Commits:**

```bash
git commit -m "test: enhance E2E test coverage"
git commit -m "test: add critical user journey E2E tests"
```

---

## 12. Coverage targets

| Area             | Target | Status           |
| ---------------- | ------ | ---------------- |
| billing-logic.ts | 100%   | ❌ Start Phase 1 |
| Form validation  | 95%    | ❌ Start Phase 1 |
| React hooks      | 70%    | ❌ Start Phase 3 |
| Components       | 60%    | ❌ Start Phase 2 |
| Overall          | 70%    | ❌ Start Phase 1 |

---

## 13. Known testing challenges & solutions

| Utmaning             | Lösning                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Supabase auth timing | Use `vi.useFakeTimers()` eller explicit waits                          |
| RLS policies         | Mock authenticated user in tests                                       |
| File uploads         | Mock Storage API, don't upload real files                              |
| Date calculations    | Use `vi.setSystemTime()` för tidsrelaterade tester                     |
| Concurrency          | Vitest runs parallel by default, use `describe.sequential()` if needed |

---

## 14. Referensdokumentation

| Länk                                                         | Syfte                        |
| ------------------------------------------------------------ | ---------------------------- |
| [Vitest docs](https://vitest.dev)                            | Officiell dokumentation      |
| [Testing Library](https://testing-library.com)               | React testing best practices |
| [Playwright docs](https://playwright.dev)                    | E2E testing reference        |
| [Supabase testing](https://supabase.com/docs/guides/testing) | Supabase test patterns       |

---

## 15. Nästa steg

1. **Installera Vitest + dependencies**

   ```bash
   npm install -D vitest @vitest/ui @vitest/coverage-v8 @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom
   ```

2. **Skapa test configuration**
   - `vitest.config.ts`
   - `tests/setup.ts`

3. **Skapa Supabase mock strategy**
   - `tests/mocks/supabase.ts`
   - `tests/mocks/handlers.ts`

4. **Skriv billing-logic tests**
   - Enhetstester för split-logik
   - Edge cases och felscenarier

5. **Commit och push**
   ```bash
   git add tests/ vitest.config.ts
   git commit -m "test: initial Vitest setup with billing-logic tests"
   git push origin testing-setup
   ```

---

**Version history:**

- v1.0 (2026-01-18) – Initial testing strategy document
