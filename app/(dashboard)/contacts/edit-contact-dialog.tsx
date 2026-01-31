'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { updateContactAction } from '@/lib/core/contact/update-contact-action';
import type { Contact } from '@/lib/services/db/schema';

type Props = {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditContactForm({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [company, setCompany] = useState(contact.company || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await updateContactAction({
      id: contact.id,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Contact updated');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="edit-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="John Doe"
          required
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-company" className="text-sm font-medium">
          Company
        </label>
        <Input
          id="edit-company"
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Acme Construction"
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="john@example.com"
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="edit-phone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+46 70 123 45 67"
          maxLength={50}
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditContactDialog({ contact, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information.</DialogDescription>
        </DialogHeader>
        {open && <EditContactForm contact={contact} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
