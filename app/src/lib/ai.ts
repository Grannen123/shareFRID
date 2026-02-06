/**
 * AI Service for Grannfrid CRM
 *
 * This module provides AI capabilities using Claude for complex tasks
 * and Gemini Flash for bulk operations.
 *
 * All API calls go through Supabase Edge Functions to keep API keys secure.
 */

import type { ChatMessage, Customer, Case, KnowledgeArticle } from "@/types";
import { supabase } from "./supabase";

// Get Supabase URL for Edge Function calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Send a message to Claude via Edge Function proxy
 * Used for complex analysis, writing, and conversation
 */
export async function sendToClaude(
  messages: ChatMessage[],
  context?: {
    customer?: Customer;
    caseData?: Case;
    knowledgeArticles?: KnowledgeArticle[];
  },
): Promise<string> {
  // Get current session for auth token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return "Du måste vara inloggad för att använda AI-funktionen.";
  }

  // Build context for the API
  const apiContext = context
    ? {
        customer: context.customer
          ? {
              name: context.customer.name,
              fortnoxNumber: context.customer.fortnoxNumber,
            }
          : undefined,
        caseData: context.caseData
          ? {
              caseNumber: context.caseData.caseNumber,
              title: context.caseData.title,
              description: context.caseData.description,
            }
          : undefined,
        knowledgeArticles: context.knowledgeArticles?.map((a) => ({
          title: a.title,
          content: a.content,
        })),
      }
    : undefined;

  // Convert messages to API format
  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ai-proxy?provider=claude`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          context: apiContext,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sessionen har gått ut. Logga in igen.");
      }
      if (response.status === 429) {
        throw new Error(
          "För många förfrågningar. Vänta en stund och försök igen.",
        );
      }
      if (response.status === 503) {
        throw new Error(
          "AI-tjänsten är inte konfigurerad. Kontakta administratören.",
        );
      }
      throw new Error(`AI-fel: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Error calling Claude:", error);
    throw error;
  }
}

/**
 * Send a message to Gemini Flash via Edge Function proxy
 * Used for calculations, simple parsing, and high-volume tasks
 */
export async function sendToGemini(
  prompt: string,
  context?: string,
): Promise<string> {
  // Get current session for auth token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return "Du måste vara inloggad för att använda AI-funktionen.";
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ai-proxy?provider=gemini`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          context,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sessionen har gått ut. Logga in igen.");
      }
      if (response.status === 429) {
        throw new Error(
          "För många förfrågningar. Vänta en stund och försök igen.",
        );
      }
      if (response.status === 503) {
        throw new Error(
          "Gemini är inte konfigurerad. Kontakta administratören.",
        );
      }
      throw new Error(`AI-fel: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw error;
  }
}

/**
 * Summarize journal entries using Gemini (bulk operation)
 */
export async function summarizeJournalEntries(
  entries: Array<{ date: string; type: string; description: string }>,
): Promise<string> {
  const entriesText = entries
    .map((e) => `${e.date} (${e.type}): ${e.description}`)
    .join("\n");

  const prompt = `Sammanfatta följande journalanteckningar kortfattat på svenska. Lyft fram de viktigaste händelserna och eventuella mönster:\n\n${entriesText}`;

  return sendToGemini(prompt);
}

/**
 * Generate invoice text from journal description
 */
export async function generateInvoiceText(
  description: string,
  caseTitle: string,
): Promise<string> {
  const prompt = `Skapa en kort och professionell fakturatext (max 100 tecken) baserat på följande journalanteckning för ärende "${caseTitle}":\n\n${description}`;

  return sendToGemini(prompt);
}

/**
 * Search knowledge base and return relevant articles
 * This is a simple implementation - in production, use vector search
 */
export function searchKnowledgeBase(
  query: string,
  articles: KnowledgeArticle[],
): KnowledgeArticle[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  return articles
    .filter((article) => {
      const titleLower = article.title.toLowerCase();
      const contentLower = article.content.toLowerCase();
      const tagsLower = article.tags.map((t) => t.toLowerCase());

      // Check if any query word matches
      return queryWords.some(
        (word) =>
          titleLower.includes(word) ||
          contentLower.includes(word) ||
          tagsLower.some((tag) => tag.includes(word)),
      );
    })
    .slice(0, 3); // Return top 3 matches
}

/**
 * Check if user is authenticated (required for AI features)
 */
export async function isAIAvailable(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session?.access_token;
}

/**
 * Legacy function for compatibility - now returns auth status
 */
export function isAIConfigured(): { claude: boolean; gemini: boolean } {
  // AI is available if Supabase is configured
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;
  return {
    claude: hasSupabase,
    gemini: hasSupabase,
  };
}
