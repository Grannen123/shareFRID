# Grannfrid - Teknisk Arkitektur

## Översikt

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              KLIENTER                                    │
│                                                                         │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │
│    │   Desktop    │    │    Mobil     │    │   Tablet     │            │
│    │   Browser    │    │   Browser    │    │   Browser    │            │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘            │
│           │                   │                   │                     │
│           └───────────────────┼───────────────────┘                     │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REACT-APPLIKATION                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        UI LAYER                                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │Dashboard│ │ Kunder  │ │ Uppdrag │ │Faktura  │ │   AI    │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      STATE LAYER                                 │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │  React Query    │  │  Auth Context   │  │   UI State      │  │   │
│  │  │  (Server State) │  │  (MSAL)         │  │   (Zustand?)    │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     SERVICE LAYER                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │Graph Client │  │ Claude API  │  │ Gemini API  │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Microsoft 365  │    │   Anthropic     │    │     Google      │
│  Graph API      │    │   Claude API    │    │   Gemini API    │
│                 │    │                 │    │                 │
│  • SharePoint   │    │  • Konversation │    │  • Bulk ops     │
│  • OneDrive     │    │  • Analys       │    │  • Beräkningar  │
│  • Outlook      │    │  • Skrivande    │    │                 │
│  • Calendar     │    │                 │    │                 │
│  • Teams        │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHAREPOINT                                     │
│                                                                         │
│  /Grannfrid                              /Grannfrid AB                  │
│  ├── /Kunder - Göteborg                  ├── /Personal                  │
│  ├── /Kunder - Stockholm                 ├── /Ekonomi                   │
│  ├── /Arbetsyta                          └── /Strategi                  │
│  ├── /Kunskapsbank                                                      │
│  ├── /Intranät                           (Endast ägare)                 │
│  └── /System                                                            │
│                                                                         │
│  Markdown-filer med YAML frontmatter = Databas                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dataflöde

### Läsa data

```
1. Komponent renderas
         │
         ▼
2. useQuery hook anropas
         │
         ▼
3. React Query kollar cache
         │
    ┌────┴────┐
    │ Cache   │ Cache
    │ miss    │ hit
    │         │
    ▼         ▼
4. Graph API  Return
   anropas    cached
         │    data
         ▼
5. SharePoint returnerar
   filinnehåll
         │
         ▼
6. gray-matter parsar
   frontmatter + content
         │
         ▼
7. Data cachas och
   returneras till
   komponent
```

### Skriva data

```
1. Användare submittar form
         │
         ▼
2. Zod validerar input
         │
         ▼
3. useMutation anropas
         │
         ▼
4. Formatera till markdown
   (frontmatter + content)
         │
         ▼
5. Graph API updaterar fil
         │
         ▼
6. Invalidera relevanta
   React Query caches
         │
         ▼
7. UI uppdateras automatiskt
```

---

## Nyckelkomponenter

### Graph Client

```typescript
// src/lib/graph-client.ts

import { Client } from "@microsoft/microsoft-graph-client";

class GraphClient {
  private client: Client;
  private siteId: string;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  // Läs fil
  async getFile(path: string): Promise<string> {
    const response = await this.client
      .api(`/sites/${this.siteId}/drive/root:${path}:/content`)
      .get();
    return response;
  }

  // Skriv fil
  async updateFile(path: string, content: string): Promise<void> {
    await this.client
      .api(`/sites/${this.siteId}/drive/root:${path}:/content`)
      .put(content);
  }

  // Lista filer i mapp
  async listFolder(path: string): Promise<DriveItem[]> {
    const response = await this.client
      .api(`/sites/${this.siteId}/drive/root:${path}:/children`)
      .get();
    return response.value;
  }

  // Skapa mapp
  async createFolder(parentPath: string, name: string): Promise<void> {
    await this.client
      .api(`/sites/${this.siteId}/drive/root:${parentPath}:/children`)
      .post({
        name,
        folder: {},
      });
  }
}
```

### Markdown Parser

```typescript
// src/lib/markdown.ts

import matter from "gray-matter";

interface ParsedMarkdown<T> {
  data: T;
  content: string;
  sections: Record<string, string>;
}

export function parseMarkdown<T>(raw: string): ParsedMarkdown<T> {
  const { data, content } = matter(raw);

  // Extrahera sektioner (## Rubrik)
  const sections = extractSections(content);

  return {
    data: data as T,
    content,
    sections,
  };
}

function extractSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const regex = /^## (.+)$/gm;
  let match;
  let lastIndex = 0;
  let lastHeader = "";

  while ((match = regex.exec(content)) !== null) {
    if (lastHeader) {
      sections[lastHeader] = content.slice(lastIndex, match.index).trim();
    }
    lastHeader = match[1].toLowerCase().replace(/\s+/g, "_");
    lastIndex = match.index + match[0].length;
  }

  if (lastHeader) {
    sections[lastHeader] = content.slice(lastIndex).trim();
  }

  return sections;
}

export function stringifyMarkdown<T>(
  data: T,
  sections: Record<string, string>,
): string {
  const content = Object.entries(sections)
    .map(([header, body]) => `## ${formatHeader(header)}\n${body}`)
    .join("\n\n");

  return matter.stringify(content, data);
}
```

### Billing Logic

```typescript
// src/lib/billing-logic.ts

interface TimebankSplit {
  entries: {
    hours: number;
    type: "timebank" | "overtime";
    rate: number;
  }[];
  newBalance: number;
}

export function calculateTimebankSplit(
  hoursToLog: number,
  currentBalance: number,
  timepris: number,
  overtidspris: number,
): TimebankSplit {
  if (hoursToLog <= currentBalance) {
    // Allt ryms i timbanken
    return {
      entries: [{ hours: hoursToLog, type: "timebank", rate: 0 }],
      newBalance: currentBalance - hoursToLog,
    };
  }

  // Behöver splitta
  const timbankHours = currentBalance;
  const overtimeHours = hoursToLog - currentBalance;

  return {
    entries: [
      { hours: timbankHours, type: "timebank", rate: 0 },
      { hours: overtimeHours, type: "overtime", rate: overtidspris },
    ],
    newBalance: 0,
  };
}

export function calculateBillableAmount(
  entries: JournalEntry[],
  agreement: Agreement,
): number {
  return entries.reduce((sum, entry) => {
    if (entry.billingType === "timebank") return sum;
    if (entry.billingType === "overtime") {
      return sum + entry.hours * agreement.overtidspris;
    }
    if (entry.isExtraBillable) {
      return sum + entry.hours * agreement.timpris;
    }
    return sum + entry.hours * agreement.timpris;
  }, 0);
}
```

---

## React Query Patterns

### Query Keys

```typescript
// src/lib/query-keys.ts

export const queryKeys = {
  customers: {
    all: ["customers"] as const,
    list: (workspace?: string) => ["customers", "list", workspace] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    byCustomer: (customerId: string) =>
      ["assignments", "customer", customerId] as const,
    detail: (id: string) => ["assignments", "detail", id] as const,
  },
  // ...
};
```

### Custom Hooks

```typescript
// src/hooks/useCustomers.ts

export function useCustomers(workspace?: string) {
  const graph = useGraphClient();

  return useQuery({
    queryKey: queryKeys.customers.list(workspace),
    queryFn: async () => {
      const folders = await graph.listFolder("/Grannfrid/Kunder - Göteborg");
      // ... parse each kund.md
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useCustomer(path: string) {
  const graph = useGraphClient();

  return useQuery({
    queryKey: queryKeys.customers.detail(path),
    queryFn: async () => {
      const content = await graph.getFile(`${path}/kund.md`);
      return parseCustomer(content);
    },
  });
}

export function useUpdateCustomer() {
  const graph = useGraphClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, data }: UpdateCustomerParams) => {
      const markdown = stringifyCustomer(data);
      await graph.updateFile(`${path}/kund.md`, markdown);
    },
    onSuccess: (_, { path }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(path),
      });
    },
  });
}
```

---

## Auth Flow

```
1. App startar
         │
         ▼
2. MSAL kollar token i cache
         │
    ┌────┴────┐
    │ Ingen   │ Token
    │ token   │ finns
    │         │
    ▼         ▼
3. Redirect   Validera
   till       token
   Microsoft
   login
         │
         ▼
4. User loggar in
         │
         ▼
5. Redirect tillbaka
   med auth code
         │
         ▼
6. MSAL byter code
   mot tokens
         │
         ▼
7. Access token lagras
   i cache
         │
         ▼
8. App renderas med
   autentiserad kontext
```

### MSAL Configuration

```typescript
// src/lib/msal-config.ts

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const graphScopes = [
  "User.Read",
  "Files.ReadWrite.All",
  "Sites.ReadWrite.All",
  "Mail.ReadWrite",
  "Calendars.ReadWrite",
];
```

---

## Error Handling

### API Errors

```typescript
// src/lib/errors.ts

export class GraphError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = "GraphError";
  }
}

export function handleGraphError(error: unknown): never {
  if (error instanceof GraphError) {
    switch (error.code) {
      case "itemNotFound":
        throw new NotFoundError("Filen hittades inte");
      case "accessDenied":
        throw new ForbiddenError("Åtkomst nekad");
      case "invalidRequest":
        throw new ValidationError("Ogiltig begäran");
      default:
        throw error;
    }
  }
  throw error;
}
```

### React Error Boundary

```typescript
// src/components/shared/ErrorBoundary.tsx

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorState
          title="Något gick fel"
          message={error.message}
          onRetry={resetErrorBoundary}
        />
      )}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

---

## Performance Considerations

### Caching Strategy

| Data          | Cache Time | Strategy                      |
| ------------- | ---------- | ----------------------------- |
| Kundlista     | 5 min      | staleTime, background refresh |
| Kunddetalj    | 2 min      | Invalidate on mutation        |
| Uppdragslista | 2 min      | staleTime                     |
| Journal       | 1 min      | Invalidate on add             |
| Kunskapsbank  | 30 min     | Sällan uppdaterad             |

### Lazy Loading

```typescript
// src/App.tsx

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Assignments = lazy(() => import('./pages/Assignments'));
// ...

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kunder/*" element={<Customers />} />
        <Route path="/uppdrag/*" element={<Assignments />} />
      </Routes>
    </Suspense>
  );
}
```

### Optimistic Updates

```typescript
// Exempel: Markera uppgift som klar

const toggleTask = useMutation({
  mutationFn: async (taskId: string) => {
    // ... update in SharePoint
  },
  onMutate: async (taskId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["tasks"] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(["tasks"]);

    // Optimistically update
    queryClient.setQueryData(["tasks"], (old) =>
      old.map((task) =>
        task.id === taskId ? { ...task, status: "done" } : task,
      ),
    );

    return { previous };
  },
  onError: (err, taskId, context) => {
    // Rollback on error
    queryClient.setQueryData(["tasks"], context.previous);
  },
});
```

---

## Security

### Token Storage

- Access tokens lagras i minne (MSAL cache)
- Refresh tokens i localStorage (krypterat av MSAL)
- Inga tokens skickas till egen backend

### Input Validation

All input valideras med Zod innan det skrivs till SharePoint:

```typescript
const customerSchema = z.object({
  fortnoxKundnummer: z.string().min(1),
  namn: z.string().min(1).max(200),
  email: z.string().email().optional(),
  // ...
});

// I mutation
const validated = customerSchema.parse(input);
await graph.updateFile(path, stringify(validated));
```

### Content Security

- SharePoint hanterar behörigheter
- App ärver användarens behörigheter
- Inga egna access control-lager
