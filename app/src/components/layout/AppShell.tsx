import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AIChat } from "./AIChat";
import { cn } from "@/lib/utils";

interface AppShellProps {
  title?: string;
}

export function AppShell({ title = "Grannfrid" }: AppShellProps) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div
        className={cn(
          "ml-[240px] transition-all duration-300",
          isAIChatOpen && "mr-[400px]",
        )}
      >
        <Header
          title={title}
          onToggleAI={() => setIsAIChatOpen(!isAIChatOpen)}
          showAIButton={!isAIChatOpen}
        />

        <main className="p-6">
          <Outlet />
        </main>
      </div>

      <AIChat isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}
