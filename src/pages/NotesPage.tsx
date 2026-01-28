import { useState } from "react";
import { Plus, StickyNote, Trash2, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  useQuickNotes,
  useCreateQuickNote,
  useDeleteQuickNote,
  useLinkQuickNoteToCustomer,
  useLinkQuickNoteToAssignment,
} from "@/hooks/useQuickNotes";
import { useCustomers } from "@/hooks/useCustomers";
import { useAssignments } from "@/hooks/useAssignments";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { QuickNote } from "@/types/database";

export function NotesPage() {
  const {
    data: notes,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuickNotes();
  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const createNote = useCreateQuickNote();
  const deleteNote = useDeleteQuickNote();
  const linkToCustomer = useLinkQuickNoteToCustomer();
  const linkToAssignment = useLinkQuickNoteToAssignment();

  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<QuickNote | null>(null);
  const [linkingNote, setLinkingNote] = useState<QuickNote | null>(null);
  const [linkMode, setLinkMode] = useState<"customer" | "assignment" | null>(
    null,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [linkTimestamp, setLinkTimestamp] = useState("");

  const filteredNotes = notes?.filter((note) => {
    const searchLower = search.toLowerCase();
    return note.content.toLowerCase().includes(searchLower);
  });

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    await createNote.mutateAsync(newNoteContent.trim());

    setNewNoteContent("");
    setIsAdding(false);
  };

  const handleDeleteNote = async () => {
    if (deleteConfirm) {
      await deleteNote.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleOpenLink = (note: QuickNote, mode: "customer" | "assignment") => {
    setLinkingNote(note);
    setLinkMode(mode);
    setSelectedCustomerId("");
    setSelectedAssignmentId("");
    setLinkTimestamp("");
  };

  const handleCloseLink = () => {
    setLinkingNote(null);
    setLinkMode(null);
    setSelectedCustomerId("");
    setSelectedAssignmentId("");
    setLinkTimestamp("");
  };

  const handleLink = async () => {
    if (!linkingNote || !linkMode) return;

    if (linkMode === "customer" && selectedCustomerId) {
      await linkToCustomer.mutateAsync({
        noteId: linkingNote.id,
        customerId: selectedCustomerId,
        content: linkingNote.content,
      });
      handleCloseLink();
      return;
    }

    if (linkMode === "assignment" && selectedAssignmentId) {
      const createdAt = linkTimestamp
        ? new Date(linkTimestamp).toISOString()
        : undefined;
      await linkToAssignment.mutateAsync({
        noteId: linkingNote.id,
        assignmentId: selectedAssignmentId,
        content: linkingNote.content,
        createdAt,
      });
      handleCloseLink();
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Anteckningar">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="h-6 w-32 bg-sand animate-pulse rounded" />
            <div className="h-10 w-32 bg-sand animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 w-full max-w-sm bg-sand animate-pulse rounded-md" />
            <SkeletonList items={5} />
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Anteckningar">
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Kunde inte hämta anteckningar"
              message={
                error.message || "Ett fel uppstod vid hämtning av anteckningar."
              }
              onRetry={() => refetch()}
              isRetrying={isRefetching}
            />
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Anteckningar">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Anteckningsbok</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny anteckning
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            placeholder="Sök anteckningar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            className="max-w-sm"
          />

          {isAdding && (
            <div className="space-y-3 p-4 border border-sand rounded-lg bg-warm-white">
              <Textarea
                placeholder="Skriv din anteckning här..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
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

          {filteredNotes?.length === 0 ? (
            <EmptyState
              icon={<StickyNote className="h-12 w-12" />}
              title="Inga anteckningar"
              description={
                search
                  ? "Inga anteckningar matchar din sökning"
                  : "Lägg till din första anteckning för att komma igång"
              }
              action={
                !search && (
                  <Button onClick={() => setIsAdding(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ny anteckning
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredNotes?.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border border-sand bg-warm-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="mt-2 text-xs text-ash">
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: sv,
                        })}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Link2 className="h-4 w-4 mr-2" />
                          Koppla
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenLink(note, "customer")}
                        >
                          Koppla till kund
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenLink(note, "assignment")}
                        >
                          Koppla till uppdrag
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
      </Card>

      <Dialog
        open={!!linkingNote && !!linkMode}
        onOpenChange={(open) => !open && handleCloseLink()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koppla anteckning</DialogTitle>
            <DialogDescription>
              {linkMode === "customer"
                ? "Välj kund att koppla anteckningen till."
                : "Välj uppdrag att koppla anteckningen till."}
            </DialogDescription>
          </DialogHeader>

          {linkMode === "customer" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="link_customer">Kund</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger id="link_customer">
                    <SelectValue placeholder="Välj kund" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_number} - {customer.name}
                      </SelectItem>
                    ))}
                    {!customers?.length && (
                      <SelectItem value="__empty" disabled>
                        Inga kunder hittades
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {linkMode === "assignment" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="link_assignment">Uppdrag</Label>
                <Select
                  value={selectedAssignmentId}
                  onValueChange={setSelectedAssignmentId}
                >
                  <SelectTrigger id="link_assignment">
                    <SelectValue placeholder="Välj uppdrag" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments?.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.assignment_number} - {assignment.title} (
                        {assignment.customer?.name || "Okänd kund"})
                      </SelectItem>
                    ))}
                    {!assignments?.length && (
                      <SelectItem value="__empty" disabled>
                        Inga uppdrag hittades
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_time">Tid (valfritt)</Label>
                <Input
                  id="link_time"
                  type="datetime-local"
                  value={linkTimestamp}
                  onChange={(e) => setLinkTimestamp(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={handleCloseLink}>
              Avbryt
            </Button>
            <Button
              onClick={handleLink}
              disabled={
                linkToCustomer.isPending ||
                linkToAssignment.isPending ||
                (linkMode === "customer" && !selectedCustomerId) ||
                (linkMode === "assignment" && !selectedAssignmentId)
              }
            >
              {linkToCustomer.isPending || linkToAssignment.isPending
                ? "Kopplar..."
                : "Koppla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </AppShell>
  );
}
