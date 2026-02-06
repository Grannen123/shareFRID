import { useState, useCallback } from "react";
import { sendToClaude, isAIConfigured } from "@/lib/ai";
import type { ChatMessage, Customer, Case, KnowledgeArticle } from "@/types";

interface UseAIChatOptions {
  customer?: Customer;
  caseData?: Case;
  knowledgeArticles?: KnowledgeArticle[];
}

interface UseAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  isConfigured: boolean;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "initial",
  role: "assistant",
  content:
    "Hej! Jag är Grannfrids AI-assistent. Hur kan jag hjälpa dig idag? Du kan fråga mig om kunder, ärenden, avtal eller be mig hjälpa till med att skriva dokument.",
  timestamp: new Date().toISOString(),
};

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { claude: isConfigured } = isAIConfigured();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Get AI response
        const allMessages = [...messages, userMessage];
        const response = await sendToClaude(allMessages, {
          customer: options.customer,
          caseData: options.caseData,
          knowledgeArticles: options.knowledgeArticles,
        });

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Ett fel uppstod vid kommunikation med AI";
        setError(errorMessage);

        // Add error message as assistant response
        const errorAssistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Jag kunde tyvärr inte svara just nu. ${errorMessage}. Försök igen om en stund.`,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorAssistantMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options.customer, options.caseData, options.knowledgeArticles],
  );

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    isConfigured,
  };
}
