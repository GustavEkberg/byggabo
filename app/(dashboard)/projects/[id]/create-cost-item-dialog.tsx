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
import { createCostItemAction } from '@/lib/core/cost-item/create-cost-item-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';

type Props = {
  projectId: string;
};

export function CreateCostItemDialog({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    let receiptFileUrl: string | undefined;

    // Upload receipt if provided
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

      receiptFileUrl = uploadResult.publicUrl;
    }

    const result = await createCostItemAction({
      projectId,
      name,
      description: description || undefined,
      amount,
      date: new Date(date),
      receiptFileUrl
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Cost added');
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Add Cost</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cost</DialogTitle>
          <DialogDescription>Record a new expense for this project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Paint supplies"
              required
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details..."
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (kr)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="receipt" className="text-sm font-medium">
              Receipt (optional)
            </label>
            <Input
              ref={fileInputRef}
              id="receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim() || !amount}>
              {pending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
