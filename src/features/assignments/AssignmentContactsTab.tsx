import { useState } from "react";
import {
  Plus,
  Mail,
  Phone,
  MoreHorizontal,
  Trash2,
  Pencil,
  MapPin,
} from "lucide-react";
import {
  useContactsByAssignment,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from "@/hooks/useContacts";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Contact } from "@/types/database";

interface AssignmentContactsTabProps {
  assignmentId: string;
  customerId: string;
}

interface ContactFormData {
  name: string;
  role: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const defaultFormData: ContactFormData = {
  name: "",
  role: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export function AssignmentContactsTab({
  assignmentId,
  customerId,
}: AssignmentContactsTabProps) {
  const { data: contacts, isLoading } = useContactsByAssignment(assignmentId);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(defaultFormData);

  const handleOpenForm = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        role: contact.role || "",
        email: contact.email || "",
        phone: contact.phone || "",
        address: contact.address || "",
        notes: contact.notes || "",
      });
    } else {
      setEditingContact(null);
      setFormData(defaultFormData);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingContact) {
      await updateContact.mutateAsync({
        id: editingContact.id,
        ...formData,
      });
    } else {
      await createContact.mutateAsync({
        ...formData,
        assignment_id: assignmentId,
        customer_id: customerId,
        contact_type: "assignment",
      });
    }
    handleCloseForm();
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteContact.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-ash">Laddar kontakter...</div>
        </CardContent>
      </Card>
    );
  }

  const sortedContacts = [...(contacts || [])].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Kontakter för uppdraget</CardTitle>
          <Button variant="outline" size="sm" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Ny kontakt
          </Button>
        </CardHeader>
        <CardContent>
          {sortedContacts.length === 0 ? (
            <EmptyState
              title="Inga kontakter"
              description="Lägg till kontaktpersoner för detta uppdrag, t.ex. grannar, vittnen eller berörda parter"
            />
          ) : (
            <div className="space-y-3">
              {sortedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-lg border border-sand bg-warm-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-charcoal">
                          {contact.name}
                        </p>
                      </div>
                      {contact.role && (
                        <p className="text-sm text-ash mb-2">{contact.role}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1 text-sage hover:underline"
                          >
                            <Mail className="h-4 w-4" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-1 text-sage hover:underline"
                          >
                            <Phone className="h-4 w-4" />
                            {contact.phone}
                          </a>
                        )}
                        {contact.address && (
                          <span className="flex items-center gap-1 text-ash">
                            <MapPin className="h-4 w-4" />
                            {contact.address}
                          </span>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-sm text-ash mt-2 line-clamp-2">
                          {contact.notes}
                        </p>
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
                        <DropdownMenuItem
                          onClick={() => handleOpenForm(contact)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(contact)}
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

      {/* Kontaktformulär dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Redigera kontakt" : "Ny kontakt"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Uppdatera kontaktuppgifterna"
                : "Lägg till en kontaktperson kopplad till detta uppdrag"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                Namn *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="För- och efternamn"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                Roll / Beskrivning
              </label>
              <Input
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="T.ex. Granne, Vittne, Boende"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-charcoal block mb-1">
                  E-post
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="namn@exempel.se"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-charcoal block mb-1">
                  Telefon
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="070-123 45 67"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                Adress
              </label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Lägenhetsnummer eller fullständig adress"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">
                Anteckningar
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Övrig information om kontakten..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseForm}>
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name.trim() ||
                createContact.isPending ||
                updateContact.isPending
              }
            >
              {createContact.isPending || updateContact.isPending
                ? "Sparar..."
                : editingContact
                  ? "Spara"
                  : "Lägg till"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bekräfta borttagning */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Ta bort kontakt"
        description={`Är du säker på att du vill ta bort ${deleteConfirm?.name}? Detta kan inte ångras.`}
        variant="danger"
        confirmLabel="Ta bort"
        onConfirm={handleDelete}
        isLoading={deleteContact.isPending}
      />
    </>
  );
}
