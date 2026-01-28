/**
 * Utility functions för felhantering och användarvisning
 */

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Översätter Supabase-fel till användarvänliga svenska meddelanden
 */
export function translateError(error: Error | SupabaseError): string {
  const message = error.message?.toLowerCase() || "";
  const code = (error as SupabaseError).code?.toLowerCase() || "";

  // Timeout-fel
  if (message.includes("timeout")) {
    return "Anslutningen tog för lång tid. Kontrollera din internetanslutning och försök igen.";
  }

  // Nätverksfel
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    return "Kunde inte ansluta till servern. Kontrollera din internetanslutning.";
  }

  // Autentiseringsfel
  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "Fel e-post eller lösenord.";
  }

  if (code === "email_not_confirmed") {
    return "E-postadressen är inte verifierad. Kolla din inkorg.";
  }

  if (message.includes("jwt") || message.includes("token")) {
    return "Din session har löpt ut. Logga in igen.";
  }

  // RLS/behörighetsfel
  if (
    code === "42501" ||
    message.includes("rls") ||
    message.includes("policy")
  ) {
    return "Du har inte behörighet att utföra denna åtgärd.";
  }

  // Unika constraintfel
  if (code === "23505" || message.includes("duplicate key")) {
    if (message.includes("email")) {
      return "E-postadressen är redan registrerad.";
    }
    if (message.includes("customer_number")) {
      return "Kundnumret finns redan.";
    }
    return "Posten finns redan.";
  }

  // Foreign key-fel
  if (code === "23503" || message.includes("foreign key")) {
    return "Kan inte utföra åtgärden - det finns kopplad data.";
  }

  // Not null-fel
  if (code === "23502" || message.includes("not-null")) {
    return "Ett obligatoriskt fält saknas.";
  }

  // Storage-fel
  if (message.includes("storage") || message.includes("bucket")) {
    if (message.includes("not found")) {
      return "Filen kunde inte hittas.";
    }
    if (message.includes("too large")) {
      return "Filen är för stor.";
    }
    return "Fel vid filhantering.";
  }

  // Generisk fallback - returnera originalmeddelandet
  return error.message || "Ett oväntat fel uppstod. Försök igen.";
}

/**
 * Formaterar ett fel för loggning
 */
export function formatErrorForLog(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }
  return String(error);
}
