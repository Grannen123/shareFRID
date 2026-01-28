import { useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

// Sequence shortcuts like "g c" for "go to customers"
interface SequenceShortcut {
  sequence: string[];
  action: () => void;
  description: string;
}

const SEQUENCE_TIMEOUT = 1000; // 1 second to complete sequence

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const sequenceRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Define single-key shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Cmd/Ctrl shortcuts
    {
      key: "k",
      meta: true,
      action: () => {
        const event = new CustomEvent("open-command-palette");
        window.dispatchEvent(event);
      },
      description: "Öppna kommandopaletten",
    },
    {
      key: "n",
      meta: true,
      shift: true,
      action: () => navigate("/customers/new"),
      description: "Ny kund",
    },
    {
      key: "/",
      action: () => {
        const searchInput = document.querySelector(
          "[data-search-input]",
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: "Fokusera sökning",
    },
    {
      key: "a",
      meta: true,
      action: () => {
        // Dispatch custom event that tables can listen to for select all
        const event = new CustomEvent("select-all-items");
        window.dispatchEvent(event);
      },
      description: "Markera alla",
    },
    {
      key: "Escape",
      action: () => {
        // Dispatch custom event to clear selection
        const event = new CustomEvent("clear-selection");
        window.dispatchEvent(event);
        // Also close any open dialogs
        const closeButton = document.querySelector(
          "[data-radix-dialog-close]",
        ) as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
      },
      description: "Avmarkera / Stäng",
    },
  ];

  // Define sequence shortcuts (vim-style)
  const sequenceShortcuts: SequenceShortcut[] = [
    {
      sequence: ["g", "h"],
      action: () => navigate("/"),
      description: "Gå till Dashboard",
    },
    {
      sequence: ["g", "c"],
      action: () => navigate("/customers"),
      description: "Gå till Kunder",
    },
    {
      sequence: ["g", "a"],
      action: () => navigate("/assignments"),
      description: "Gå till Uppdrag",
    },
    {
      sequence: ["g", "t"],
      action: () => navigate("/time"),
      description: "Gå till Tidrapportering",
    },
    {
      sequence: ["g", "s"],
      action: () => navigate("/settings"),
      description: "Gå till Inställningar",
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Cmd/Ctrl shortcuts even in inputs
      const hasModifier = event.metaKey || event.ctrlKey;

      if (isInput && !hasModifier) {
        return;
      }

      // Check single-key shortcuts first
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta
          ? event.metaKey || event.ctrlKey
          : !event.metaKey && !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }

      // Handle sequence shortcuts
      if (!hasModifier && !isInput) {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Add key to sequence
        sequenceRef.current.push(event.key.toLowerCase());

        // Check if any sequence matches
        for (const seqShortcut of sequenceShortcuts) {
          const currentSeq = sequenceRef.current.join("");
          const targetSeq = seqShortcut.sequence.join("");

          if (currentSeq === targetSeq) {
            event.preventDefault();
            seqShortcut.action();
            sequenceRef.current = [];
            return;
          }

          // If current sequence is a prefix of a target, wait for more keys
          if (targetSeq.startsWith(currentSeq)) {
            timeoutRef.current = setTimeout(() => {
              sequenceRef.current = [];
            }, SEQUENCE_TIMEOUT);
            return;
          }
        }

        // No match found, reset sequence
        sequenceRef.current = [];
      }
    },
    [navigate, shortcuts, sequenceShortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // Return shortcuts for display
  return {
    shortcuts: [
      ...shortcuts.map((s) => ({
        keys: [
          s.meta ? "⌘" : "",
          s.shift ? "⇧" : "",
          s.alt ? "⌥" : "",
          s.key.toUpperCase(),
        ]
          .filter(Boolean)
          .join(" + "),
        description: s.description,
      })),
      ...sequenceShortcuts.map((s) => ({
        keys: s.sequence.join(" → "),
        description: s.description,
      })),
    ],
  };
}

// Export shortcut list for display in help modal
export const KEYBOARD_SHORTCUTS = [
  { keys: "⌘ K", description: "Öppna kommandopaletten" },
  { keys: "⌘ ⇧ N", description: "Ny kund" },
  { keys: "⌘ A", description: "Markera alla" },
  { keys: "/", description: "Fokusera sökning" },
  { keys: "g → h", description: "Gå till Dashboard" },
  { keys: "g → c", description: "Gå till Kunder" },
  { keys: "g → a", description: "Gå till Uppdrag" },
  { keys: "g → t", description: "Gå till Tidrapportering" },
  { keys: "g → s", description: "Gå till Inställningar" },
  { keys: "?", description: "Visa tangentbordsgenvägar" },
  { keys: "Esc", description: "Stäng dialog/modal" },
];
