/**
 * Keyboard Shortcuts Hook
 *
 * Provides global and local keyboard shortcut handling.
 */

import { useEffect, useCallback } from "react";

type ModifierKey = "ctrl" | "alt" | "shift" | "meta";
type KeyCombo = {
  key: string;
  modifiers?: ModifierKey[];
};

interface ShortcutConfig {
  combo: KeyCombo;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Check if the event matches the key combo
 */
function matchesCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const { key, modifiers = [] } = combo;

  // Check the key (case-insensitive)
  if (event.key.toLowerCase() !== key.toLowerCase()) {
    return false;
  }

  // Check modifiers
  const hasCtrl = modifiers.includes("ctrl");
  const hasAlt = modifiers.includes("alt");
  const hasShift = modifiers.includes("shift");
  const hasMeta = modifiers.includes("meta");

  // Use metaKey for Mac (Cmd) and ctrlKey for Windows (Ctrl)
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  if (hasCtrl && !ctrlOrMeta) return false;
  if (hasMeta && !event.metaKey) return false;
  if (hasAlt && !event.altKey) return false;
  if (hasShift && !event.shiftKey) return false;

  // Make sure no extra modifiers are pressed (unless they're required)
  if (!hasCtrl && !hasMeta && ctrlOrMeta) return false;
  if (!hasAlt && event.altKey) return false;
  if (!hasShift && event.shiftKey) return false;

  return true;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcut(
  shortcuts: ShortcutConfig | ShortcutConfig[],
  deps: React.DependencyList = [],
): void {
  const shortcutsArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcutsArray) {
        const {
          combo,
          handler,
          enabled = true,
          preventDefault = true,
        } = shortcut;

        if (!enabled) continue;

        // For Escape, always allow (even in inputs)
        const isEscape = combo.key.toLowerCase() === "escape";

        // Skip if typing in input (unless it's Escape or has modifiers)
        if (
          isInputElement &&
          !isEscape &&
          (!combo.modifiers || combo.modifiers.length === 0)
        ) {
          continue;
        }

        if (matchesCombo(event, combo)) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler(event);
          break; // Only trigger one shortcut per key press
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shortcutsArray, ...deps],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Common shortcuts helper
 */
export const SHORTCUTS = {
  save: { key: "s", modifiers: ["ctrl"] as ModifierKey[] },
  cancel: { key: "Escape", modifiers: [] as ModifierKey[] },
  submit: { key: "Enter", modifiers: ["ctrl"] as ModifierKey[] },
  new: { key: "n", modifiers: ["ctrl"] as ModifierKey[] },
  search: { key: "k", modifiers: ["ctrl"] as ModifierKey[] },
  help: { key: "?", modifiers: ["shift"] as ModifierKey[] },
} as const;

/**
 * Format shortcut for display
 */
export function formatShortcut(combo: KeyCombo): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const parts: string[] = [];

  if (combo.modifiers?.includes("ctrl") || combo.modifiers?.includes("meta")) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (combo.modifiers?.includes("alt")) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (combo.modifiers?.includes("shift")) {
    parts.push("⇧");
  }

  // Format the key
  let keyDisplay = combo.key;
  if (combo.key === "Escape") keyDisplay = "Esc";
  if (combo.key === "Enter") keyDisplay = "↵";
  if (combo.key === " ") keyDisplay = "Space";

  parts.push(keyDisplay.toUpperCase());

  return parts.join(isMac ? "" : "+");
}
