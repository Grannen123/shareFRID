import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Phone,
  Mail,
  Users,
  MapPin,
  FileText,
  Pin,
  Archive,
  Trash2,
  MoreHorizontal,
  Clock,
  Pencil,
} from "lucide-react";
import {
  useJournalEntries,
  useArchiveJournalEntry,
  useTogglePinJournalEntry,
  useDeleteJournalEntry,
  useUpdateJournalEntry,
} from "@/hooks/useJournal";
import { ENTRY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { JournalEditDialog } from "./JournalEditDialog";
import type { JournalEntryWithAuthor } from "@/types/database";
import type { JournalFormData } from "@/lib/schemas";
import type { TimebankStatus } from "@/lib/billing-logic";
import { useState } from "react";

interface JournalTimelineProps {
  assignmentId: string;
  customerId: string;
  agreement?: {
    id: string;
    type: "hourly" | "timebank" | "fixed";
    hourly_rate: number;
    overtime_rate?: number | null;
    included_hours?: number | null;
  } | null;
  timebankStatus?: TimebankStatus | null;
}

const entryTypeIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  site_visit: MapPin,
  note: FileText,
};

export function JournalTimeline({
  assignmentId,
  customerId,
  agreement,
  timebankStatus,
}: JournalTimelineProps) {
  const { data: entries, isLoading } = useJournalEntries(assignmentId);
  const archiveEntry = useArchiveJournalEntry();
  const togglePin = useTogglePinJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const updateEntry = useUpdateJournalEntry();

  const [archiveConfirm, setArchiveConfirm] =
    useState<JournalEntryWithAuthor | null>(null);
  const [deleteConfirm, setDeleteConfirm] =
    useState<JournalEntryWithAuthor | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntryWithAuthor | null>(
    null,
  );

  if (isLoading) {
    return <div className="text-ash">Laddar journal...</div>;
  }

  // Sortera: pinnande först, sedan efter datum
  const sortedEntries = [...(entries || [])].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleTogglePin = async (entry: JournalEntryWithAuthor) => {
    await togglePin.mutateAsync({
      id: entry.id,
      assignmentId,
      isPinned: !entry.is_pinned,
    });
  };

  const handleArchive = async () => {
    if (archiveConfirm) {
      await archiveEntry.mutateAsync({
        id: archiveConfirm.id,
        assignmentId,
      });
      setArchiveConfirm(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteEntry.mutateAsync({
        id: deleteConfirm.id,
        assignmentId,
      });
      setDeleteConfirm(null);
    }
  };

  const handleUpdate = async (data: JournalFormData) => {
    if (editEntry) {
      await updateEntry.mutateAsync({
        id: editEntry.id,
        assignmentId,
        data,
        agreement: agreement || null,
        timebankStatus: timebankStatus || null,
        customerId,
      });
      setEditEntry(null);
    }
  };

  const hasTimebank = agreement?.type === "timebank";
  const remainingHours = timebankStatus?.hoursRemaining || 0;

  if (sortedEntries.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Ingen journal"
        description="Lägg till din första journalpost ovan"
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {sortedEntries.map((entry) => {
          const Icon = entryTypeIcons[entry.entry_type] || FileText;
          const authorInitials =
            entry.author?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "U";

          return (
            <Card
              key={entry.id}
              className={entry.is_pinned ? "border-sage/30 bg-sage/5" : ""}
            >
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  {/* Icon column */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-sand/50 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-charcoal" />
                    </div>
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {ENTRY_TYPE_LABELS[entry.entry_type]}
                        </Badge>
                        {entry.is_pinned && (
                          <Badge variant="sage" className="text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Fastnålad
                          </Badge>
                        )}
                        {entry.hours && entry.hours > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {entry.hours} tim
                          </Badge>
                        )}
                        {entry.is_extra_billable && (
                          <Badge variant="terracotta" className="text-xs">
                            Extra
                          </Badge>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditEntry(entry)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Redigera
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTogglePin(entry)}
                          >
                            <Pin className="mr-2 h-4 w-4" />
                            {entry.is_pinned
                              ? "Ta bort fastnålning"
                              : "Fastnåla"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setArchiveConfirm(entry)}
                            className="text-terracotta focus:text-terracotta"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Arkivera
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(entry)}
                            className="text-terracotta focus:text-terracotta"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ta bort
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="mt-2 text-sm whitespace-pre-wrap">
                      {entry.content}
                    </p>

                    {entry.billing_comment && (
                      <p className="mt-2 text-xs text-ash italic">
                        Fakturatext: {entry.billing_comment}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-xs text-ash">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={entry.author?.avatar_url || undefined}
                        />
                        <AvatarFallback className="text-[10px]">
                          {authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{entry.author?.name || "Okänd"}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                          locale: sv,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!archiveConfirm}
        onOpenChange={(open) => !open && setArchiveConfirm(null)}
        title="Arkivera journalpost"
        description="Är du säker på att du vill arkivera denna journalpost? Den kommer inte längre visas i tidslinjen."
        variant="danger"
        confirmLabel="Arkivera"
        onConfirm={handleArchive}
        isLoading={archiveEntry.isPending}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort journalpost"
        description="Är du säker på att du vill ta bort denna journalpost? Detta kan inte ångras."
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDelete}
        isLoading={deleteEntry.isPending}
      />

      <JournalEditDialog
        entry={editEntry}
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
        onSubmit={handleUpdate}
        isLoading={updateEntry.isPending}
        hasTimebank={hasTimebank}
        remainingHours={remainingHours}
      />
    </>
  );
}
