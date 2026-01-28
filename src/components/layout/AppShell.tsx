import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SkipLink } from "./SkipLink";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  backButton?: ReactNode;
}

export function AppShell({ children, title, backButton }: AppShellProps) {
  return (
    <div className="min-h-screen bg-cream">
      <SkipLink />
      <Sidebar />
      <div className="ml-64">
        <Header title={title} backButton={backButton} />
        <main
          id="main-content"
          className="p-6"
          role="main"
          aria-label="Huvudinnehåll"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
