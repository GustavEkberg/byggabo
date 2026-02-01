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
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { SelectContactDropdown } from '@/components/ui/select-contact-dropdown';
import { createInvoiceAction } from '@/lib/core/invoice/create-invoice-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';
import type { Contact } from '@/lib/services/db/schema';

type AcceptedQuotation = {
  id: string;
  description: string;
  amount: string;
  contactId: string | null;
};

type Props = {
  projectId: string;
  acceptedQuotations: AcceptedQuotation[];
  contacts: Contact[];
};

export function CreateInvoiceDialog({ projectId, acceptedQuotations, contacts }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQuotationChange = (value: string) => {
    if (value === '') {
      setQuotationId(null);
      return;
    }
    setQuotationId(value);
    const quotation = acceptedQuotations.find(q => q.id === value);
    if (quotation) {
      setDescription(quotation.description);
      setAmount(quotation.amount);
      // Also set contact if quotation has one
      if (quotation.contactId) {
        setContactId(quotation.contactId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const finalContactId: string | null = contactId || null;

    let fileUrl: string | null = null;

    // Upload file if provided
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

      fileUrl = uploadResult.publicUrl;
    }

    const result = await createInvoiceAction({
      projectId,
      description,
      amount,
      invoiceDate: invoiceDate.toISOString(),
      fileUrl,
      quotationId,
      contactId: finalContactId
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Invoice created');
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setInvoiceDate(new Date());
    setQuotationId(null);
    setContactId('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Add Invoice</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Add a new invoice. Optionally link it to an accepted quotation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {acceptedQuotations.length > 0 && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Link to Quotation (optional)</label>
              <Select
                value={quotationId ?? ''}
                onValueChange={value => handleQuotationChange(value ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No quotation (standalone)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No quotation (standalone)</SelectItem>
                  {acceptedQuotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.description} - {parseFloat(q.amount).toLocaleString('sv-SE')} kr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <label htmlFor="create-description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="create-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Invoice description"
              required
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="create-amount" className="text-sm font-medium">
                Amount (kr)
              </label>
              <Input
                id="create-amount"
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
              <label className="text-sm font-medium">Invoice Date</label>
              <DatePicker
                value={invoiceDate}
                onChange={date => setInvoiceDate(date ?? new Date())}
              />
            </div>
          </div>
          <SelectContactDropdown
            contacts={contacts}
            value={contactId}
            onChange={setContactId}
            label="Contractor"
            placeholder="No contractor selected"
          />

          <div className="grid gap-2">
            <label htmlFor="create-invoice-file" className="text-sm font-medium">
              Invoice PDF (optional)
            </label>
            <Input
              ref={fileInputRef}
              id="create-invoice-file"
              type="file"
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !description.trim() || !amount}>
              {pending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
