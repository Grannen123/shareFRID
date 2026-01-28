import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  User,
  Building2,
  MoreHorizontal,
} from "lucide-react";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  ContactWithRelations,
} from "@/hooks/useContacts";
import { ContactForm } from "./ContactForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

const CONTACT_TYPE_LABELS = {
  customer: "Kundkontakt",
  assignment: "Uppdragskontakt",
  standalone: "Fristående",
};

export function ContactList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: contacts,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useContacts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();

  const filteredContacts = contacts?.filter((contact) => {
    const query = searchQuery.toLowerCase();
    const customerName = contact.customer?.name?.toLowerCase() ?? "";
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.phone?.includes(query) ||
      contact.role?.toLowerCase().includes(query) ||
      customerName.includes(query)
    );
  });

  const handleCreate = async (
    data: Parameters<typeof createContact.mutate>[0],
  ) => {
    createContact.mutate(data, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="h-10 w-full max-w-md bg-sand animate-pulse rounded-md" />
          <div className="h-10 w-28 bg-sand animate-pulse rounded-md" />
        </div>
        {/* Contact cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Kunde inte hämta kontakter"
            message={
              error.message || "Ett fel uppstod vid hämtning av kontakter."
            }
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ash" />
          <Input
            placeholder="Sök kontakter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ny kontakt
        </Button>
      </div>

      {filteredContacts?.length === 0 ? (
        <EmptyState
          icon={<User className="h-12 w-12" />}
          title={searchQuery ? "Inga kontakter hittades" : "Inga kontakter"}
          description={
            searchQuery
              ? "Försök med ett annat sökord."
              : "Lägg till din första kontakt för att komma igång."
          }
          action={
            !searchQuery && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till kontakt
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts?.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onDelete={() => deleteContact.mutate(contact.id)}
            />
          ))}
        </div>
      )}

      <ContactForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isLoading={createContact.isPending}
      />
    </div>
  );
}

interface ContactCardProps {
  contact: ContactWithRelations;
  onDelete: () => void;
}

function ContactCard({ contact, onDelete }: ContactCardProps) {
  const typeVariant = {
    customer: "sage",
    assignment: "lavender",
    standalone: "default",
  } as const;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sage/10 flex items-center justify-center">
              <User className="h-5 w-5 text-sage" />
            </div>
            <div>
              <h3 className="font-medium text-charcoal">{contact.name}</h3>
              {contact.role && (
                <p className="text-sm text-ash">{contact.role}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onDelete}
                className="text-terracotta focus:text-terracotta"
              >
                Ta bort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-ash hover:text-sage transition-colors"
            >
              <Mail className="h-4 w-4" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-ash hover:text-sage transition-colors"
            >
              <Phone className="h-4 w-4" />
              {contact.phone}
            </a>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-ash">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{contact.address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-sand">
          <Badge variant={typeVariant[contact.contact_type]}>
            {CONTACT_TYPE_LABELS[contact.contact_type]}
          </Badge>
          {contact.customer && (
            <Link
              to={`/customers/${contact.customer.id}`}
              className="flex items-center gap-1 text-xs text-ash hover:text-sage transition-colors"
            >
              <Building2 className="h-3 w-3" />
              {contact.customer.name}
            </Link>
          )}
          {contact.is_invoice_recipient && (
            <Badge variant="warning">Fakturamottagare</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
