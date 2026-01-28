/**
 * LLM-agnostisk AI-integration
 *
 * Stödjer valfri LLM-provider genom ett gemensamt interface.
 * Använd konfigurerbar backend för att välja mellan:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude)
 * - Google (Gemini)
 * - Lokala modeller (Ollama, LM Studio)
 * - Azure OpenAI
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  streamComplete?(
    request: AICompletionRequest,
  ): AsyncGenerator<string, void, unknown>;
}

export type AIProviderType =
  | "openai"
  | "anthropic"
  | "gemini"
  | "ollama"
  | "azure"
  | "custom";

export interface AIConfig {
  provider: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

// Predefined prompts for common tasks
export const AI_PROMPTS = {
  cleanupNote: `Du är en assistent som hjälper till att rensa och förbättra anteckningar.
Ta bort överflödig text, förbättra formatering och gör texten mer läsbar.
Behåll all viktig information. Svara ENDAST med den rensade texten, utan förklaringar.`,

  summarizeJournal: `Du är en assistent som sammanfattar journalanteckningar.
Skapa en kort, professionell sammanfattning av händelserna.
Fokusera på: vad som hände, vilka som var involverade, och eventuella åtgärder.
Svara på svenska.`,

  suggestNextSteps: `Du är en erfaren bostadskonsult som hjälper till att planera nästa steg.
Baserat på journalanteckningarna, föreslå konkreta åtgärder.
Svara med en numrerad lista på svenska.`,

  translateToFormal: `Översätt följande text till formell svenska, lämplig för officiell korrespondens.
Behåll all saklig information men gör språket mer professionellt.`,
} as const;

export type AIPromptType = keyof typeof AI_PROMPTS;
