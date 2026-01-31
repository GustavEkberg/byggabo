'use client';

import type { Contact } from '@/lib/services/db/schema';
import { ContactRow } from './contact-row';

type Props = {
  contacts: Contact[];
};

export function ContactList({ contacts }: Props) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr,1fr,1fr,1fr,auto] gap-4 px-4 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
        <div>Name</div>
        <div>Company</div>
        <div>Email</div>
        <div>Phone</div>
        <div className="w-20" />
      </div>
      <div className="divide-y">
        {contacts.map(contact => (
          <ContactRow key={contact.id} contact={contact} />
        ))}
      </div>
    </div>
  );
}
