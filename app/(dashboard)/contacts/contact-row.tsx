'use client';

import { useState } from 'react';
import type { Contact } from '@/lib/services/db/schema';
import { Button } from '@/components/ui/button';
import { EditContactDialog } from './edit-contact-dialog';

type Props = {
  contact: Contact;
};

export function ContactRow({ contact }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="grid grid-cols-[1fr,1fr,1fr,1fr,auto] gap-4 px-4 py-3 items-center text-sm">
      <div className="font-medium truncate">{contact.name}</div>
      <div className="text-muted-foreground truncate">{contact.company || '-'}</div>
      <div className="text-muted-foreground truncate">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="hover:underline">
            {contact.email}
          </a>
        ) : (
          '-'
        )}
      </div>
      <div className="text-muted-foreground truncate">
        {contact.phone ? (
          <a href={`tel:${contact.phone}`} className="hover:underline">
            {contact.phone}
          </a>
        ) : (
          '-'
        )}
      </div>
      <div className="w-20 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <EditContactDialog contact={contact} open={editOpen} onOpenChange={setEditOpen} />
      </div>
    </div>
  );
}
