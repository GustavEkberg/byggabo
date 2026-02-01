'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { SelectContactDropdown } from '@/components/ui/select-contact-dropdown';
import type { Contact, Project } from '@/lib/services/db/schema';
import { linkContactAction } from '@/lib/core/project-contact/link-contact-action';

type Props = {
  project: Project;
  contacts: Contact[];
  linkedContactIds: string[];
};

export function LinkContactDialog({ project, contacts, linkedContactIds }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [localContacts, setLocalContacts] = useState<Contact[]>([]);

  // Merge server contacts with locally created ones (dedupe by id), filter to unlinked
  const serverContactIds = new Set(contacts.map(c => c.id));
  const newLocalContacts = localContacts.filter(c => !serverContactIds.has(c.id));
  const allContacts = [...contacts, ...newLocalContacts];
  const availableContacts = allContacts.filter(c => !linkedContactIds.includes(c.id));

  const handleContactCreated = (contact: Contact) => {
    setLocalContacts(prev => [...prev, contact]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) return;

    setPending(true);

    const result = await linkContactAction({
      projectId: project.id,
      contactId: selectedContactId
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Contact linked to project');
    setOpen(false);
    setSelectedContactId('');
    router.refresh();
  };

  // Only disable if all contacts are linked AND we don't allow creating new ones
  // But since we allow creating, we never fully disable
  const noAvailableContacts = availableContacts.length === 0 && localContacts.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <UserPlus className="h-4 w-4 mr-1" />
        Link Contact
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Contact to Project</DialogTitle>
          <DialogDescription>Link a contact to this project for easy reference.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <SelectContactDropdown
            contacts={availableContacts}
            value={selectedContactId}
            onChange={setSelectedContactId}
            label="Contact"
            placeholder={noAvailableContacts ? 'Create a new contact...' : 'Select a contact...'}
            onContactCreated={handleContactCreated}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending || !selectedContactId}>
              {pending ? 'Linking...' : 'Link Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
