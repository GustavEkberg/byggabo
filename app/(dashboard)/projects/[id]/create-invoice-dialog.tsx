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
import { createInvoiceAction } from '@/lib/core/invoice/create-invoice-action';
import { createContactAction } from '@/lib/core/contact/create-contact-action';
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
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline contact creation
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

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
        setShowNewContact(false);
      }
    }
  };

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
      invoiceDate: new Date(invoiceDate),
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
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setQuotationId(null);
    setContactId('');
    setFile(null);
    setShowNewContact(false);
    setNewContactName('');
    setNewContactCompany('');
    setNewContactEmail('');
    setNewContactPhone('');
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
              <label htmlFor="create-quotation" className="text-sm font-medium">
                Link to Quotation (optional)
              </label>
              <select
                id="create-quotation"
                value={quotationId ?? ''}
                onChange={e => handleQuotationChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No quotation (standalone)</option>
                {acceptedQuotations.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.description} - {parseFloat(q.amount).toLocaleString('sv-SE')} kr
                  </option>
                ))}
              </select>
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
              <label htmlFor="create-invoice-date" className="text-sm font-medium">
                Invoice Date
              </label>
              <Input
                id="create-invoice-date"
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="create-contact" className="text-sm font-medium">
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
              <select
                id="create-contact"
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
            )}
          </div>

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
            <Button
              type="submit"
              disabled={
                pending ||
                !description.trim() ||
                !amount ||
                (showNewContact && !newContactName.trim())
              }
            >
              {pending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
