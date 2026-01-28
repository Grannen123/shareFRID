import type {
  AIConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIProviderType,
  AIPromptType,
} from "./types";

/**
 * Skapar en provider baserat på konfiguration.
 * Providers implementerar fetch mot respektive API.
 */
function createProvider(config: AIConfig): AIProvider {
  const { provider, apiKey, baseUrl, model } = config;

  switch (provider) {
    case "openai":
      return createOpenAIProvider(apiKey, model || "gpt-4o-mini", baseUrl);
    case "anthropic":
      return createAnthropicProvider(
        apiKey,
        model || "claude-3-haiku-20240307",
      );
    case "gemini":
      return createGeminiProvider(apiKey, model || "gemini-1.5-flash");
    case "ollama":
      return createOllamaProvider(
        baseUrl || "http://localhost:11434",
        model || "llama3.2",
      );
    case "azure":
      return createAzureProvider(apiKey, baseUrl, model);
    case "custom":
      return createCustomProvider(baseUrl, apiKey, model);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

// OpenAI-compatible provider
function createOpenAIProvider(
  apiKey: string | undefined,
  model: string,
  baseUrl?: string,
): AIProvider {
  const url = baseUrl || "https://api.openai.com/v1";

  return {
    name: "OpenAI",
    async complete(request) {
      const response = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || "",
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    },
  };
}

// Anthropic provider
function createAnthropicProvider(
  apiKey: string | undefined,
  model: string,
): AIProvider {
  return {
    name: "Anthropic",
    async complete(request) {
      const systemMessage = request.messages.find((m) => m.role === "system");
      const userMessages = request.messages.filter((m) => m.role !== "system");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens || 1000,
          system: systemMessage?.content,
          messages: userMessages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${error}`);
      }

      const data = await response.json();
      return {
        content: data.content[0]?.text || "",
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
              totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            }
          : undefined,
      };
    },
  };
}

// Google Gemini provider
function createGeminiProvider(
  apiKey: string | undefined,
  model: string,
): AIProvider {
  return {
    name: "Gemini",
    async complete(request) {
      const contents = request.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const systemInstruction = request.messages.find(
        (m) => m.role === "system",
      );

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: systemInstruction
              ? { parts: [{ text: systemInstruction.content }] }
              : undefined,
            generationConfig: {
              maxOutputTokens: request.maxTokens || 1000,
              temperature: request.temperature ?? 0.7,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
      };
    },
  };
}

// Ollama (local) provider
function createOllamaProvider(baseUrl: string, model: string): AIProvider {
  return {
    name: "Ollama",
    async complete(request) {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: request.messages,
          stream: false,
          options: {
            num_predict: request.maxTokens || 1000,
            temperature: request.temperature ?? 0.7,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      const data = await response.json();
      return {
        content: data.message?.content || "",
        usage: data.eval_count
          ? {
              promptTokens: data.prompt_eval_count || 0,
              completionTokens: data.eval_count,
              totalTokens: (data.prompt_eval_count || 0) + data.eval_count,
            }
          : undefined,
      };
    },
  };
}

// Azure OpenAI provider
function createAzureProvider(
  apiKey: string | undefined,
  baseUrl: string | undefined,
  deployment: string | undefined,
): AIProvider {
  if (!baseUrl || !deployment) {
    throw new Error(
      "Azure requires baseUrl (endpoint) and model (deployment name)",
    );
  }

  return {
    name: "Azure OpenAI",
    async complete(request) {
      const response = await fetch(
        `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey || "",
          },
          body: JSON.stringify({
            messages: request.messages,
            max_tokens: request.maxTokens || 1000,
            temperature: request.temperature ?? 0.7,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure OpenAI API error: ${error}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || "",
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    },
  };
}

// Custom OpenAI-compatible provider
function createCustomProvider(
  baseUrl: string | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): AIProvider {
  if (!baseUrl) {
    throw new Error("Custom provider requires baseUrl");
  }

  return createOpenAIProvider(apiKey, model || "default", baseUrl);
}

/**
 * AI Service - huvudklass för AI-interaktioner
 */
export class AIService {
  private provider: AIProvider;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.provider = createProvider(config);
  }

  /**
   * Skicka en enkel prompt och få svar
   */
  async prompt(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: "system" as const, content: systemPrompt });
    }

    messages.push({ role: "user" as const, content: userMessage });

    const response = await this.complete({ messages });
    return response.content;
  }

  /**
   * Kör ett fördefinierat AI-kommando
   */
  async runCommand(command: AIPromptType, input: string): Promise<string> {
    const { AI_PROMPTS } = await import("./types");
    const systemPrompt = AI_PROMPTS[command];
    return this.prompt(input, systemPrompt);
  }

  /**
   * Full completion request
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    return this.provider.complete({
      ...request,
      maxTokens: request.maxTokens || this.config.defaultMaxTokens,
      temperature: request.temperature ?? this.config.defaultTemperature,
    });
  }

  /**
   * Byt provider dynamiskt
   */
  setProvider(config: AIConfig) {
    this.config = config;
    this.provider = createProvider(config);
  }

  /**
   * Hämta aktuell provider-info
   */
  getProviderInfo() {
    return {
      name: this.provider.name,
      type: this.config.provider,
      model: this.config.model,
    };
  }
}

// Singleton instance med default config (kräver setup)
let defaultService: AIService | null = null;

export function getAIService(): AIService {
  if (!defaultService) {
    throw new Error(
      "AI Service not initialized. Call initAIService() first with your config.",
    );
  }
  return defaultService;
}

export function initAIService(config: AIConfig): AIService {
  defaultService = new AIService(config);
  return defaultService;
}

// Helper för att skapa config från miljövariabler
export function createConfigFromEnv(): AIConfig | null {
  // Kolla efter olika providers i prioritetsordning
  const providers: Array<{
    type: AIProviderType;
    keyEnv: string;
    modelEnv?: string;
  }> = [
    {
      type: "openai",
      keyEnv: "VITE_OPENAI_API_KEY",
      modelEnv: "VITE_OPENAI_MODEL",
    },
    {
      type: "anthropic",
      keyEnv: "VITE_ANTHROPIC_API_KEY",
      modelEnv: "VITE_ANTHROPIC_MODEL",
    },
    {
      type: "gemini",
      keyEnv: "VITE_GEMINI_API_KEY",
      modelEnv: "VITE_GEMINI_MODEL",
    },
  ];

  for (const p of providers) {
    const key = import.meta.env[p.keyEnv];
    if (key) {
      return {
        provider: p.type,
        apiKey: key,
        model: p.modelEnv ? import.meta.env[p.modelEnv] : undefined,
      };
    }
  }

  // Kolla efter Ollama (ingen nyckel behövs)
  const ollamaUrl = import.meta.env.VITE_OLLAMA_URL;
  if (ollamaUrl) {
    return {
      provider: "ollama",
      baseUrl: ollamaUrl,
      model: import.meta.env.VITE_OLLAMA_MODEL,
    };
  }

  return null;
}
