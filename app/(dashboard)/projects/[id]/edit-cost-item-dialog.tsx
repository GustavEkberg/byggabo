'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CostItem } from '@/lib/services/db/schema';
import { updateCostItemAction } from '@/lib/core/cost-item/update-cost-item-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';

type Props = {
  costItem: CostItem;
};

export function EditCostItemDialog({ costItem }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(costItem.name);
  const [description, setDescription] = useState(costItem.description ?? '');
  const [amount, setAmount] = useState(costItem.amount);
  const [date, setDate] = useState(costItem.date.toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState(costItem.receiptFileUrl);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    let finalReceiptUrl = receiptUrl;

    // Upload new receipt if provided
    if (file) {
      const uploadResult = await getUploadUrlAction({
        fileName: file.name,
        folder: 'receipts'
      });

      if (uploadResult._tag === 'Error') {
        toast.error('Failed to upload receipt');
        setPending(false);
        return;
      }

      const uploadResponse = await fetch(uploadResult.signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        toast.error('Failed to upload receipt');
        setPending(false);
        return;
      }

      finalReceiptUrl = uploadResult.publicUrl;
    }

    const result = await updateCostItemAction({
      id: costItem.id,
      name,
      description: description || undefined,
      amount,
      date: new Date(date),
      receiptFileUrl: finalReceiptUrl
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Cost updated');
    setOpen(false);
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-xs" />}>
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
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cost</DialogTitle>
          <DialogDescription>Update the details of this expense.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="edit-amount" className="text-sm font-medium">
                Amount (kr)
              </label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="edit-receipt" className="text-sm font-medium">
              Receipt
            </label>
            {receiptUrl && !file ? (
              <div className="flex items-center gap-2">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View current receipt
                </a>
                <Button type="button" variant="ghost" size="xs" onClick={handleRemoveReceipt}>
                  Remove
                </Button>
              </div>
            ) : null}
            <Input
              ref={fileInputRef}
              id="edit-receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim() || !amount}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
