'use client';

import { useState } from 'react';
import { Building2, Mail, Phone } from 'lucide-react';
import type { Contact, ContactCategory } from '@/lib/services/db/schema';
import { Button } from '@/components/ui/button';
import { SectionIcon } from '@/components/ui/section-icon';
import { EditContactDialog } from './edit-contact-dialog';

type Props = {
  contact: Contact;
  categories: ContactCategory[];
};

export function ContactRow({ contact, categories }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const category = contact.categoryId ? categories.find(c => c.id === contact.categoryId) : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 transition-all hover:border-foreground/20 hover:shadow-sm">
      {/* Category icon or default */}
      {category ? (
        <SectionIcon icon={category.icon} color={category.color} size="lg" />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-sm font-medium text-muted-foreground">
            {contact.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{contact.name}</h3>
        {contact.company && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
            <Building2 className="size-3.5" />
            {contact.company}
          </p>
        )}
      </div>

      {/* Contact details */}
      <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="size-4" />
            <span className="hidden md:inline max-w-[180px] truncate">{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Phone className="size-4" />
            <span className="hidden md:inline">{contact.phone}</span>
          </a>
        )}
      </div>

      {/* Edit button */}
      <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <EditContactDialog
        contact={contact}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
