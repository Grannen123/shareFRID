/**
 * Personal Notes Component
 *
 * Private notes visible only to the note creator.
 * Can be attached to customers, cases, or be standalone.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import {
  StickyNote,
  Plus,
  Edit2,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Loader2,
  Search,
} from "lucide-react";
import {
  Button,
  Textarea,
  Input,
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// Types
interface PersonalNote {
  id: string;
  title: string;
  content: string;
  customerId?: string;
  caseId?: string;
  color: "yellow" | "blue" | "green" | "pink" | "purple";
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLOR_CONFIG = {
  yellow: { bg: "bg-yellow-100", border: "border-yellow-300" },
  blue: { bg: "bg-blue-100", border: "border-blue-300" },
  green: { bg: "bg-green-100", border: "border-green-300" },
  pink: { bg: "bg-pink-100", border: "border-pink-300" },
  purple: { bg: "bg-purple-100", border: "border-purple-300" },
};

interface PersonalNotesProps {
  notes: PersonalNote[];
  customerId?: string;
  caseId?: string;
  onCreateNote: (
    note: Omit<PersonalNote, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onUpdateNote: (id: string, note: Partial<PersonalNote>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  isLoading?: boolean;
  maxHeight?: string;
}

export function PersonalNotes({
  notes,
  customerId,
  caseId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  isLoading = false,
  maxHeight = "400px",
}: PersonalNotesProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PersonalNote>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter notes by search query
  const filteredNotes = notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  });

  // Reset form when closing
  const resetForm = () => {
    setEditForm({});
    setIsEditing(null);
    setIsCreating(false);
  };

  // Start creating new note
  const handleStartCreate = () => {
    setEditForm({
      title: "",
      content: "",
      color: "yellow",
      isPinned: false,
      customerId,
      caseId,
    });
    setIsCreating(true);
    setIsEditing(null);
  };

  // Start editing note
  const handleStartEdit = (note: PersonalNote) => {
    setEditForm({
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.isPinned,
    });
    setIsEditing(note.id);
    setIsCreating(false);
  };

  // Save note (create or update)
  const handleSave = async () => {
    if (!editForm.title?.trim() || !editForm.content?.trim()) return;

    setIsSubmitting(true);
    try {
      if (isCreating) {
        await onCreateNote({
          title: editForm.title!,
          content: editForm.content!,
          color: editForm.color || "yellow",
          isPinned: editForm.isPinned || false,
          customerId,
          caseId,
        });
      } else if (isEditing) {
        await onUpdateNote(isEditing, editForm);
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete note
  const handleDelete = async () => {
    if (!deletingId) return;
    await onDeleteNote(deletingId);
    setDeletingId(null);
  };

  // Toggle pin
  const handleTogglePin = async (note: PersonalNote) => {
    await onUpdateNote(note.id, { isPinned: !note.isPinned });
  };

  // Sort notes: pinned first, then by date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-gray-600">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <Lock className="h-4 w-4 text-gray-400" />
            Personliga anteckningar
            <Badge variant="secondary" className="text-xs">
              {notes.length}
            </Badge>
          </CollapsibleTrigger>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartCreate}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ny
          </Button>
        </div>

        <CollapsibleContent>
          {/* Search input */}
          {notes.length > 3 && (
            <div className="mt-3 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Sök i anteckningar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
                aria-label="Sök i personliga anteckningar"
              />
            </div>
          )}
          <div
            className="mt-3 space-y-3"
            style={{ maxHeight, overflowY: "auto" }}
          >
            {/* Create form */}
            {isCreating && (
              <NoteForm
                form={editForm}
                onChange={setEditForm}
                onSave={handleSave}
                onCancel={resetForm}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Notes list */}
            {sortedNotes.length === 0 && !isCreating ? (
              <div className="text-center py-6 text-gray-400">
                <StickyNote className="h-8 w-8 mx-auto mb-2" />
                {searchQuery.trim() ? (
                  <>
                    <p className="text-sm">
                      Inga anteckningar matchar "{searchQuery}"
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-1"
                    >
                      Rensa sökning
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm">Inga personliga anteckningar</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleStartCreate}
                      className="mt-1"
                    >
                      Skapa din första
                    </Button>
                  </>
                )}
              </div>
            ) : (
              sortedNotes.map((note) => (
                <div key={note.id}>
                  {isEditing === note.id ? (
                    <NoteForm
                      form={editForm}
                      onChange={setEditForm}
                      onSave={handleSave}
                      onCancel={resetForm}
                      isSubmitting={isSubmitting}
                    />
                  ) : (
                    <NoteCard
                      note={note}
                      onEdit={() => handleStartEdit(note)}
                      onDelete={() => setDeletingId(note.id)}
                      onTogglePin={() => handleTogglePin(note)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera anteckning?</AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras.
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

// Note card component
function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: PersonalNote;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const colorConfig = COLOR_CONFIG[note.color];

  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        colorConfig.bg,
        colorConfig.border,
        note.isPinned && "ring-2 ring-primary-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {note.isPinned && (
              <StickyNote className="h-3 w-3 text-primary-500" />
            )}
            <h4 className="font-medium text-sm">{note.title}</h4>
          </div>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
            {note.content}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {format(parseISO(note.updatedAt), "d MMM HH:mm", { locale: sv })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onTogglePin}
          >
            <StickyNote
              className={cn(
                "h-4 w-4",
                note.isPinned ? "text-primary-500" : "text-gray-400",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Note form component
function NoteForm({
  form,
  onChange,
  onSave,
  onCancel,
  isSubmitting,
}: {
  form: Partial<PersonalNote>;
  onChange: (form: Partial<PersonalNote>) => void;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const colorConfig = COLOR_CONFIG[form.color || "yellow"];

  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        colorConfig.bg,
        colorConfig.border,
      )}
    >
      <Input
        value={form.title || ""}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
        placeholder="Titel..."
        className="mb-2 bg-white/50"
      />
      <Textarea
        value={form.content || ""}
        onChange={(e) => onChange({ ...form, content: e.target.value })}
        placeholder="Skriv din anteckning..."
        rows={3}
        className="mb-2 bg-white/50"
      />

      {/* Color picker */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Färg:</span>
        {(Object.keys(COLOR_CONFIG) as PersonalNote["color"][]).map((color) => (
          <button
            key={color}
            onClick={() => onChange({ ...form, color })}
            className={cn(
              "w-5 h-5 rounded-full border-2",
              COLOR_CONFIG[color].bg,
              form.color === color
                ? "border-gray-600"
                : "border-transparent hover:border-gray-300",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Avbryt
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Spara
        </Button>
      </div>
    </div>
  );
}
