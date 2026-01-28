import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";
import { registerServiceWorker } from "./lib/serviceWorker";
import "./index.css";

// Register service worker for offline support
registerServiceWorker();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minuter
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes("timeout") || message.includes("aborterror")) {
            return false;
          }
          if (
            message.includes("jwt") ||
            message.includes("unauthorized") ||
            message.includes("permission")
          ) {
            return false;
          }
        }
        return failureCount < 1;
      },
      retryDelay: 1000,
      // Timeout efter 10 sekunder för att undvika oändlig laddning
      networkMode: "always",
    },
    mutations: {
      retry: 0,
      networkMode: "always",
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
