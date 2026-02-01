'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, Building2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import type { Contact, Project } from '@/lib/services/db/schema';
import { unlinkContactAction } from '@/lib/core/project-contact/unlink-contact-action';

type Props = {
  project: Project;
  linkedContacts: Contact[];
};

export function ProjectContacts({ project, linkedContacts }: Props) {
  const router = useRouter();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleUnlink = async (contactId: string) => {
    setUnlinkingId(contactId);

    const result = await unlinkContactAction({
      projectId: project.id,
      contactId
    });

    setUnlinkingId(null);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Contact unlinked');
    router.refresh();
  };

  if (linkedContacts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-medium">Linked Contacts</h3>
        <span className="text-xs text-muted-foreground">{linkedContacts.length}</span>
      </div>
      <div className="divide-y">
        {linkedContacts.map(contact => (
          <div key={contact.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{contact.name}</p>
              {contact.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{contact.company}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </a>
                )}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  />
                }
              >
                <X className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlink contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove {contact.name} from this project. They can be re-linked later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleUnlink(contact.id)}
                    disabled={unlinkingId === contact.id}
                  >
                    {unlinkingId === contact.id ? 'Unlinking...' : 'Unlink'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
