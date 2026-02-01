'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { Contact } from '@/lib/services/db/schema';
import { createContactAction } from '@/lib/core/contact/create-contact-action';
import { toast } from 'sonner';

type Props = {
  contacts: Contact[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  allowCreate?: boolean;
  onContactCreated?: (contact: Contact) => void;
  disabled?: boolean;
  required?: boolean;
};

function formatContactDisplay(contact: Contact): React.ReactNode {
  if (contact.company) {
    return (
      <span className="flex flex-col items-start">
        <span>{contact.company}</span>
        <span className="text-xs text-muted-foreground">{contact.name}</span>
      </span>
    );
  }
  return contact.name;
}

function formatContactDisplayText(contact: Contact): string {
  return contact.company ? `${contact.company} (${contact.name})` : contact.name;
}

function getSelectedDisplayText(contacts: Contact[], value: string, placeholder: string): string {
  if (!value) return placeholder;
  const contact = contacts.find(c => c.id === value);
  return contact ? formatContactDisplayText(contact) : placeholder;
}

export function SelectContactDropdown({
  contacts,
  value,
  onChange,
  placeholder = 'Select contact...',
  label,
  allowCreate = true,
  onContactCreated,
  disabled = false,
  required = false
}: Props) {
  const [showNewContact, setShowNewContact] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const resetNewContactForm = () => {
    setNewContactName('');
    setNewContactCompany('');
    setNewContactEmail('');
    setNewContactPhone('');
  };

  const handleCreateContact = async () => {
    if (!newContactName.trim()) return;

    setCreating(true);

    const result = await createContactAction({
      name: newContactName.trim(),
      company: newContactCompany.trim() || undefined,
      email: newContactEmail.trim() || undefined,
      phone: newContactPhone.trim() || undefined
    });

    setCreating(false);

    if (result._tag === 'Error') {
      toast.error('Failed to create contact');
      return;
    }

    toast.success('Contact created');
    onChange(result.contact.id);
    onContactCreated?.(result.contact);
    setShowNewContact(false);
    resetNewContactForm();
  };

  const handleCancelCreate = () => {
    setShowNewContact(false);
    resetNewContactForm();
  };

  if (showNewContact) {
    return (
      <div className="grid gap-2">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{label}</label>
          </div>
        )}
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">New Contact</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancelCreate}>
              Cancel
            </Button>
          </div>
          <Input
            placeholder="Name *"
            value={newContactName}
            onChange={e => setNewContactName(e.target.value)}
            disabled={creating}
          />
          <Input
            placeholder="Company"
            value={newContactCompany}
            onChange={e => setNewContactCompany(e.target.value)}
            disabled={creating}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="email"
              placeholder="Email"
              value={newContactEmail}
              onChange={e => setNewContactEmail(e.target.value)}
              disabled={creating}
            />
            <Input
              type="tel"
              placeholder="Phone"
              value={newContactPhone}
              onChange={e => setNewContactPhone(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCreateContact}
            disabled={creating || !newContactName.trim()}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create Contact'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{label}</label>
          {allowCreate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNewContact(true)}
              disabled={disabled}
            >
              + New
            </Button>
          )}
        </div>
      )}
      <Select
        value={value}
        onValueChange={v => onChange(v ?? '')}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger className="w-full">
          <span className="truncate">{getSelectedDisplayText(contacts, value, placeholder)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {contacts.map((contact, i) => (
            <SelectItem
              key={contact.id}
              value={contact.id}
              className={i % 2 === 1 ? 'bg-muted/50' : ''}
            >
              {formatContactDisplay(contact)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
