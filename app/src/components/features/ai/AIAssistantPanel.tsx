/**
 * AI Assistant Panel Component
 *
 * A slide-over panel for interacting with the Claude AI assistant.
 * Context-aware based on current customer/case being viewed.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  X,
  Loader2,
  Sparkles,
  FileText,
  Clock,
  Lightbulb,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import {
  Button,
  Textarea,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Message types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

// Context types for AI
interface AIContext {
  customerName?: string;
  customerId?: string;
  caseNumber?: string;
  caseTitle?: string;
  caseType?: string;
  agreementType?: string;
  recentJournalEntries?: string[];
}

// Quick action types
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "summarize",
    label: "Sammanfatta ärendet",
    icon: FileText,
    prompt: "Kan du sammanfatta detta ärende baserat på journalanteckningarna?",
  },
  {
    id: "suggest-next",
    label: "Föreslå nästa steg",
    icon: Lightbulb,
    prompt: "Vad bör jag göra härnäst i detta ärende?",
  },
  {
    id: "draft-letter",
    label: "Skriv utkast till brev",
    icon: FileText,
    prompt: "Kan du hjälpa mig skriva ett formellt brev angående detta ärende?",
  },
  {
    id: "time-estimate",
    label: "Uppskatta tid",
    icon: Clock,
    prompt: "Hur lång tid brukar liknande ärenden ta att hantera?",
  },
];

interface AIAssistantPanelProps {
  context?: AIContext;
  onInsertText?: (text: string) => void;
}

export function AIAssistantPanel({
  context,
  onInsertText,
}: AIAssistantPanelProps) {
  const { getAccessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build system prompt with context
  const buildSystemPrompt = useCallback(() => {
    let prompt = `Du är Grannfrids AI-assistent, en hjälpsam assistent för bostadsjurister och fastighetskonsulter i Sverige.

Du hjälper med:
- Rådgivning kring störningsärenden, andrahandsuthyrning och olovlig användning
- Formulering av brev och meddelanden
- Sammanfattning av ärendehistorik
- Förslag på nästa steg i ärenden
- Juridisk information (generell, ej rådgivning)

Svara alltid på svenska. Var professionell men vänlig. Ge konkreta och praktiska råd.`;

    if (context) {
      prompt += "\n\nAktuell kontext:";
      if (context.customerName) {
        prompt += `\n- Kund: ${context.customerName}`;
      }
      if (context.caseNumber && context.caseTitle) {
        prompt += `\n- Ärende: ${context.caseNumber} - ${context.caseTitle}`;
      }
      if (context.caseType) {
        prompt += `\n- Ärendetyp: ${context.caseType}`;
      }
      if (context.agreementType) {
        prompt += `\n- Avtalstyp: ${context.agreementType}`;
      }
      if (
        context.recentJournalEntries &&
        context.recentJournalEntries.length > 0
      ) {
        prompt += `\n\nSenaste journalanteckningar:\n${context.recentJournalEntries.join("\n")}`;
      }
    }

    return prompt;
  }, [context]);

  // Send message to AI
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Ingen åtkomsttoken");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-proxy?provider=claude`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: buildSystemPrompt(),
            messages: [
              ...messages
                .filter((m) => !m.isLoading)
                .map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
              { role: "user", content: content.trim() },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error("AI-förfrågan misslyckades");
      }

      const data = await response.json();
      const assistantContent =
        data.content?.[0]?.text || "Jag kunde inte generera ett svar.";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: assistantContent, isLoading: false }
            : m,
        ),
      );
    } catch (error) {
      console.error("AI error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: "Ett fel uppstod. Försök igen senare.",
                isLoading: false,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action
  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  // Copy message content
  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Insert text into active field
  const handleInsert = (content: string) => {
    onInsertText?.(content);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
  };

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              AI-assistent
            </SheetTitle>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="text-gray-500"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Context indicator */}
          {context?.caseNumber && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3" />
              <span>
                Kontext: {context.caseNumber}
                {context.customerName && ` (${context.customerName})`}
              </span>
            </div>
          )}
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center text-gray-500 mb-6">
                <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Hej! Hur kan jag hjälpa dig?</p>
                <p className="text-sm mt-1">
                  Ställ en fråga eller välj en snabbåtgärd nedan.
                </p>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className="flex items-center gap-2 p-3 text-left text-sm rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-primary-500 flex-shrink-0" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg p-3",
                      message.role === "user"
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 text-gray-900",
                    )}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Tänker...</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>

                        {/* Actions for assistant messages */}
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                copyToClipboard(message.content, message.id)
                              }
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Kopierat
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Kopiera
                                </>
                              )}
                            </Button>

                            {onInsertText && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleInsert(message.content)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Infoga
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv din fråga..."
              className="resize-none"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Tryck Enter för att skicka, Shift+Enter för ny rad
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
