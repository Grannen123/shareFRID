/**
 * Journal List Component
 *
 * Displays journal entries with markdown rendering,
 * time tracking, and billing information.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Clock,
  Phone,
  Mail,
  Users,
  MapPin,
  Settings,
  HelpCircle,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Plus,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { JournalEntryForm } from "./JournalEntryForm";
import { formatMinutes, formatCurrency } from "@/lib/billing-logic";
import { cn } from "@/lib/utils";
import type { JournalEntryFormData } from "@/lib/schemas";

// Entry type icons
const ENTRY_TYPE_CONFIG = {
  samtal: { icon: Phone, label: "Samtal", color: "text-blue-500 bg-blue-50" },
  mail: { icon: Mail, label: "Mail", color: "text-green-500 bg-green-50" },
  mote: { icon: Users, label: "Möte", color: "text-purple-500 bg-purple-50" },
  platsbesok: {
    icon: MapPin,
    label: "Platsbesök",
    color: "text-orange-500 bg-orange-50",
  },
  internt: {
    icon: Settings,
    label: "Internt",
    color: "text-gray-500 bg-gray-50",
  },
  ovrigt: {
    icon: HelpCircle,
    label: "Övrigt",
    color: "text-gray-400 bg-gray-50",
  },
};

const BILLING_TYPE_CONFIG = {
  normal: { label: "Normal", color: "bg-green-100 text-green-800" },
  extra: { label: "Extra", color: "bg-yellow-100 text-yellow-800" },
  intern: { label: "Intern", color: "bg-gray-100 text-gray-600" },
};

interface JournalEntry {
  id: string;
  caseId: string;
  entryDate: string;
  entryType: keyof typeof ENTRY_TYPE_CONFIG;
  minutes: number;
  description: string;
  invoiceText: string | null;
  billingType: keyof typeof BILLING_TYPE_CONFIG;
  consultantId: string | null;
  consultantName?: string;
  billingAmount?: number;
  createdAt: string;
}

interface JournalListProps {
  entries: JournalEntry[];
  caseId: string;
  onCreateEntry: (data: JournalEntryFormData) => Promise<void>;
  onUpdateEntry: (id: string, data: JournalEntryFormData) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
}

export function JournalList({
  entries,
  caseId,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  isLoading = false,
  canEdit = true,
}: JournalListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingEntry) {
      await onDeleteEntry(deletingEntry.id);
      setDeletingEntry(null);
    }
  };

  const handleSubmit = async (data: JournalEntryFormData) => {
    if (editingEntry) {
      await onUpdateEntry(editingEntry.id, data);
      setEditingEntry(null);
    } else {
      await onCreateEntry(data);
    }
    setIsFormOpen(false);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => {
      acc.totalMinutes += entry.minutes;
      acc.billableMinutes += entry.billingType !== "intern" ? entry.minutes : 0;
      acc.billableAmount += entry.billingAmount || 0;
      return acc;
    },
    { totalMinutes: 0, billableMinutes: 0, billableAmount: 0 },
  );

  // Group entries by date
  const entriesByDate = entries.reduce(
    (acc, entry) => {
      const date = entry.entryDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, JournalEntry[]>,
  );

  const sortedDates = Object.keys(entriesByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with totals */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Journalanteckningar</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Totalt: {formatMinutes(totals.totalMinutes)}</span>
            {totals.billableAmount > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <Receipt className="h-4 w-4" />
                <span>{formatCurrency(totals.billableAmount)}</span>
              </>
            )}
          </div>
        </div>

        {canEdit && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ny anteckning
          </Button>
        )}
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Inga journalanteckningar ännu</p>
          {canEdit && (
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Skapa första anteckningen
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                {format(parseISO(date), "EEEE d MMMM yyyy", { locale: sv })}
              </h4>
              <div className="space-y-2">
                {entriesByDate[date].map((entry) => {
                  const typeConfig = ENTRY_TYPE_CONFIG[entry.entryType];
                  const billingConfig = BILLING_TYPE_CONFIG[entry.billingType];
                  const Icon = typeConfig.icon;
                  const isExpanded = expandedEntries.has(entry.id);
                  const isLongDescription = entry.description.length > 200;

                  return (
                    <div
                      key={entry.id}
                      className="bg-white border rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Type icon */}
                        <div
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            typeConfig.color.split(" ")[1],
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              typeConfig.color.split(" ")[0],
                            )}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {typeConfig.label}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {formatMinutes(entry.minutes)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", billingConfig.color)}
                            >
                              {billingConfig.label}
                            </Badge>
                            {entry.consultantName && (
                              <span className="text-xs text-gray-400">
                                {entry.consultantName}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <div
                            className={cn(
                              "text-sm text-gray-700 whitespace-pre-wrap",
                              !isExpanded &&
                                isLongDescription &&
                                "line-clamp-3",
                            )}
                          >
                            {entry.description}
                          </div>

                          {isLongDescription && (
                            <button
                              onClick={() => toggleExpanded(entry.id)}
                              className="text-xs text-primary-600 hover:text-primary-700 mt-1 flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Visa mindre
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Visa mer
                                </>
                              )}
                            </button>
                          )}

                          {/* Invoice text */}
                          {entry.invoiceText && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              <span className="font-medium">Fakturatext:</span>{" "}
                              {entry.invoiceText}
                            </div>
                          )}

                          {/* Billing amount */}
                          {entry.billingAmount !== undefined &&
                            entry.billingAmount > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                Belopp: {formatCurrency(entry.billingAmount)}
                              </div>
                            )}
                        </div>

                        {/* Actions */}
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingEntry(entry)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entry form dialog */}
      <JournalEntryForm
        caseId={caseId}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={
          editingEntry
            ? {
                caseId: editingEntry.caseId,
                entryDate: editingEntry.entryDate,
                entryType: editingEntry.entryType,
                minutes: editingEntry.minutes,
                description: editingEntry.description,
                invoiceText: editingEntry.invoiceText,
                billingType: editingEntry.billingType,
                consultantId: editingEntry.consultantId,
              }
            : undefined
        }
        isEditing={!!editingEntry}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingEntry}
        onOpenChange={() => setDeletingEntry(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Radera journalpost?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera denna journalpost? Denna åtgärd
              kan inte ångras.
              {deletingEntry?.billingAmount &&
                deletingEntry.billingAmount > 0 && (
                  <span className="block mt-2 text-yellow-600">
                    Obs: Denna post har ett faktureringsbelopp på{" "}
                    {formatCurrency(deletingEntry.billingAmount)}.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
