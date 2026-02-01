'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
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
import { deleteSectionAction } from '@/lib/core/property-section/delete-section-action';
import { EditSectionDialog } from './edit-section-dialog';
import type { PropertySection } from '@/lib/services/db/schema';

type Props = {
  sections: PropertySection[];
};

function SectionRow({ section }: { section: PropertySection }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteSectionAction({ id: section.id });
    setDeleting(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Section deleted');
    setDeleteOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
        <span className="font-medium">{section.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <Trash2 className="h-4 w-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the section &quot;{section.name}&quot;. Projects using this section
                will have their section unset. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <EditSectionDialog section={section} open={editOpen} onOpenChange={setEditOpen} />
      </div>
    </div>
  );
}

export function SectionsList({ sections }: Props) {
  if (sections.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No sections yet. Add some to organize your projects.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map(section => (
        <SectionRow key={section.id} section={section} />
      ))}
    </div>
  );
}
