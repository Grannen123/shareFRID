# Testing Quick Start - Grannfrid App

**Version:** 1.0
**Datum:** 2026-01-18
**Syfte:** Snabbstart-guide för att komma igång med Vitest och enhetstester

---

## 1. Installation (5 minuter)

### 1.1 Installera dependencies

```bash
cd "/Users/jonashalvarsson/Desktop/alla mina appar"

npm install -D \
  vitest \
  @vitest/ui \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/dom \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom
```

### 1.2 Verifiera installation

```bash
npx vitest --version
# Bör visa: v2.x.x eller senare
```

---

## 2. Setup (10 minuter)

### 2.1 Skapa `vitest.config.ts`

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
    exclude: ["node_modules", "dist"],
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

### 2.2 Skapa `tests/setup.ts`

```typescript
import "@testing-library/jest-dom";
import { expect, afterEach, vi, beforeAll } from "vitest";
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

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
```

### 2.3 Skapa `tests/mocks/supabase.ts`

```typescript
import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Factory for creating a mock Supabase client
 * Used in unit tests to mock database queries
 */
export const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        move: vi.fn(),
      }),
    },
  } as unknown as SupabaseClient;
};

/**
 * Create a mock authenticated session
 */
export const createMockSession = (overrides = {}) => ({
  user: {
    id: "test-user-123",
    email: "test@grannfrid.se",
    ...overrides,
  },
  session: {
    access_token: "mock-token",
    token_type: "Bearer",
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
  },
});
```

### 2.4 Skapa `tests/mocks/handlers.ts`

```typescript
import { vi } from "vitest";
import { createMockSupabaseClient } from "./supabase";

// Global mock instance
export const mockSupabase = createMockSupabaseClient();

// Setup module mocks
vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
  withTimeout: vi.fn((query) => query),
}));

// Helper function to reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
};

// Helper to mock query response
export const mockQueryResponse = (
  table: string,
  data: any,
  error: any = null,
) => {
  const queryBuilder = mockSupabase.from(table) as any;
  queryBuilder.select.mockResolvedValueOnce({ data, error });
  return queryBuilder;
};
```

### 2.5 Uppdatera `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
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

---

## 3. Första test: billing-logic.test.ts (20 minuter)

### 3.1 Skapa `src/lib/billing-logic.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateTimebankStatus,
  calculateBillingWithSplit,
  isIndexationWarningNeeded,
  timebankStatusFromView,
} from "./billing-logic";
import type { Agreement } from "@/types/database";

describe("billing-logic", () => {
  describe("calculateTimebankStatus", () => {
    it("should calculate hours remaining when not overtime", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "timebank",
        included_hours: 20,
        hourly_rate: 500,
        status: "active",
        valid_from: "2026-01-01",
      };

      const status = calculateTimebankStatus(agreement, 15);

      expect(status.includedHours).toBe(20);
      expect(status.hoursUsed).toBe(15);
      expect(status.hoursRemaining).toBe(5);
      expect(status.overtimeHours).toBe(0);
      expect(status.percentUsed).toBe(75);
      expect(status.isOvertime).toBe(false);
    });

    it("should mark as overtime when hours exceed included", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "timebank",
        included_hours: 20,
        hourly_rate: 500,
        status: "active",
        valid_from: "2026-01-01",
      };

      const status = calculateTimebankStatus(agreement, 25);

      expect(status.hoursRemaining).toBe(0);
      expect(status.overtimeHours).toBe(5);
      expect(status.percentUsed).toBe(100);
      expect(status.isOvertime).toBe(true);
    });

    it("should handle zero included hours", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "hourly",
        hourly_rate: 500,
        status: "active",
        valid_from: "2026-01-01",
      };

      const status = calculateTimebankStatus(agreement, 10);

      expect(status.percentUsed).toBe(0);
      expect(status.hoursRemaining).toBe(0);
    });
  });

  describe("calculateBillingWithSplit", () => {
    it("should handle hourly agreement (no split)", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "hourly",
        hourly_rate: 500,
        status: "active",
        valid_from: "2026-01-01",
      };

      const result = calculateBillingWithSplit(agreement, null, 8);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        hours: 8,
        billingType: "hourly",
        hourlyRate: 500,
        amount: 4000, // 8 * 500
      });
      expect(result.totalAmount).toBe(4000);
    });

    it("should split: 3h timebank + 5h overtime when 3h remaining", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "timebank",
        included_hours: 20,
        hourly_rate: 500,
        overtime_rate: 750,
        status: "active",
        valid_from: "2026-01-01",
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

      // Entry 1: Timebank
      expect(result.entries[0]).toMatchObject({
        hours: 3,
        billingType: "timebank",
        hourlyRate: 0,
        amount: 0,
      });

      // Entry 2: Overtime
      expect(result.entries[1]).toMatchObject({
        hours: 5,
        billingType: "overtime",
        hourlyRate: 750,
        amount: 3750, // 5 * 750
      });

      expect(result.totalAmount).toBe(3750);
    });

    it("should fit entirely in timebank when hours remaining >= new hours", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "timebank",
        included_hours: 20,
        hourly_rate: 500,
        overtime_rate: 750,
        status: "active",
        valid_from: "2026-01-01",
      };

      const timebankStatus = {
        includedHours: 20,
        hoursUsed: 15,
        hoursRemaining: 5,
        overtimeHours: 0,
        percentUsed: 75,
        isOvertime: false,
      };

      const result = calculateBillingWithSplit(agreement, timebankStatus, 3);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        hours: 3,
        billingType: "timebank",
        amount: 0,
      });
      expect(result.totalAmount).toBe(0);
    });

    it("should be all overtime when no timebank remaining", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "timebank",
        included_hours: 20,
        hourly_rate: 500,
        overtime_rate: 750,
        status: "active",
        valid_from: "2026-01-01",
      };

      const timebankStatus = {
        includedHours: 20,
        hoursUsed: 20,
        hoursRemaining: 0,
        overtimeHours: 0,
        percentUsed: 100,
        isOvertime: true,
      };

      const result = calculateBillingWithSplit(agreement, timebankStatus, 5);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        hours: 5,
        billingType: "overtime",
        hourlyRate: 750,
        amount: 3750,
      });
    });

    it("should handle explicit extra billable hours", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "timebank",
        included_hours: 20,
        hourly_rate: 500,
        overtime_rate: 750,
        status: "active",
        valid_from: "2026-01-01",
      };

      const timebankStatus = {
        includedHours: 20,
        hoursUsed: 10,
        hoursRemaining: 10,
        overtimeHours: 0,
        percentUsed: 50,
        isOvertime: false,
      };

      // Even with 10h remaining, explicit extra = always overtime
      const result = calculateBillingWithSplit(
        agreement,
        timebankStatus,
        5,
        true,
      );

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        hours: 5,
        billingType: "overtime",
        hourlyRate: 750,
        amount: 3750,
      });
    });

    it("should handle fixed agreement without extra billable", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "fixed",
        fixed_amount: 10000,
        hourly_rate: 500,
        status: "active",
        valid_from: "2026-01-01",
      };

      const result = calculateBillingWithSplit(agreement, null, 8);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        hours: 8,
        billingType: "fixed",
        amount: 0, // Fixed price = no hourly billing
      });
    });

    it("should handle fixed agreement with extra billable", () => {
      const agreement: Agreement = {
        id: "1",
        customer_id: "1",
        type: "fixed",
        fixed_amount: 10000,
        hourly_rate: 500,
        status: "active",
        valid_from: "2026-01-01",
      };

      const result = calculateBillingWithSplit(agreement, null, 5, true);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        hours: 5,
        billingType: "hourly",
        hourlyRate: 500,
        amount: 2500,
      });
    });
  });

  describe("isIndexationWarningNeeded", () => {
    it("should return true when indexation in 3 days", () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);

      const result = isIndexationWarningNeeded(inThreeDays.toISOString());

      expect(result).toBe(true);
    });

    it("should return true on indexation date", () => {
      const today = new Date();
      const result = isIndexationWarningNeeded(today.toISOString());

      expect(result).toBe(true);
    });

    it("should return false when indexation > 7 days away", () => {
      const inTenDays = new Date();
      inTenDays.setDate(inTenDays.getDate() + 10);

      const result = isIndexationWarningNeeded(inTenDays.toISOString());

      expect(result).toBe(false);
    });

    it("should return false when indexation in past", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = isIndexationWarningNeeded(yesterday.toISOString());

      expect(result).toBe(false);
    });

    it("should return false when null date", () => {
      const result = isIndexationWarningNeeded(null);

      expect(result).toBe(false);
    });

    it("should respect custom threshold", () => {
      const inEightDays = new Date();
      inEightDays.setDate(inEightDays.getDate() + 8);

      // With default 7-day threshold: false
      expect(isIndexationWarningNeeded(inEightDays.toISOString())).toBe(false);

      // With custom 10-day threshold: true
      expect(isIndexationWarningNeeded(inEightDays.toISOString(), 10)).toBe(
        true,
      );
    });
  });
});
```

### 3.2 Kör testerna

```bash
npm test

# Du bör se något liknande:
# ✓ src/lib/billing-logic.test.ts (12 tests)
#   ✓ calculateTimebankStatus (4)
#   ✓ calculateBillingWithSplit (6)
#   ✓ isIndexationWarningNeeded (6)
```

---

## 4. Andra test: schemas.test.ts (15 minuter)

### 4.1 Skapa `src/lib/schemas.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  customerSchema,
  agreementSchema,
  journalSchema,
  taskSchema,
  contactSchema,
} from "./schemas";

describe("Zod Schemas", () => {
  describe("customerSchema", () => {
    it("should validate customer with required fields", () => {
      const valid = customerSchema.parse({
        name: "Brf Almen",
        status: "active",
      });

      expect(valid.name).toBe("Brf Almen");
      expect(valid.status).toBe("active");
    });

    it("should require name", () => {
      expect(() =>
        customerSchema.parse({
          name: "",
        }),
      ).toThrow();
    });

    it("should validate optional email", () => {
      const valid = customerSchema.parse({
        name: "Kund",
        email: "test@example.com",
      });

      expect(valid.email).toBe("test@example.com");
    });

    it("should reject invalid email", () => {
      expect(() =>
        customerSchema.parse({
          name: "Kund",
          email: "invalid-email",
        }),
      ).toThrow();
    });

    it("should allow empty email string", () => {
      const valid = customerSchema.parse({
        name: "Kund",
        email: "",
      });

      expect(valid.email).toBe("");
    });

    it("should validate customer_type enum", () => {
      const valid = customerSchema.parse({
        name: "Brf",
        customer_type: "brf",
      });

      expect(valid.customer_type).toBe("brf");
    });

    it("should validate optional fields", () => {
      const valid = customerSchema.parse({
        name: "Kund",
        phone: "0701234567",
        address: "Storgatan 1",
        antal_lagenheter: 50,
      });

      expect(valid.phone).toBe("0701234567");
      expect(valid.antal_lagenheter).toBe(50);
    });
  });

  describe("agreementSchema", () => {
    it("should accept hourly agreement", () => {
      const valid = agreementSchema.parse({
        customer_id: "123",
        type: "hourly",
        hourly_rate: 500,
        valid_from: "2026-01-01",
      });

      expect(valid.type).toBe("hourly");
    });

    it("should require included_hours for timebank", () => {
      expect(() =>
        agreementSchema.parse({
          customer_id: "123",
          type: "timebank",
          hourly_rate: 500,
          valid_from: "2026-01-01",
        }),
      ).toThrow();
    });

    it("should require all fields for valid timebank", () => {
      const valid = agreementSchema.parse({
        customer_id: "123",
        type: "timebank",
        hourly_rate: 500,
        overtime_rate: 750,
        included_hours: 20,
        period: "monthly",
        valid_from: "2026-01-01",
      });

      expect(valid.type).toBe("timebank");
      expect(valid.included_hours).toBe(20);
    });

    it("should require fixed_amount and period for fixed agreement", () => {
      expect(() =>
        agreementSchema.parse({
          customer_id: "123",
          type: "fixed",
          hourly_rate: 500,
          valid_from: "2026-01-01",
        }),
      ).toThrow();
    });

    it("should accept valid fixed agreement", () => {
      const valid = agreementSchema.parse({
        customer_id: "123",
        type: "fixed",
        hourly_rate: 500,
        fixed_amount: 10000,
        period: "monthly",
        valid_from: "2026-01-01",
      });

      expect(valid.type).toBe("fixed");
      expect(valid.fixed_amount).toBe(10000);
    });

    it("should require positive rates", () => {
      expect(() =>
        agreementSchema.parse({
          customer_id: "123",
          type: "hourly",
          hourly_rate: -500,
          valid_from: "2026-01-01",
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

    it("should accept content", () => {
      const valid = journalSchema.parse({
        content: "Besök på plats för utredning",
      });

      expect(valid.content).toBe("Besök på plats för utredning");
    });

    it("should accept optional hours >= 0", () => {
      const valid = journalSchema.parse({
        content: "Test",
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

    it("should accept zero hours", () => {
      const valid = journalSchema.parse({
        content: "Anteckning",
        hours: 0,
      });

      expect(valid.hours).toBe(0);
    });

    it("should validate entry_type enum", () => {
      const valid = journalSchema.parse({
        content: "Samtal med ansvarig",
        entry_type: "call",
      });

      expect(valid.entry_type).toBe("call");
    });

    it("should default entry_type to note", () => {
      const valid = journalSchema.parse({
        content: "Anteckning",
      });

      expect(valid.entry_type).toBe("note");
    });

    it("should accept optional billing_comment", () => {
      const valid = journalSchema.parse({
        content: "Test",
        billing_comment: "Avgör för SumX-saken",
      });

      expect(valid.billing_comment).toBe("Avgör för SumX-saken");
    });
  });

  describe("taskSchema", () => {
    it("should require title", () => {
      expect(() =>
        taskSchema.parse({
          title: "",
        }),
      ).toThrow();
    });

    it("should accept basic task", () => {
      const valid = taskSchema.parse({
        title: "Kontakta fastighetschefen",
      });

      expect(valid.title).toBe("Kontakta fastighetschefen");
    });

    it("should accept optional due_date", () => {
      const valid = taskSchema.parse({
        title: "Uppgift",
        due_date: "2026-02-01",
      });

      expect(valid.due_date).toBe("2026-02-01");
    });

    it("should accept customer or assignment link", () => {
      const valid = taskSchema.parse({
        title: "Uppgift",
        customer_id: "123",
        assignment_id: "456",
      });

      expect(valid.customer_id).toBe("123");
      expect(valid.assignment_id).toBe("456");
    });
  });

  describe("contactSchema", () => {
    it("should require name", () => {
      expect(() =>
        contactSchema.parse({
          name: "",
        }),
      ).toThrow();
    });

    it("should accept contact with name", () => {
      const valid = contactSchema.parse({
        name: "Anders Andersson",
      });

      expect(valid.name).toBe("Anders Andersson");
    });

    it("should validate email if provided", () => {
      expect(() =>
        contactSchema.parse({
          name: "Test",
          email: "invalid",
        }),
      ).toThrow();
    });

    it("should accept empty email string", () => {
      const valid = contactSchema.parse({
        name: "Test",
        email: "",
      });

      expect(valid.email).toBe("");
    });
  });
});
```

### 4.2 Kör testerna igen

```bash
npm test

# Bör visa resultat för både files
```

---

## 5. Kör all tests med coverage

```bash
npm run test:coverage

# Bör visa coverage report
```

---

## 6. Nästa steg

✅ **Nu har du:**

- Vitest konfigurerat
- Mock-strategi för Supabase
- 12 enhetstester för billing-logic
- 20+ enhetstester för form validation

📝 **Nästa gånger:**

1. Skapa component tests (TimebankWidget, Forms)
2. Skapa hook integration tests
3. Lägg till fler E2E tests för kritiska flows
4. Implementera CI/CD med test automation

---

## 7. Useful commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npm test -- billing-logic.test.ts

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

---

## 8. Troubleshooting

### Fel: "Cannot find module '@/lib/supabase'"

→ Kontrollera `vitest.config.ts` har rätt `alias` setup

### Fel: "jsdom environment error"

→ `npm install -D jsdom` och starta om

### Fel: "Window is not defined"

→ Kontrollera `vitest.config.ts` har `environment: 'jsdom'`

### Fel: "Mock not working"

→ Se till att mocks definieras FÖRE imports i test

---

**Du är nu redo för Fas 1 av testning! 🚀**
