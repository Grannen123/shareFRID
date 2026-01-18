# Claude Code Configuration for Grannfrid

## Project-specific Settings

This directory contains Claude Code configuration for the Grannfrid project.

### Files

| File | Purpose |
|------|---------|
| `settings.json` | Permissions and hooks |
| `hooks/session-start.sh` | Install dependencies on session start |

---

## Required MCP Servers

For full functionality, configure these MCP servers:

### Microsoft Graph MCP (Required)

Enables SharePoint, Outlook, and Calendar access.

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

See `docs/MCP-SETUP.md` for detailed setup instructions.

---

## Recommended Skills

These skills would enhance development:

| Skill | Purpose | Status |
|-------|---------|--------|
| `session-start-hook` | Auto-install dependencies | ✅ Configured |
| `commit` | Smart git commits | Built-in |
| `review-pr` | PR review assistance | Built-in |

---

## Hooks

### SessionStart

Runs when a new session starts. Currently:
- Installs npm dependencies (if package.json exists)
- Only runs in remote/web environment

### Stop (Global)

The global stop hook ensures all changes are committed and pushed before ending a session.

---

## Environment Variables

When the React project is set up, you may need:

```bash
# Microsoft Auth
VITE_MICROSOFT_CLIENT_ID=xxx
VITE_MICROSOFT_TENANT_ID=xxx

# SharePoint
VITE_SHAREPOINT_SITE_ID=xxx

# AI APIs
VITE_ANTHROPIC_API_KEY=xxx
VITE_GOOGLE_AI_API_KEY=xxx
```

These go in `.env.local` (not committed to git).
