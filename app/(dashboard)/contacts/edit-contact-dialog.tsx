'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { SectionIcon } from '@/components/ui/section-icon';
import { updateContactAction } from '@/lib/core/contact/update-contact-action';
import type { Contact, ContactCategory } from '@/lib/services/db/schema';

type Props = {
  contact: Contact;
  categories: ContactCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditContactForm({
  contact,
  categories,
  onClose
}: {
  contact: Contact;
  categories: ContactCategory[];
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(contact.name);
  const [categoryId, setCategoryId] = useState<string | null>(contact.categoryId);
  const [description, setDescription] = useState(contact.description || '');
  const [website, setWebsite] = useState(contact.website || '');
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [company, setCompany] = useState(contact.company || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await updateContactAction({
      id: contact.id,
      name,
      categoryId,
      description: description || null,
      website: website || null,
      email: email || null,
      phone: phone || null,
      company: company || null
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Contact updated');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="edit-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="John Doe"
          required
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-company" className="text-sm font-medium">
          Company
        </label>
        <Input
          id="edit-company"
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Acme Construction"
          maxLength={200}
        />
      </div>
      {categories.length > 0 && (
        <div className="grid gap-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryId ?? ''} onValueChange={v => setCategoryId(v || null)}>
            <SelectTrigger className="w-full">
              {categoryId ? (
                <span className="flex items-center gap-2">
                  <SectionIcon
                    icon={categories.find(c => c.id === categoryId)?.icon ?? 'users'}
                    color={categories.find(c => c.id === categoryId)?.color ?? '#6b7280'}
                    size="sm"
                  />
                  {categories.find(c => c.id === categoryId)?.name}
                </span>
              ) : (
                <SelectValue placeholder="Select a category..." />
              )}
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  <SectionIcon icon={category.icon} color={category.color} size="sm" />
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="edit-description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Notes about this contact..."
          maxLength={1000}
          rows={3}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-website" className="text-sm font-medium">
          Website
        </label>
        <Input
          id="edit-website"
          type="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://example.com"
          maxLength={500}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="john@example.com"
          maxLength={200}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="edit-phone" className="text-sm font-medium">
          Phone
        </label>
        <Input
          id="edit-phone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+46 70 123 45 67"
          maxLength={50}
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditContactDialog({ contact, categories, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information.</DialogDescription>
        </DialogHeader>
        {open && (
          <EditContactForm
            contact={contact}
            categories={categories}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
