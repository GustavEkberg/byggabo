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
  DialogTitle,
  DialogTrigger
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
import { createContactAction } from '@/lib/core/contact/create-contact-action';
import type { ContactCategory } from '@/lib/services/db/schema';

type Props = {
  categories: ContactCategory[];
};

export function CreateContactDialog({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await createContactAction({
      name,
      categoryId,
      description: description || undefined,
      website: website || undefined,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Contact created');
    setOpen(false);
    setName('');
    setCategoryId(null);
    setDescription('');
    setWebsite('');
    setEmail('');
    setPhone('');
    setCompany('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New Contact</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Add a contractor or supplier to your contacts.</DialogDescription>
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
              placeholder="John Doe"
              required
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="company" className="text-sm font-medium">
              Company
            </label>
            <Input
              id="company"
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
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Notes about this contact..."
              maxLength={1000}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="website" className="text-sm font-medium">
              Website
            </label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
              maxLength={500}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone
            </label>
            <Input
              id="phone"
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
              {pending ? 'Adding...' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
