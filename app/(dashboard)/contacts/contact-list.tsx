'use client';

import type { Contact, ContactCategory } from '@/lib/services/db/schema';
import { ContactRow } from './contact-row';

type Props = {
  contacts: Contact[];
  categories: ContactCategory[];
};

export function ContactList({ contacts, categories }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {contacts.map(contact => (
        <ContactRow key={contact.id} contact={contact} categories={categories} />
      ))}
    </div>
  );
}
