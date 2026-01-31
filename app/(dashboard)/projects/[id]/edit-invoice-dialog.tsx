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
import { updateInvoiceAction } from '@/lib/core/invoice/update-invoice-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';

type InvoiceWithQuotation = {
  id: string;
  projectId: string;
  quotationId: string | null;
  description: string;
  amount: string;
  invoiceDate: Date;
  isPaid: boolean;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  quotation: {
    id: string;
    description: string;
    contactId: string | null;
  } | null;
};

type Props = {
  invoice: InvoiceWithQuotation;
};

export function EditInvoiceDialog({ invoice }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState(invoice.description);
  const [amount, setAmount] = useState(invoice.amount);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate.toISOString().split('T')[0]);
  const [fileUrl, setFileUrl] = useState(invoice.fileUrl);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    let finalFileUrl = fileUrl;

    // Upload new file if provided
    if (file) {
      const uploadResult = await getUploadUrlAction({
        fileName: file.name,
        folder: 'invoices'
      });

      if (uploadResult._tag === 'Error') {
        toast.error('Failed to upload file');
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
        toast.error('Failed to upload file');
        setPending(false);
        return;
      }

      finalFileUrl = uploadResult.publicUrl;
    }

    const result = await updateInvoiceAction({
      invoiceId: invoice.id,
      description,
      amount,
      invoiceDate: new Date(invoiceDate),
      fileUrl: finalFileUrl
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Invoice updated');
    setOpen(false);
  };

  const handleRemoveFile = () => {
    setFileUrl(null);
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
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>Update the details of this invoice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
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
              <label htmlFor="edit-invoice-date" className="text-sm font-medium">
                Invoice Date
              </label>
              <Input
                id="edit-invoice-date"
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="edit-invoice-file" className="text-sm font-medium">
              Invoice PDF
            </label>
            {fileUrl && !file ? (
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View current file
                </a>
                <Button type="button" variant="ghost" size="xs" onClick={handleRemoveFile}>
                  Remove
                </Button>
              </div>
            ) : null}
            <Input
              ref={fileInputRef}
              id="edit-invoice-file"
              type="file"
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !description.trim() || !amount}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
