# MCP-servrar för Grannfrid

## Översikt

MCP (Model Context Protocol) gör att Claude kan interagera direkt med externa system. För Grannfrid behövs främst Microsoft Graph MCP för SharePoint-åtkomst.

---

## Nödvändiga MCP-servrar

### 1. Microsoft Graph MCP

**Syfte:** Läsa/skriva filer i SharePoint, Outlook-mail, kalender

**Status:** Krävs för full funktionalitet

#### Installation

```bash
npm install -g @anthropic/microsoft-graph-mcp
```

#### Konfiguration

Lägg till i din Claude-konfiguration:

```json
{
  "mcpServers": {
    "microsoft-graph": {
      "command": "npx",
      "args": ["-y", "@anthropic/microsoft-graph-mcp"],
      "env": {
        "MICROSOFT_TENANT_ID": "your-tenant-id",
        "MICROSOFT_CLIENT_ID": "your-client-id",
        "MICROSOFT_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

#### Azure AD-konfiguration för MCP

MCP kräver en **app registration med client secret** (inte bara client ID):

1. Gå till Azure Portal → App registrations
2. Välj din Grannfrid-app (eller skapa en separat för MCP)
3. Certificates & secrets → New client secret
4. Kopiera secret value (visas bara en gång!)
5. API permissions → Lägg till:
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
   - `Mail.ReadWrite`
   - `Calendars.ReadWrite`
6. Bevilja admin consent

#### Testa

```bash
# I Claude Code
> Kan du lista filerna i /Grannfrid/Kunder - Göteborg?
```

---

### 2. GitHub MCP

**Syfte:** Skapa commits, PRs, läsa kod

**Status:** Redan konfigurerat (via Claude Code)

MCP-servern för GitHub är inbyggd i Claude Code och aktiveras automatiskt när du kopplar ditt GitHub-konto.

---

### 3. Filesystem MCP (valfritt)

**Syfte:** Läsa/skriva lokala filer

**Status:** Inbyggt i Claude Code

---

## Rekommenderade MCP-servrar

### 4. Context7 MCP

**Syfte:** Realtidsdokumentation för React, Radix UI, Microsoft Graph, Tailwind m.m.

**Status:** Rekommenderas för utveckling

#### Konfiguration

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic/context7-mcp"]
    }
  }
}
```

#### Användning

Context7 ger Claude tillgång till aktuell dokumentation utan att behöva web-sökningar:

```
> Hur använder jag Radix Dialog med controlled state?
> Vilka hooks finns i Microsoft Graph React SDK?
```

---

### 5. Sequential Thinking MCP

**Syfte:** Strukturerad problemlösning för komplex arkitektur och affärslogik

**Status:** Rekommenderas för timbank-split och faktureringslogik

#### Konfiguration

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@anthropic/sequential-thinking-mcp"]
    }
  }
}
```

#### Användning

Särskilt användbart för:

- Timbank-split beräkningar
- Faktureringsflöden
- Datamodellering
- Edge cases i affärslogik

---

## Framtida MCP-möjligheter

### Fortnox MCP (finns ej officiellt)

Om du vill ha direkt Fortnox-integration i Claude, behöver du antingen:

1. **Bygga egen MCP-server** för Fortnox API
2. **Använda webhook/automation** via Power Automate

#### Egen Fortnox MCP (skiss)

```typescript
// fortnox-mcp/index.ts
import { Server } from "@modelcontextprotocol/sdk";

const server = new Server({
  name: "fortnox",
  version: "1.0.0",
});

server.addTool({
  name: "create_invoice",
  description: "Create invoice in Fortnox",
  parameters: {
    customerNumber: { type: "string" },
    rows: { type: "array" },
  },
  handler: async ({ customerNumber, rows }) => {
    // Fortnox API call
  },
});
```

### Whisper MCP (för diktering)

Diktering hanteras bäst i frontend (browser API eller Whisper via backend), inte via MCP.

---

## Felsökning

### "MCP server not responding"

1. Kontrollera att servern är installerad: `npm list -g @anthropic/microsoft-graph-mcp`
2. Verifiera miljövariabler
3. Testa manuellt: `npx @anthropic/microsoft-graph-mcp`

### "Access denied" från Graph

1. Kontrollera client secret (de går ut!)
2. Verifiera API permissions
3. Säkerställ admin consent

### "File not found" i SharePoint

1. Kontrollera sökvägen (case-sensitive!)
2. Verifiera att site ID är korrekt
3. Testa i Graph Explorer först

---

## Säkerhetsöverväganden

### Client Secret

- **Exponera aldrig** client secret i kod eller git
- Använd miljövariabler
- Rotera secrets regelbundet (minst årligen)

### Behörigheter

MCP har samma behörigheter som app registration. Begränsa till vad som behövs:

| Permission            | Behövs för       |
| --------------------- | ---------------- |
| `Files.ReadWrite.All` | SharePoint-filer |
| `Sites.ReadWrite.All` | Skapa mappar     |
| `Mail.ReadWrite`      | Outlook (fas 5)  |
| `Calendars.ReadWrite` | Kalender (fas 5) |

### Audit

Microsoft 365 loggar alla Graph API-anrop. Använd Azure AD → Sign-in logs för att övervaka.
