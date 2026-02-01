'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionIcon } from '@/components/ui/section-icon';
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
import { deleteContactCategoryAction } from '@/lib/core/contact-category/delete-category-action';
import { EditCategoryDialog } from './edit-category-dialog';
import type { ContactCategory } from '@/lib/services/db/schema';

type Props = {
  categories: ContactCategory[];
};

function CategoryRow({ category }: { category: ContactCategory }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteContactCategoryAction({ id: category.id });
    setDeleting(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Category deleted');
    setDeleteOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <SectionIcon icon={category.icon} color={category.color} size="md" />
        <span className="font-medium">{category.name}</span>
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
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the category &quot;{category.name}&quot;. Contacts using this
                category will have their category unset. This action cannot be undone.
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
        <EditCategoryDialog category={category} open={editOpen} onOpenChange={setEditOpen} />
      </div>
    </div>
  );
}

export function CategoriesList({ categories }: Props) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No categories yet. Add some to organize your contacts.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map(category => (
        <CategoryRow key={category.id} category={category} />
      ))}
    </div>
  );
}
