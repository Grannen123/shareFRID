/**
 * Microsoft Authentication Library (MSAL) Configuration
 *
 * This module configures MSAL for Microsoft SSO with Azure AD/Entra ID.
 * It supports integration with Supabase for session management.
 */

import type { Configuration, PopupRequest } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";

// Azure AD Configuration from environment
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || "";
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID || "";
const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin;

// MSAL Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/common",
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL]", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL]", message);
            break;
          case LogLevel.Info:
            if (import.meta.env.DEV) {
              console.info("[MSAL]", message);
            }
            break;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Warning,
    },
  },
};

// Scopes for Microsoft Graph API
export const graphScopes = {
  // Basic profile information
  user: ["User.Read"],
  // Mail access
  mail: ["Mail.Read", "Mail.ReadWrite", "Mail.Send"],
  // Calendar access
  calendar: ["Calendars.Read", "Calendars.ReadWrite"],
  // SharePoint/OneDrive access
  files: [
    "Files.Read.All",
    "Files.ReadWrite.All",
    "Sites.Read.All",
    "Sites.ReadWrite.All",
  ],
  // Combined scopes for full access
  all: [
    "User.Read",
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "Calendars.Read",
    "Calendars.ReadWrite",
    "Files.Read.All",
    "Files.ReadWrite.All",
    "Sites.Read.All",
    "Sites.ReadWrite.All",
  ],
};

// Login request with basic scopes
export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "openid", "profile", "email"],
};

// Request for Microsoft Graph API access
export const graphRequest: PopupRequest = {
  scopes: graphScopes.all,
};

// Check if Microsoft auth is configured
export function isMicrosoftAuthConfigured(): boolean {
  return !!clientId && clientId !== "";
}
