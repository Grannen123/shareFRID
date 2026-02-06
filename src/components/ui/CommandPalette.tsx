import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Users,
  Briefcase,
  Clock,
  Plus,
  Search,
  Home,
  CheckSquare,
  Receipt,
  Contact,
  StickyNote,
  BookOpen,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface CommandItemType {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string[];
  action: () => void;
  keywords?: string[];
  group: "navigation" | "actions" | "help";
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runCommand = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  const commands: CommandItemType[] = useMemo(
    () => [
      // Navigation
      {
        id: "home",
        label: "Gå till Dashboard",
        icon: <Home className="h-4 w-4" />,
        shortcut: ["G", "H"],
        action: () => navigate("/"),
        keywords: ["hem", "start", "översikt"],
        group: "navigation",
      },
      {
        id: "customers",
        label: "Gå till Kunder",
        icon: <Users className="h-4 w-4" />,
        shortcut: ["G", "C"],
        action: () => navigate("/customers"),
        keywords: ["klienter", "kontakter"],
        group: "navigation",
      },
      {
        id: "assignments",
        label: "Gå till Uppdrag",
        icon: <Briefcase className="h-4 w-4" />,
        shortcut: ["G", "A"],
        action: () => navigate("/assignments"),
        keywords: ["ärenden", "projekt"],
        group: "navigation",
      },
      {
        id: "tasks",
        label: "Gå till Uppgifter",
        icon: <CheckSquare className="h-4 w-4" />,
        shortcut: ["G", "T"],
        action: () => navigate("/tasks"),
        keywords: ["todo", "att göra"],
        group: "navigation",
      },
      {
        id: "billing",
        label: "Gå till Fakturering",
        icon: <Receipt className="h-4 w-4" />,
        shortcut: ["G", "B"],
        action: () => navigate("/billing"),
        keywords: ["faktura", "debitering", "tid"],
        group: "navigation",
      },
      {
        id: "contacts",
        label: "Gå till Kontakter",
        icon: <Contact className="h-4 w-4" />,
        action: () => navigate("/contacts"),
        keywords: ["person", "telefon", "email"],
        group: "navigation",
      },
      {
        id: "notes",
        label: "Gå till Anteckningar",
        icon: <StickyNote className="h-4 w-4" />,
        action: () => navigate("/notes"),
        keywords: ["notering", "memo"],
        group: "navigation",
      },
      {
        id: "knowledge",
        label: "Gå till Kunskapsbank",
        icon: <BookOpen className="h-4 w-4" />,
        action: () => navigate("/knowledge"),
        keywords: ["artikel", "dokumentation", "hjälp"],
        group: "navigation",
      },

      // Actions
      {
        id: "new-customer",
        label: "Ny kund",
        description: "Gå till kunder och skapa en ny",
        icon: <Plus className="h-4 w-4" />,
        action: () => navigate("/customers?action=create"),
        keywords: ["lägg till", "skapa"],
        group: "actions",
      },
      {
        id: "new-assignment",
        label: "Nytt uppdrag",
        description: "Gå till uppdrag och skapa ett nytt",
        icon: <Plus className="h-4 w-4" />,
        action: () => navigate("/assignments?action=create"),
        keywords: ["lägg till", "skapa", "ärende"],
        group: "actions",
      },
      {
        id: "log-time",
        label: "Registrera tid",
        description: "Gå till uppdrag för att logga tid",
        icon: <Clock className="h-4 w-4" />,
        action: () => navigate("/assignments"),
        keywords: ["timme", "rapport", "tidrapportering"],
        group: "actions",
      },
      {
        id: "new-article",
        label: "Ny artikel",
        description: "Skapa en ny kunskapsartikel",
        icon: <Plus className="h-4 w-4" />,
        action: () => navigate("/knowledge/new"),
        keywords: ["kunskapsbank", "dokumentation"],
        group: "actions",
      },

      // User
      {
        id: "profile",
        label: "Min profil",
        description: "Visa och redigera din profil",
        icon: <User className="h-4 w-4" />,
        shortcut: ["G", "P"],
        action: () => navigate("/profile"),
        keywords: ["inställningar", "konto", "konfiguration"],
        group: "help",
      },
      {
        id: "logout",
        label: "Logga ut",
        icon: <LogOut className="h-4 w-4" />,
        action: () => {
          signOut();
          navigate("/login");
        },
        keywords: ["avsluta", "session"],
        group: "help",
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
      const keywordMatch = cmd.keywords?.some((k) =>
        k.toLowerCase().includes(searchLower),
      );
      return labelMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  // Group filtered commands
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItemType[]> = {
      navigation: [],
      actions: [],
      help: [],
    };
    filteredCommands.forEach((cmd) => {
      groups[cmd.group].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flat list for keyboard navigation
  const flatList = useMemo(
    () => [
      ...groupedCommands.navigation,
      ...groupedCommands.actions,
      ...groupedCommands.help,
    ],
    [groupedCommands],
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % flatList.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + flatList.length) % flatList.length);
        break;
      case "Enter":
        e.preventDefault();
        if (flatList[selectedIndex]) {
          runCommand(flatList[selectedIndex].action);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const groupLabels: Record<string, string> = {
    navigation: "Navigering",
    actions: "Åtgärder",
    help: "Hjälp & Inställningar",
  };

  let currentIndex = 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-sand bg-warm-white shadow-[var(--shadow-floating)] data-[state=open]:animate-scale-in"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-sand px-4 py-3">
            <Search className="h-5 w-5 text-ash shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Skriv ett kommando eller sök..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ash"
            />
            <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono bg-sand text-ash rounded">
              esc
            </kbd>
          </div>

          {/* Command List */}
          <div
            ref={listRef}
            className="max-h-[400px] overflow-y-auto p-2"
            role="listbox"
          >
            {flatList.length === 0 ? (
              <div className="py-8 text-center text-sm text-ash">
                Inga resultat hittades.
              </div>
            ) : (
              Object.entries(groupedCommands).map(([group, items]) => {
                if (items.length === 0) return null;

                const groupStartIndex = currentIndex;

                return (
                  <div key={group} className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-ash uppercase tracking-wider">
                      {groupLabels[group]}
                    </div>
                    {items.map((item, i) => {
                      const itemIndex = groupStartIndex + i;
                      const isSelected = itemIndex === selectedIndex;
                      currentIndex++;

                      return (
                        <button
                          key={item.id}
                          data-index={itemIndex}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => runCommand(item.action)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors",
                            isSelected
                              ? "bg-sage/10 text-charcoal"
                              : "text-charcoal hover:bg-sand/50",
                          )}
                        >
                          <span
                            className={cn(
                              "shrink-0",
                              isSelected ? "text-sage" : "text-ash",
                            )}
                          >
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-xs text-ash truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.shortcut && (
                            <div className="flex items-center gap-1 shrink-0">
                              {item.shortcut.map((key, j) => (
                                <kbd
                                  key={j}
                                  className="px-1.5 py-0.5 text-xs font-mono bg-sand rounded text-ash"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-sand px-4 py-2 flex items-center justify-between text-xs text-ash">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-sand rounded font-mono">
                  ↑↓
                </kbd>
                <span>navigera</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-sand rounded font-mono">↵</kbd>
                <span>välj</span>
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-sand rounded font-mono">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-sand rounded font-mono">K</kbd>
              <span>öppna</span>
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Keyboard shortcut hint component for use in header
export function CommandPaletteHint({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-ash bg-sand/50 rounded-[var(--radius-md)] hover:bg-sand transition-colors"
    >
      <Search className="h-4 w-4" />
      <span>Sök...</span>
      <kbd className="ml-2 px-1.5 py-0.5 text-xs font-mono bg-warm-white rounded border border-sand">
        ⌘K
      </kbd>
    </button>
  );
}
