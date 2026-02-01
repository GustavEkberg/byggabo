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
import { Textarea } from '@/components/ui/textarea';
import type { Contact } from '@/lib/services/db/schema';
import { createQuotationAction } from '@/lib/core/quotation/create-quotation-action';
import { createContactAction } from '@/lib/core/contact/create-contact-action';
import { getUploadUrlAction } from '@/lib/core/file/get-upload-url-action';

type Props = {
  projectId: string;
  contacts: Contact[];
};

export function CreateQuotationDialog({ projectId, contacts }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState<Date>(new Date());
  const [contactId, setContactId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline contact creation
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setReceivedDate(new Date());
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

    let fileUrl: string | undefined;

    // Upload file if provided
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

    const result = await createQuotationAction({
      projectId,
      description,
      amount,
      receivedDate: receivedDate.toISOString(),
      contactId: finalContactId,
      fileUrl
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Quotation added');
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Add Quotation</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Quotation</DialogTitle>
          <DialogDescription>Record a quotation from a contractor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kitchen renovation work..."
              required
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
              <label className="text-sm font-medium">Received Date</label>
              <DatePicker
                value={receivedDate}
                onChange={date => setReceivedDate(date ?? new Date())}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="contact" className="text-sm font-medium">
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
            <label htmlFor="quotationFile" className="text-sm font-medium">
              PDF (optional)
            </label>
            <Input
              ref={fileInputRef}
              id="quotationFile"
              type="file"
              accept=".pdf,image/*"
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
              {pending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
