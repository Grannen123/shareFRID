import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Receipt,
  BookOpen,
  Contact,
  StickyNote,
  User,
  Search,
  Plus,
  LogOut,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: "navigation" | "action" | "user";
  keywords?: string[];
}

export function CommandCenter() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Define all commands
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "dashboard",
        label: "Dashboard",
        description: "Gå till startsidan",
        icon: LayoutDashboard,
        action: () => navigate("/"),
        category: "navigation",
        keywords: ["hem", "start", "översikt"],
      },
      {
        id: "customers",
        label: "Kunder",
        description: "Visa kundlistan",
        icon: Users,
        action: () => navigate("/customers"),
        category: "navigation",
        keywords: ["klient", "bolag", "företag"],
      },
      {
        id: "assignments",
        label: "Uppdrag",
        description: "Visa uppdragslistan",
        icon: FolderKanban,
        action: () => navigate("/assignments"),
        category: "navigation",
        keywords: ["ärende", "case", "projekt"],
      },
      {
        id: "tasks",
        label: "Uppgifter",
        description: "Visa uppgiftslistan",
        icon: CheckSquare,
        action: () => navigate("/tasks"),
        category: "navigation",
        keywords: ["todo", "att göra"],
      },
      {
        id: "billing",
        label: "Fakturering",
        description: "Visa fakturaunderlag",
        icon: Receipt,
        action: () => navigate("/billing"),
        category: "navigation",
        keywords: ["faktura", "debitering", "tid"],
      },
      {
        id: "contacts",
        label: "Kontakter",
        description: "Visa kontaktlistan",
        icon: Contact,
        action: () => navigate("/contacts"),
        category: "navigation",
        keywords: ["person", "telefon", "email"],
      },
      {
        id: "notes",
        label: "Anteckningar",
        description: "Visa anteckningsboken",
        icon: StickyNote,
        action: () => navigate("/notes"),
        category: "navigation",
        keywords: ["notering", "memo"],
      },
      {
        id: "knowledge",
        label: "Kunskapsbank",
        description: "Visa kunskapsartiklar",
        icon: BookOpen,
        action: () => navigate("/knowledge"),
        category: "navigation",
        keywords: ["artikel", "dokumentation", "hjälp"],
      },
      // Actions
      {
        id: "new-customer",
        label: "Ny kund",
        description: "Skapa en ny kund",
        icon: Plus,
        action: () => navigate("/customers/new"),
        category: "action",
        keywords: ["skapa", "lägg till"],
      },
      {
        id: "new-assignment",
        label: "Nytt uppdrag",
        description: "Skapa ett nytt uppdrag",
        icon: Plus,
        action: () => navigate("/assignments/new"),
        category: "action",
        keywords: ["skapa", "lägg till"],
      },
      // User
      {
        id: "profile",
        label: "Min profil",
        description: "Visa och redigera din profil",
        icon: User,
        action: () => navigate("/profile"),
        category: "user",
        keywords: ["inställningar", "konto"],
      },
      {
        id: "logout",
        label: "Logga ut",
        description: "Logga ut från systemet",
        icon: LogOut,
        action: () => {
          signOut();
          navigate("/login");
        },
        category: "user",
        keywords: ["avsluta", "ut"],
      },
    ],
    [navigate, signOut],
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some((kw) =>
        kw.toLowerCase().includes(searchLower),
      );
      return labelMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      user: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Navigation within dialog
  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setOpen(false);
            setSearch("");
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          setSearch("");
          break;
      }
    },
    [filteredCommands, selectedIndex],
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const categoryLabels: Record<string, string> = {
    navigation: "Navigera",
    action: "Skapa",
    user: "Användare",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        onKeyDown={handleDialogKeyDown}
      >
        <DialogTitle className="sr-only">Kommandopalett</DialogTitle>

        {/* Search input */}
        <div className="flex items-center border-b border-sand px-4">
          <Search className="h-5 w-5 text-ash" aria-hidden="true" />
          <input
            type="text"
            placeholder="Sök efter kommandon..."
            className="flex-1 py-4 px-3 text-sm bg-transparent outline-none placeholder:text-ash"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            aria-label="Sök kommandon"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-sand bg-cream px-2 text-xs text-ash">
            ESC
          </kbd>
        </div>

        {/* Commands list */}
        <div
          className="max-h-80 overflow-y-auto p-2"
          role="listbox"
          aria-label="Kommandon"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-ash text-sm">
              Inga kommandon hittades
            </div>
          ) : (
            Object.entries(groupedCommands).map(
              ([category, items]) =>
                items.length > 0 && (
                  <div key={category} className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-ash uppercase tracking-wider">
                      {categoryLabels[category]}
                    </div>
                    {items.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = cmd.icon;

                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            setOpen(false);
                            setSearch("");
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                            isSelected
                              ? "bg-sage/10 text-sage-dark"
                              : "text-charcoal hover:bg-sand/50",
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isSelected ? "text-sage" : "text-ash",
                            )}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div className="text-xs text-ash truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ),
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-sand px-4 py-2 flex items-center justify-between text-xs text-ash">
          <div className="flex items-center gap-2">
            <kbd className="inline-flex h-5 items-center rounded border border-sand bg-cream px-1.5">
              ↑
            </kbd>
            <kbd className="inline-flex h-5 items-center rounded border border-sand bg-cream px-1.5">
              ↓
            </kbd>
            <span>navigera</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="inline-flex h-5 items-center rounded border border-sand bg-cream px-1.5">
              ↵
            </kbd>
            <span>välj</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
