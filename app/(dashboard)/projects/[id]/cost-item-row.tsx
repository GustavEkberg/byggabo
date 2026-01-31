'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import type { CostItem } from '@/lib/services/db/schema';
import { deleteCostItemAction } from '@/lib/core/cost-item/delete-cost-item-action';
import { EditCostItemDialog } from './edit-cost-item-dialog';

type Props = {
  costItem: CostItem;
};

export function CostItemRow({ costItem }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteCostItemAction(costItem.id);
    setDeleting(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Cost deleted');
  };

  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{costItem.name}</span>
          {costItem.receiptFileUrl && (
            <a
              href={costItem.receiptFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Receipt
            </a>
          )}
        </div>
        {costItem.description && (
          <p className="text-sm text-muted-foreground truncate">{costItem.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          {costItem.date.toLocaleDateString('sv-SE')}
        </p>
      </div>
      <div className="text-right">
        <span className="font-semibold tabular-nums">
          {parseFloat(costItem.amount).toLocaleString('sv-SE')} kr
        </span>
      </div>
      <div className="flex items-center gap-1">
        <EditCostItemDialog costItem={costItem} />
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete cost?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{costItem.name}&quot; from the project.
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
      </div>
    </div>
  );
}
