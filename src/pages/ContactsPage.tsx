import { AppShell } from "@/components/layout/AppShell";
import { ContactList } from "@/features/contacts/ContactList";

export function ContactsPage() {
  return (
    <AppShell title="Kontakter">
      <ContactList />
    </AppShell>
  );
}
