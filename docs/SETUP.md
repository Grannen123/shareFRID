# Grannfrid - Installationsguide

## Förutsättningar

- Node.js 20+
- npm 10+
- Microsoft 365-konto med SharePoint-åtkomst
- Azure AD-appregistrering (se nedan)

---

## 1. Klona och installera

```bash
# Klona repot
git clone https://github.com/Grannen123/shareFRID.git
cd shareFRID

# Installera dependencies
npm install
```

---

## 2. Azure AD App Registration

### Skapa app i Azure Portal

1. Gå till [Azure Portal](https://portal.azure.com)
2. Sök efter "App registrations"
3. Klicka "New registration"
4. Fyll i:
   - Name: `Grannfrid`
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `http://localhost:5173` (Web)
5. Klicka "Register"

### Notera följande värden

| Värde     | Var du hittar det                  |
| --------- | ---------------------------------- |
| Client ID | Overview → Application (client) ID |
| Tenant ID | Overview → Directory (tenant) ID   |

### Konfigurera API Permissions

1. Gå till "API permissions"
2. Klicka "Add a permission"
3. Välj "Microsoft Graph"
4. Välj "Delegated permissions"
5. Lägg till:
   - `User.Read`
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
   - `Mail.ReadWrite` (för Outlook-integration)
   - `Calendars.ReadWrite` (för kalender)
6. Klicka "Grant admin consent for [org]"

### Konfigurera Authentication

1. Gå till "Authentication"
2. Under "Single-page application", lägg till:
   - `http://localhost:5173`
   - `https://your-production-domain.com` (senare)
3. Bocka i:
   - Access tokens
   - ID tokens
4. Spara

---

## 3. Miljövariabler

Skapa `.env.local` i projektets rot:

```env
# Microsoft Auth
VITE_MICROSOFT_CLIENT_ID=your-client-id-here
VITE_MICROSOFT_TENANT_ID=your-tenant-id-here

# SharePoint
VITE_SHAREPOINT_SITE_ID=your-site-id-here
VITE_SHAREPOINT_DRIVE_ID=your-drive-id-here

# AI (lägg till när du behöver)
VITE_ANTHROPIC_API_KEY=your-claude-api-key
VITE_GOOGLE_AI_API_KEY=your-gemini-api-key
VITE_OPENAI_API_KEY=your-whisper-api-key
```

### Hitta SharePoint Site ID

Kör detta i webbläsarens konsol när du är på SharePoint-siten:

```javascript
// Gå till: https://yourtenant.sharepoint.com/sites/Grannfrid
// Öppna DevTools (F12) → Console
// Kör:
_spPageContextInfo.siteId;
```

Eller använd Graph Explorer:

1. Gå till [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Logga in
3. Kör: `GET https://graph.microsoft.com/v1.0/sites/root:/sites/Grannfrid`
4. Kopiera `id` från svaret

---

## 4. SharePoint-struktur

Se till att din SharePoint-site har följande mappstruktur:

```
/Grannfrid
├── /Kunder - Göteborg
├── /Kunder - Stockholm
├── /Arbetsyta
├── /Kunskapsbank
├── /Intranät
├── /Mallar
├── /Marknadsföring
├── /Utbildning
├── /Kundvård
├── /Försäljning
└── /System
    └── config.md
```

### Skapa config.md

Skapa filen `/System/config.md` med följande innehåll:

```markdown
---
senaste_arendenummer: 0
senaste_projektnummer: 0
app_version: 1.0.0
---

## Inställningar

- Faktureringsdag: Sista vardagen varje månad
- Standardprioritet: medium
```

---

## 5. Starta utvecklingsserver

```bash
npm run dev
```

Öppna http://localhost:5173

---

## 6. Bygga för produktion

```bash
npm run build
```

Output hamnar i `dist/`-mappen.

### Deploya till Vercel

```bash
npm install -g vercel
vercel
```

Eller koppla GitHub-repot till Vercel för automatisk deploy.

---

## 7. MCP-servrar (för Claude Code)

### Microsoft Graph MCP

För att Claude Code ska kunna interagera med SharePoint, konfigurera MCP:

```json
// ~/.claude/claude_desktop_config.json (eller motsvarande)
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

**OBS:** För MCP behövs en client secret (app registration → Certificates & secrets).

---

## 8. VS Code-tillägg (rekommenderade)

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

---

## 9. Git hooks (Husky)

```bash
# Installera Husky
npm install -D husky lint-staged

# Initiera
npx husky init

# Lägg till pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## Felsökning

### "AADSTS50011: The reply URL specified in the request does not match"

Lägg till rätt redirect URI i Azure AD:

1. Azure Portal → App registrations → Grannfrid
2. Authentication → Add platform → Single-page application
3. Lägg till `http://localhost:5173`

### "Access denied" vid Graph API-anrop

1. Kontrollera att API permissions är beviljade
2. Kontrollera att admin consent är given
3. Logga ut och in igen för att få nya tokens

### "Site not found" vid SharePoint-anrop

1. Verifiera VITE_SHAREPOINT_SITE_ID
2. Kontrollera att användaren har åtkomst till siten
3. Prova Graph Explorer för att testa manuellt

### Långsam utvecklingsserver

```bash
# Rensa cache
rm -rf node_modules/.vite
npm run dev
```
