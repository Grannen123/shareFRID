/**
 * AI Service for Grannfrid CRM
 *
 * This module provides AI capabilities using Claude for complex tasks
 * and Gemini Flash for bulk operations.
 *
 * Note: In production, API calls should go through a backend proxy
 * to protect API keys. This implementation is for development/demo purposes.
 */

import type { ChatMessage, Customer, Case, KnowledgeArticle } from "@/types";

// API Configuration
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

// System prompt for Grannfrid assistant
const SYSTEM_PROMPT = `Du är Grannfrids AI-assistent, en hjälpsam och professionell assistent för bostadskonsulter i Sverige.

Du hjälper användare med:
- Störningsärenden och hur de ska hanteras
- Juridiska frågor kring andrahandsuthyrning, störningar, och uppsägning
- Skriva mallar och brev
- Sammanfatta ärenden och journalanteckningar
- Beräkna timbank och fakturering
- Hitta information i kunskapsbanken

Svara alltid på svenska. Var professionell men vänlig. När du refererar till juridik, hänvisa till relevant lagstiftning (hyreslagen, bostadsrättslagen, etc.).

Om du inte är säker på något, säg det tydligt och föreslå att användaren konsulterar en jurist.`;

// Claude API types
interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

// Gemini API types
interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: GeminiPart[];
    };
  }>;
}

/**
 * Send a message to Claude and get a response
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
  if (!ANTHROPIC_API_KEY) {
    return "AI-funktionen är inte konfigurerad. Lägg till VITE_ANTHROPIC_API_KEY i miljövariabler.";
  }

  // Build context string
  let contextString = "";
  if (context?.customer) {
    contextString += `\n\nAktuell kund: ${context.customer.name} (${context.customer.fortnoxNumber})`;
  }
  if (context?.caseData) {
    contextString += `\n\nAktuellt ärende: ${context.caseData.caseNumber} - ${context.caseData.title}`;
    if (context.caseData.description) {
      contextString += `\nBeskrivning: ${context.caseData.description}`;
    }
  }
  if (context?.knowledgeArticles && context.knowledgeArticles.length > 0) {
    contextString += "\n\nRelevant kunskap från kunskapsbanken:";
    context.knowledgeArticles.forEach((article) => {
      contextString += `\n\n### ${article.title}\n${article.content}`;
    });
  }

  const systemPrompt = SYSTEM_PROMPT + contextString;

  // Convert to Claude format
  const claudeMessages: ClaudeMessage[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: ClaudeResponse = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error("Error calling Claude:", error);
    throw error;
  }
}

/**
 * Send a message to Gemini Flash for bulk/simple operations
 * Used for calculations, simple parsing, and high-volume tasks
 */
export async function sendToGemini(
  prompt: string,
  context?: string,
): Promise<string> {
  if (!GOOGLE_AI_API_KEY) {
    return "Gemini är inte konfigurerat. Lägg till VITE_GOOGLE_AI_API_KEY i miljövariabler.";
  }

  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [{ text: fullPrompt }],
    },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates[0].content.parts[0].text;
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
 * Check if AI services are configured
 */
export function isAIConfigured(): {
  claude: boolean;
  gemini: boolean;
} {
  return {
    claude: !!ANTHROPIC_API_KEY,
    gemini: !!GOOGLE_AI_API_KEY,
  };
}
