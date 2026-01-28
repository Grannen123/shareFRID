import { X, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
}

export interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
  itemLabel?: string;
  itemLabelPlural?: string;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClear,
  className,
  itemLabel = "objekt",
  itemLabelPlural = "objekt",
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const label = selectedCount === 1 ? itemLabel : itemLabelPlural;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3",
        "bg-sage-50 border border-sage/20 rounded-[var(--radius-lg)]",
        "animate-scale-in",
        className,
      )}
    >
      {/* Selection info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-sage/10 transition-colors"
          aria-label="Avmarkera alla"
        >
          <X className="h-4 w-4 text-sage" />
        </button>
        <span className="text-sm font-medium text-charcoal">
          {selectedCount} {label} markerade
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
              loading={action.loading}
              disabled={action.disabled}
              leftIcon={Icon && <Icon className="h-4 w-4" />}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// Hook for managing bulk selection state
import { useState, useCallback, useMemo, useEffect } from "react";

export interface UseBulkSelectOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  /** Enable keyboard shortcuts (Cmd+A to select all, Escape to clear) */
  enableKeyboardShortcuts?: boolean;
}

export interface UseBulkSelectReturn<T> {
  selectedIds: Set<string>;
  selectedItems: T[];
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectRange: (fromId: string, toId: string) => void;
}

export function useBulkSelect<T>({
  items,
  getItemId,
  enableKeyboardShortcuts = true,
}: UseBulkSelectOptions<T>): UseBulkSelectReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Listen for keyboard shortcut events
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleSelectAll = () => {
      setSelectedIds(new Set(items.map(getItemId)));
    };

    const handleClearSelection = () => {
      setSelectedIds(new Set());
    };

    window.addEventListener("select-all-items", handleSelectAll);
    window.addEventListener("clear-selection", handleClearSelection);

    return () => {
      window.removeEventListener("select-all-items", handleSelectAll);
      window.removeEventListener("clear-selection", handleClearSelection);
    };
  }, [items, getItemId, enableKeyboardShortcuts]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId],
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const isAllSelected = useMemo(
    () =>
      items.length > 0 &&
      items.every((item) => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId],
  );

  const isIndeterminate = useMemo(
    () => selectedIds.size > 0 && !isAllSelected,
    [selectedIds.size, isAllSelected],
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(getItemId)));
    }
  }, [isAllSelected, items, getItemId]);

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback(
    (fromId: string, toId: string) => {
      const ids = items.map(getItemId);
      const fromIndex = ids.indexOf(fromId);
      const toIndex = ids.indexOf(toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          next.add(ids[i]);
        }
        return next;
      });
    },
    [items, getItemId],
  );

  return {
    selectedIds,
    selectedItems,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggle,
    toggleAll,
    select,
    deselect,
    selectAll,
    clearSelection,
    selectRange,
  };
}
