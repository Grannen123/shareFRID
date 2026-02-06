import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui";
import { AppShell } from "@/components/layout";
import {
  Dashboard,
  Customers,
  Cases,
  Workspace,
  Billing,
  Knowledge,
} from "@/pages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kunder" element={<Customers />} />
              <Route path="/kunder/:id" element={<Customers />} />
              <Route path="/arenden" element={<Cases />} />
              <Route path="/arenden/:id" element={<Cases />} />
              <Route path="/arbetsyta" element={<Workspace />} />
              <Route path="/fakturering" element={<Billing />} />
              <Route path="/kunskapsbank" element={<Knowledge />} />
              <Route path="/intranat" element={<Dashboard />} />
              <Route path="/grannfrid-ab" element={<Dashboard />} />
              <Route path="/installningar" element={<Dashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
