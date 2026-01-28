import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-terracotta mb-4" />
          <h2 className="text-xl font-display font-bold text-charcoal mb-2">
            Något gick fel
          </h2>
          <p className="text-ash mb-4 max-w-md">
            Ett oväntat fel uppstod. Försök ladda om sidan.
          </p>
          <Button onClick={() => window.location.reload()}>
            Ladda om sidan
          </Button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-4 text-left text-xs text-terracotta bg-terracotta/10 p-4 rounded-md max-w-2xl overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
