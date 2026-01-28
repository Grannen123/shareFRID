import { useState } from "react";
import { Plus, Pin, Trash2, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  useCustomerNotes,
  useCreateCustomerNote,
  useUpdateCustomerNote,
  useDeleteCustomerNote,
} from "@/hooks/useCustomerNotes";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import type { CustomerNote } from "@/types/database";

interface CustomerNotesTabProps {
  customerId: string;
}

export function CustomerNotesTab({ customerId }: CustomerNotesTabProps) {
  const { data: notes, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateCustomerNote();
  const updateNote = useUpdateCustomerNote();
  const deleteNote = useDeleteCustomerNote();

  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomerNote | null>(null);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    await createNote.mutateAsync({
      customer_id: customerId,
      content: newNoteContent.trim(),
      is_pinned: false,
    });

    setNewNoteContent("");
    setIsAdding(false);
  };

  const handleTogglePin = async (note: CustomerNote) => {
    await updateNote.mutateAsync({
      id: note.id,
      is_pinned: !note.is_pinned,
    });
  };

  const handleDeleteNote = async () => {
    if (deleteConfirm) {
      await deleteNote.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Sortera: pinnande först, sedan efter datum
  const sortedNotes = [...(notes || [])].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-ash">Laddar anteckningar...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Anteckningar</CardTitle>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny anteckning
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-2 p-4 border border-sand rounded-lg bg-warm-white">
            <Textarea
              placeholder="Skriv din anteckning här..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewNoteContent("");
                }}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || createNote.isPending}
              >
                {createNote.isPending ? "Sparar..." : "Spara"}
              </Button>
            </div>
          </div>
        )}

        {sortedNotes.length === 0 ? (
          <EmptyState
            title="Inga anteckningar"
            description="Lägg till en anteckning för att komma igång"
          />
        ) : (
          <div className="space-y-3">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-lg border ${
                  note.is_pinned
                    ? "border-sage/30 bg-sage/5"
                    : "border-sand bg-warm-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {note.is_pinned && (
                      <div className="flex items-center gap-1 text-sage text-xs mb-2">
                        <Pin className="h-3 w-3" />
                        Fastnålad
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-xs text-ash mt-2">
                      {formatDistanceToNow(new Date(note.created_at), {
                        addSuffix: true,
                        locale: sv,
                      })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTogglePin(note)}>
                        <Pin className="mr-2 h-4 w-4" />
                        {note.is_pinned ? "Ta bort fastnålning" : "Fastnåla"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(note)}
                        className="text-terracotta focus:text-terracotta"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort anteckning"
        description="Är du säker på att du vill ta bort denna anteckning? Detta kan inte ångras."
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDeleteNote}
        isLoading={deleteNote.isPending}
      />
    </Card>
  );
}
