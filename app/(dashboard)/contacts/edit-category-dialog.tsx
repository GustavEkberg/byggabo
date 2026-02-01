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
import { SectionIcon, iconMap } from '@/components/ui/section-icon';
import { updateContactCategoryAction } from '@/lib/core/contact-category/update-category-action';
import { CONTACT_CATEGORY_ICONS } from '@/lib/core/contact-category/constants';
import type { ContactCategory } from '@/lib/services/db/schema';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#a16207', // amber-700
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0284c7', // sky-600
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#78716c', // stone
  '#6b7280' // gray
];

type Props = {
  category: ContactCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditCategoryForm({
  category,
  onClose
}: {
  category: ContactCategory;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [color, setColor] = useState(category.color);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await updateContactCategoryAction({
      id: category.id,
      name,
      icon,
      color
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Category updated');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="edit-category-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-category-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Carpenter"
          required
          maxLength={50}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Icon</label>
        <div className="flex flex-wrap gap-1">
          {CONTACT_CATEGORY_ICONS.map(iconName => {
            const IconComponent = iconMap[iconName];
            if (!IconComponent) return null;
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className="w-8 h-8 rounded flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  backgroundColor: icon === iconName ? 'var(--accent)' : 'transparent'
                }}
              >
                <IconComponent className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <SectionIcon icon={icon} color={color} size="lg" />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(presetColor => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: presetColor,
                borderColor: color === presetColor ? 'white' : 'transparent',
                boxShadow: color === presetColor ? '0 0 0 2px black' : 'none'
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-8 h-8 rounded border" style={{ backgroundColor: color }} />
          <Input
            type="text"
            value={color}
            onChange={e => setColor(e.target.value)}
            placeholder="#3b82f6"
            pattern="^#[0-9a-fA-F]{6}$"
            className="w-28 font-mono text-sm"
          />
        </div>
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

export function EditCategoryDialog({ category, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>Update category name, icon, and color.</DialogDescription>
        </DialogHeader>
        {open && <EditCategoryForm category={category} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
