import { useState, useRef, useEffect } from "react";
import { X, Send, Mic, MicOff, Paperclip, Sparkles } from "lucide-react";
import {
  Button,
  ScrollArea,
  Textarea,
  Avatar,
  AvatarFallback,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hej! Jag är Grannfrids AI-assistent. Hur kan jag hjälpa dig idag? Du kan fråga mig om kunder, ärenden, avtal eller be mig hjälpa till med att skriva dokument.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Jag förstår. Låt mig hjälpa dig med det. (Detta är en simulerad respons - AI-integrationen kommer att implementeras med Claude och Gemini API:er.)",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement Whisper-based voice recording
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col border-l border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
            <Sparkles className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              AI-assistent
            </h2>
            <p className="text-xs text-gray-500">Alltid redo att hjälpa</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    message.role === "user"
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  {message.role === "user" ? "Du" : "AI"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-900",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gray-100 text-gray-600">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg bg-gray-100 px-4 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5 text-gray-500" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv ett meddelande..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRecording}
            className={cn(
              "shrink-0",
              isRecording && "bg-red-100 text-red-600 hover:bg-red-200",
            )}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5 text-gray-500" />
            )}
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Tryck Enter för att skicka, Shift+Enter för ny rad
        </p>
      </div>
    </div>
  );
}
