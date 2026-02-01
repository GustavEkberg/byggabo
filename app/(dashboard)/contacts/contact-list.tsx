'use client';

import type { Contact } from '@/lib/services/db/schema';
import { ContactRow } from './contact-row';

type Props = {
  contacts: Contact[];
};

export function ContactList({ contacts }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map(contact => (
        <ContactRow key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
