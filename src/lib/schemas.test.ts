import { describe, it, expect } from "vitest";
import {
  customerSchema,
  agreementSchema,
  assignmentSchema,
  journalSchema,
  taskSchema,
  contactSchema,
  knowledgeArticleSchema,
  profileSchema,
  quickNoteSchema,
  customerNoteSchema,
} from "./schemas";

// ============================================================================
// customerSchema
// ============================================================================

describe("customerSchema", () => {
  it("validerar en giltig kund", () => {
    const result = customerSchema.safeParse({
      name: "Test AB",
      email: "test@example.com",
      customer_type: "brf",
    });
    expect(result.success).toBe(true);
  });

  it("kräver namn", () => {
    const result = customerSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod returnerar detta meddelande när fältet saknas
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("validerar tomt namn", () => {
    const result = customerSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("validerar e-postformat", () => {
    const result = customerSchema.safeParse({
      name: "Test",
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it("tillåter tom e-post", () => {
    const result = customerSchema.safeParse({
      name: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("sätter default status till active", () => {
    const result = customerSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
    }
  });

  it("validerar customer_type enum", () => {
    const result = customerSchema.safeParse({
      name: "Test",
      customer_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("validerar antal_lagenheter som positivt heltal", () => {
    const resultNegative = customerSchema.safeParse({
      name: "Test",
      antal_lagenheter: -5,
    });
    expect(resultNegative.success).toBe(false);

    const resultDecimal = customerSchema.safeParse({
      name: "Test",
      antal_lagenheter: 5.5,
    });
    expect(resultDecimal.success).toBe(false);

    const resultValid = customerSchema.safeParse({
      name: "Test",
      antal_lagenheter: 50,
    });
    expect(resultValid.success).toBe(true);
  });
});

// ============================================================================
// agreementSchema
// ============================================================================

describe("agreementSchema", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("validerar ett giltigt löpande avtal", () => {
    const result = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "hourly",
      hourly_rate: 995,
      valid_from: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("kräver positivt timpris", () => {
    const result = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "hourly",
      hourly_rate: -100,
      valid_from: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("kräver inkluderade timmar för timbank", () => {
    const result = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "timebank",
      hourly_rate: 995,
      valid_from: "2026-01-01",
      // Saknar included_hours, period, overtime_rate
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Timbank kräver");
    }
  });

  it("validerar komplett timbank-avtal", () => {
    const result = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "timebank",
      hourly_rate: 995,
      overtime_rate: 1200,
      included_hours: 60,
      period: "monthly",
      valid_from: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("kräver belopp och period för fastpris", () => {
    const result = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "fixed",
      hourly_rate: 995,
      valid_from: "2026-01-01",
      // Saknar fixed_amount och period
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Fastpris kräver");
    }
  });

  it("validerar komplett fastpris-avtal", () => {
    const result = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "fixed",
      hourly_rate: 995,
      fixed_amount: 15000,
      period: "monthly",
      valid_from: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("validerar billing_month mellan 1-12", () => {
    const resultInvalid = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "hourly",
      hourly_rate: 995,
      valid_from: "2026-01-01",
      billing_month: 13,
    });
    expect(resultInvalid.success).toBe(false);

    const resultValid = agreementSchema.safeParse({
      customer_id: validUuid,
      type: "hourly",
      hourly_rate: 995,
      valid_from: "2026-01-01",
      billing_month: 6,
    });
    expect(resultValid.success).toBe(true);
  });
});

// ============================================================================
// assignmentSchema
// ============================================================================

describe("assignmentSchema", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("validerar ett giltigt uppdrag", () => {
    const result = assignmentSchema.safeParse({
      customer_id: validUuid,
      title: "Störningsärende",
      type: "case",
    });
    expect(result.success).toBe(true);
  });

  it("kräver titel", () => {
    const result = assignmentSchema.safeParse({
      customer_id: validUuid,
      type: "case",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("title");
    }
  });

  it("validerar uppdragstyp", () => {
    const result = assignmentSchema.safeParse({
      customer_id: validUuid,
      title: "Test",
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("sätter default prioritet till medium", () => {
    const result = assignmentSchema.safeParse({
      customer_id: validUuid,
      title: "Test",
      type: "project",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
    }
  });

  it("validerar kategori enum", () => {
    const result = assignmentSchema.safeParse({
      customer_id: validUuid,
      title: "Test",
      type: "case",
      category: "disturbance",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// journalSchema
// ============================================================================

describe("journalSchema", () => {
  it("validerar en giltig journalpost", () => {
    const result = journalSchema.safeParse({
      content: "Telefonsamtal med styrelseordförande",
      hours: 0.5,
      entry_type: "call",
    });
    expect(result.success).toBe(true);
  });

  it("kräver innehåll", () => {
    const result = journalSchema.safeParse({
      hours: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("content");
    }
  });

  it("tillåter 0 timmar", () => {
    const result = journalSchema.safeParse({
      content: "Snabb notering",
      hours: 0,
    });
    expect(result.success).toBe(true);
  });

  it("tillåter inte negativa timmar", () => {
    const result = journalSchema.safeParse({
      content: "Test",
      hours: -1,
    });
    expect(result.success).toBe(false);
  });

  it("sätter default entry_type till note", () => {
    const result = journalSchema.safeParse({
      content: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entry_type).toBe("note");
    }
  });

  it("sätter default is_extra_billable till false", () => {
    const result = journalSchema.safeParse({
      content: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_extra_billable).toBe(false);
    }
  });
});

// ============================================================================
// taskSchema
// ============================================================================

describe("taskSchema", () => {
  it("validerar en giltig uppgift", () => {
    const result = taskSchema.safeParse({
      title: "Ring tillbaka",
    });
    expect(result.success).toBe(true);
  });

  it("kräver titel", () => {
    const result = taskSchema.safeParse({
      description: "Något",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("title");
    }
  });

  it("sätter default prioritet till medium", () => {
    const result = taskSchema.safeParse({
      title: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
    }
  });

  it("validerar UUID-format för customer_id", () => {
    const result = taskSchema.safeParse({
      title: "Test",
      customer_id: "invalid-uuid",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// contactSchema
// ============================================================================

describe("contactSchema", () => {
  it("validerar en giltig kontakt", () => {
    const result = contactSchema.safeParse({
      name: "Anna Andersson",
      email: "anna@example.com",
      phone: "070-123 45 67",
    });
    expect(result.success).toBe(true);
  });

  it("kräver namn", () => {
    const result = contactSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("validerar e-postformat", () => {
    const result = contactSchema.safeParse({
      name: "Test",
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("tillåter tom e-post", () => {
    const result = contactSchema.safeParse({
      name: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("sätter default contact_type till customer", () => {
    const result = contactSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contact_type).toBe("customer");
    }
  });

  it("sätter default is_invoice_recipient till false", () => {
    const result = contactSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_invoice_recipient).toBe(false);
    }
  });
});

// ============================================================================
// knowledgeArticleSchema
// ============================================================================

describe("knowledgeArticleSchema", () => {
  it("validerar en giltig artikel", () => {
    const result = knowledgeArticleSchema.safeParse({
      title: "Störningsärenden - rutiner",
      content: "Vid störningsärenden gäller följande...",
      category: "routine",
    });
    expect(result.success).toBe(true);
  });

  it("kräver titel", () => {
    const result = knowledgeArticleSchema.safeParse({
      content: "Innehåll",
      category: "knowledge",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("title");
    }
  });

  it("kräver innehåll", () => {
    const result = knowledgeArticleSchema.safeParse({
      title: "Titel",
      category: "knowledge",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("content");
    }
  });

  it("validerar kategori enum", () => {
    const result = knowledgeArticleSchema.safeParse({
      title: "Test",
      content: "Test",
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("sätter default is_published till true", () => {
    const result = knowledgeArticleSchema.safeParse({
      title: "Test",
      content: "Test",
      category: "knowledge",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_published).toBe(true);
    }
  });

  it("hanterar tags som array", () => {
    const result = knowledgeArticleSchema.safeParse({
      title: "Test",
      content: "Test",
      category: "knowledge",
      tags: ["juridik", "störning"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["juridik", "störning"]);
    }
  });
});

// ============================================================================
// profileSchema
// ============================================================================

describe("profileSchema", () => {
  it("validerar en giltig profil", () => {
    const result = profileSchema.safeParse({
      name: "Test Konsult",
      title: "Bostadskonsult",
      default_hourly_rate: 995,
    });
    expect(result.success).toBe(true);
  });

  it("kräver namn", () => {
    const result = profileSchema.safeParse({
      title: "Konsult",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("kräver positivt timpris", () => {
    const result = profileSchema.safeParse({
      name: "Test",
      default_hourly_rate: -100,
    });
    expect(result.success).toBe(false);
  });

  it("sätter default notifications_enabled till true", () => {
    const result = profileSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notifications_enabled).toBe(true);
    }
  });
});

// ============================================================================
// quickNoteSchema
// ============================================================================

describe("quickNoteSchema", () => {
  it("validerar en giltig snabbanteckning", () => {
    const result = quickNoteSchema.safeParse({
      content: "Kom ihåg att ringa!",
    });
    expect(result.success).toBe(true);
  });

  it("kräver innehåll", () => {
    const result = quickNoteSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("content");
    }
  });

  it("tillåter optional customer_id", () => {
    const result = quickNoteSchema.safeParse({
      content: "Test",
      customer_id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// customerNoteSchema
// ============================================================================

describe("customerNoteSchema", () => {
  it("validerar en giltig kundanteckning", () => {
    const result = customerNoteSchema.safeParse({
      content: "Viktig information om kunden",
    });
    expect(result.success).toBe(true);
  });

  it("kräver innehåll", () => {
    const result = customerNoteSchema.safeParse({
      is_pinned: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("content");
    }
  });

  it("sätter default is_pinned till false", () => {
    const result = customerNoteSchema.safeParse({
      content: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_pinned).toBe(false);
    }
  });
});
