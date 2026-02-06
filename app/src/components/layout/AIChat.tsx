import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  ScrollArea,
  Textarea,
  Avatar,
  AvatarFallback,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAIChat } from "@/hooks";

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
  const { messages, isLoading, error, sendMessage, isConfigured } = useAIChat();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await sendMessage(message);
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
            <p className="text-xs text-gray-500">
              {isConfigured ? "Claude API" : "Ej konfigurerad"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* API Warning */}
      {!isConfigured && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            API-nyckel saknas. Lägg till VITE_ANTHROPIC_API_KEY i .env.local
          </span>
        </div>
      )}

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
                  "rounded-lg px-4 py-2 text-sm max-w-[280px]",
                  message.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-900",
                )}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
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
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
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
