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
import type { Contact } from '@/lib/services/db/schema';
import { updateQuotationAction } from '@/lib/core/quotation/update-quotation-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';

type QuotationWithContact = {
  id: string;
  projectId: string;
  contactId: string | null;
  description: string;
  amount: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  receivedDate: Date;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    name: string;
    company: string | null;
  } | null;
};

type Props = {
  quotation: QuotationWithContact;
  contacts: Contact[];
};

export function EditQuotationDialog({ quotation, contacts }: Props) {
  const [open, setOpen] = useState(false);

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
      {open && (
        <EditQuotationForm
          quotation={quotation}
          contacts={contacts}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

function EditQuotationForm({
  quotation,
  contacts,
  onClose
}: {
  quotation: QuotationWithContact;
  contacts: Contact[];
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState(quotation.description);
  const [amount, setAmount] = useState(quotation.amount);
  const [receivedDate, setReceivedDate] = useState(
    quotation.receivedDate.toISOString().split('T')[0]
  );
  const [contactId, setContactId] = useState<string>(quotation.contactId ?? '');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    let fileUrl: string | null | undefined;

    // Upload new file if provided
    if (file) {
      const uploadResult = await getUploadUrlAction({
        fileName: file.name,
        folder: 'quotations'
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

      fileUrl = uploadResult.publicUrl;
    }

    const result = await updateQuotationAction({
      quotationId: quotation.id,
      description,
      amount,
      receivedDate: new Date(receivedDate),
      contactId: contactId || null,
      ...(fileUrl !== undefined ? { fileUrl } : {})
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Quotation updated');
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Quotation</DialogTitle>
        <DialogDescription>Update the quotation details.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="edit-description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kitchen renovation work..."
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
              placeholder="0.00"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="edit-receivedDate" className="text-sm font-medium">
              Received Date
            </label>
            <Input
              id="edit-receivedDate"
              type="date"
              value={receivedDate}
              onChange={e => setReceivedDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label htmlFor="edit-contact" className="text-sm font-medium">
            Contractor
          </label>
          <select
            id="edit-contact"
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No contractor selected</option>
            {contacts.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.company ? `${contact.company} (${contact.name})` : contact.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="edit-quotationFile" className="text-sm font-medium">
            PDF (optional)
          </label>
          {quotation.fileUrl && (
            <p className="text-xs text-muted-foreground">
              Current:{' '}
              <a
                href={quotation.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View file
              </a>
            </p>
          )}
          <Input
            ref={fileInputRef}
            id="edit-quotationFile"
            type="file"
            accept=".pdf,image/*"
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
  );
}
