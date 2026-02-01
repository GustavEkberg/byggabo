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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { updateInvoiceAction } from '@/lib/core/invoice/update-invoice-action';
import { createContactAction } from '@/lib/core/contact/create-contact-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';
import type { Contact } from '@/lib/services/db/schema';

type InvoiceWithQuotationAndContact = {
  id: string;
  projectId: string;
  quotationId: string | null;
  contactId: string | null;
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
  contact: {
    id: string;
    name: string;
    company: string | null;
  } | null;
};

type Props = {
  invoice: InvoiceWithQuotationAndContact;
  contacts: Contact[];
};

export function EditInvoiceDialog({ invoice, contacts }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState(invoice.description);
  const [amount, setAmount] = useState(invoice.amount);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate.toISOString().split('T')[0]);
  const [contactId, setContactId] = useState<string>(invoice.contactId ?? '');
  const [fileUrl, setFileUrl] = useState(invoice.fileUrl);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline contact creation
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    let finalContactId: string | null = contactId || null;

    // Create new contact inline if needed
    if (showNewContact && newContactName.trim()) {
      const contactResult = await createContactAction({
        name: newContactName,
        company: newContactCompany || undefined,
        email: newContactEmail || undefined,
        phone: newContactPhone || undefined
      });

      if (contactResult._tag === 'Error') {
        toast.error('Failed to create contact');
        setPending(false);
        return;
      }

      finalContactId = contactResult.contact.id;
    }

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
      fileUrl: finalFileUrl,
      contactId: finalContactId
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <div className="flex items-center justify-between">
              <label htmlFor="edit-contact" className="text-sm font-medium">
                Contractor
              </label>
              {!showNewContact && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewContact(true)}
                >
                  + New
                </Button>
              )}
            </div>

            {showNewContact ? (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Contractor</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewContact(false);
                      setNewContactName('');
                      setNewContactCompany('');
                      setNewContactEmail('');
                      setNewContactPhone('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <Input
                  placeholder="Name *"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  required={showNewContact}
                />
                <Input
                  placeholder="Company"
                  value={newContactCompany}
                  onChange={e => setNewContactCompany(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newContactEmail}
                    onChange={e => setNewContactEmail(e.target.value)}
                  />
                  <Input
                    type="tel"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={e => setNewContactPhone(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <Select value={contactId} onValueChange={value => setContactId(value ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No contractor selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No contractor selected</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.company ? `${contact.company} (${contact.name})` : contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Button
              type="submit"
              disabled={
                pending ||
                !description.trim() ||
                !amount ||
                (showNewContact && !newContactName.trim())
              }
            >
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
