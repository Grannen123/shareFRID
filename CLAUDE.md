# Claude Code Instructions for Grannfrid

## Project Overview

Grannfrid is a CRM/productivity app for housing consultants managing disturbance cases, investigations, and social housing assignments for housing associations (BRF) and property companies in Sweden.

**Architecture:** React frontend + Microsoft Graph API + SharePoint (markdown files as database) + Claude AI

**Language:** Swedish for UI text, comments, and documentation. English for code (variable names, functions).

---

## Key Files

| File                      | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `docs/SPEC-SHAREPOINT.md` | **Primary specification** - All business logic, data models, UI |
| `docs/SPEC-ORIGINAL.md`   | Reference from previous Supabase version                        |
| `docs/ARCHITECTURE.md`    | Technical architecture and patterns                             |
| `docs/ROADMAP.md`         | Development phases and priorities                               |
| `docs/SETUP.md`           | Environment setup instructions                                  |

**Always read `docs/SPEC-SHAREPOINT.md` before making significant changes.**

---

## Business Domain

### Core Entities

| Swedish | English    | Description                             |
| ------- | ---------- | --------------------------------------- |
| Kund    | Customer   | Housing association or property company |
| Uppdrag | Assignment | Case (C-xxx) or Project (P-xxx)         |
| Ärende  | Case       | Disturbance, illegal sublet, etc.       |
| Journal | Journal    | Log entries with time tracking          |
| Avtal   | Agreement  | Contract (hourly/timebank/fixed)        |
| Timbank | Time bank  | Prepaid hours that are drawn down       |
| Faktura | Invoice    | Billing to customer                     |

### Agreement Types (Critical for Billing)

1. **Löpande (hourly)** - All hours billed at hourly rate
2. **Timbank (timebank)** - X hours included, overtime billed separately
3. **Fastpris (fixed)** - Fixed amount, extra work billed separately
4. **Engångsbelopp (onetime)** - One-time fixed price

### Timbank Split Logic

When time exceeds the bank:

```
5h remaining + 8h logged =
  → 5h (timebank, 0 kr)
  → 3h (overtime, 3h × overtime_rate)
```

This split MUST be automatic and update the agreement's `timmar_anvanda` field.

---

## Code Conventions

### TypeScript

```typescript
// Use explicit types, not 'any'
interface Customer {
  fortnoxKundnummer: string;
  namn: string;
  status: "active" | "prospekt" | "vilande";
}

// Use React Query for data fetching
const { data, isLoading } = useQuery({
  queryKey: ["customers"],
  queryFn: fetchCustomers,
});

// Validate with Zod
const customerSchema = z.object({
  fortnoxKundnummer: z.string(),
  namn: z.string().min(1),
});
```

### File Structure

```
src/
├── components/
│   ├── layout/          # AppShell, Sidebar, Header
│   ├── shared/          # Reusable components
│   └── ui/              # Radix-based primitives
├── features/
│   ├── customers/       # Customer module
│   ├── assignments/     # Assignment/case module
│   ├── billing/         # Billing module
│   └── ...
├── hooks/               # Custom hooks
├── lib/
│   ├── graph-client.ts  # Microsoft Graph API client
│   ├── markdown.ts      # Markdown/frontmatter parsing
│   ├── billing-logic.ts # Timbank calculations
│   └── constants.ts     # Swedish labels
├── pages/               # Route components
└── types/               # TypeScript types
```

### Naming

| Type       | Convention            | Example                  |
| ---------- | --------------------- | ------------------------ |
| Components | PascalCase            | `CustomerList.tsx`       |
| Hooks      | camelCase, use-prefix | `useCustomers.ts`        |
| Utils      | camelCase             | `parseMarkdown.ts`       |
| Types      | PascalCase            | `Customer`, `Assignment` |
| Constants  | UPPER_SNAKE           | `CUSTOMER_TYPES`         |

---

## SharePoint/Markdown Patterns

### Reading a customer file

```typescript
import matter from "gray-matter";

async function getCustomer(path: string): Promise<Customer> {
  const content = await graphClient.getFileContent(path);
  const { data, content: markdown } = matter(content);

  return {
    ...data,
    anteckningar: parseAnteckningar(markdown),
    kontakter: parseKontakter(markdown),
  };
}
```

### Writing a journal entry

```typescript
async function addJournalEntry(
  assignmentPath: string,
  entry: JournalEntry,
): Promise<void> {
  const current = await graphClient.getFileContent(assignmentPath);
  const { data, content } = matter(current);

  const newEntry = formatJournalEntry(entry);
  const updated = insertAfterJournalHeader(content, newEntry);

  await graphClient.updateFile(assignmentPath, matter.stringify(updated, data));
}
```

### Journal entry format

```markdown
### 2026-01-18 | Samtal | Peter | 30 min

Anteckningstext här.

### 2026-01-18 | Mail | Peter | 15 min | extra

Extraarbete markerat med "extra" flagga.

> Fakturatext: Text som visas på fakturan
```

---

## AI Integration

### Claude API Usage

```typescript
// For complex tasks: analysis, writing, conversation
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [...],
  system: `Du är Grannfrids AI-assistent...`,
});
```

### Gemini Flash Usage

```typescript
// For bulk operations: calculations, simple parsing
const response = await gemini.generateContent({
  model: 'gemini-2.0-flash',
  contents: [...],
});
```

### Knowledge Base Context

Always include relevant knowledge base content when answering questions:

```typescript
const relevantDocs = await searchKnowledgeBase(query);
const systemPrompt = `
  Du är Grannfrids AI-assistent.

  Använd denna kunskap:
  ${relevantDocs.map((d) => d.content).join("\n\n")}
`;
```

---

## Testing

### Test file naming

- Unit tests: `*.test.ts`
- Component tests: `*.test.tsx`
- E2E tests: `e2e/*.spec.ts`

### What to test

1. **Billing logic** - Critical, must be 100% covered
2. **Markdown parsing** - Frontmatter and content extraction
3. **Timbank split** - All edge cases
4. **Form validation** - Zod schemas

---

## Common Tasks

### Adding a new module

1. Create folder in `src/features/{module}/`
2. Add types to `src/types/`
3. Create hooks in `src/hooks/`
4. Add routes in `src/pages/`
5. Update navigation in `src/components/layout/`

### Adding a new field to an entity

1. Update type definition in `src/types/`
2. Update Zod schema in `src/lib/schemas.ts`
3. Update markdown parsing in relevant feature
4. Update form components
5. Update `docs/SPEC-SHAREPOINT.md`

### Implementing a new API endpoint

This project uses Microsoft Graph API, not a custom backend.

1. Add method to `src/lib/graph-client.ts`
2. Create React Query hook in `src/hooks/`
3. Handle errors appropriately

---

## Important Warnings

### Do NOT

- Use `any` type in TypeScript
- Skip Zod validation on user input
- Hardcode Swedish text (use constants)
- Forget to update timbank balance after time logging
- Create invoices without checking `fakturamottagare`
- Delete data without GDPR consideration

### Always

- Read the spec before implementing features
- Test billing calculations thoroughly
- Handle Graph API errors gracefully
- Show loading states during async operations
- Confirm destructive actions with user

---

## MCP Servers Required

This project benefits from these MCP servers:

| MCP                    | Purpose                       | Required |
| ---------------------- | ----------------------------- | -------- |
| `@microsoft/graph-mcp` | SharePoint, Outlook, Calendar | Yes      |
| `github`               | Repository operations         | Yes      |
| `filesystem`           | Local file operations         | Optional |

### Setting up Microsoft Graph MCP

```json
{
  "mcpServers": {
    "microsoft-graph": {
      "command": "npx",
      "args": ["-y", "@microsoft/graph-mcp"],
      "env": {
        "MICROSOFT_TENANT_ID": "your-tenant-id",
        "MICROSOFT_CLIENT_ID": "your-client-id",
        "MICROSOFT_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

---

## Quick Reference

### Swedish Labels (for consistency)

```typescript
export const LABELS = {
  customer: "Kund",
  assignment: "Uppdrag",
  case: "Ärende",
  project: "Projekt",
  journal: "Journal",
  agreement: "Avtal",
  invoice: "Faktura",
  timebank: "Timbank",
  overtime: "Övertid",
  // ... see src/lib/constants.ts
};
```

### Status Values

```typescript
// Customer status
type CustomerStatus = "active" | "prospekt" | "vilande";

// Assignment status
type AssignmentStatus = "active" | "paused" | "closed";

// Task status
type TaskStatus = "pending" | "in_progress" | "done";
```

### Priority Values

```typescript
type Priority = "low" | "medium" | "high";
```
