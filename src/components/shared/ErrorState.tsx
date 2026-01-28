import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: "default" | "network" | "inline";
}

export function ErrorState({
  title = "Något gick fel",
  message = "Ett fel uppstod vid hämtning av data.",
  onRetry,
  isRetrying = false,
  variant = "default",
}: ErrorStateProps) {
  const isNetworkError =
    variant === "network" ||
    message?.toLowerCase().includes("timeout") ||
    message?.toLowerCase().includes("network") ||
    message?.toLowerCase().includes("fetch");

  const Icon = isNetworkError ? WifiOff : AlertTriangle;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-terracotta text-sm py-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="underline hover:no-underline disabled:opacity-50"
          >
            {isRetrying ? "Försöker..." : "Försök igen"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-terracotta/10 p-4 mb-4">
        <Icon className="h-8 w-8 text-terracotta" />
      </div>
      <h3 className="text-lg font-display font-bold text-charcoal mb-2">
        {isNetworkError ? "Anslutningsproblem" : title}
      </h3>
      <p className="text-ash mb-4 max-w-md">
        {isNetworkError
          ? "Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen."
          : message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} disabled={isRetrying} variant="outline">
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Försöker igen..." : "Försök igen"}
        </Button>
      )}
    </div>
  );
}
