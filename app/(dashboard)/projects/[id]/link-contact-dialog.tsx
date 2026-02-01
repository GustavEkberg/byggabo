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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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

  // Filter to only show unlinked contacts
  const availableContacts = contacts.filter(c => !linkedContactIds.includes(c.id));

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

  if (availableContacts.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled title="All contacts are already linked">
        <UserPlus className="h-4 w-4 mr-1" />
        Link Contact
      </Button>
    );
  }

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
          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact</label>
            <Select value={selectedContactId} onValueChange={v => setSelectedContactId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a contact..." />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>
                    <span className="flex flex-col items-start">
                      <span>{contact.name}</span>
                      {contact.company && (
                        <span className="text-xs text-muted-foreground">{contact.company}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
