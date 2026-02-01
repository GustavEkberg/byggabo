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
import { updateSectionAction } from '@/lib/core/property-section/update-section-action';
import { SECTION_ICONS } from '@/lib/core/property-section/constants';
import type { PropertySection } from '@/lib/services/db/schema';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#6b7280' // gray
];

type Props = {
  section: PropertySection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditSectionForm({ section, onClose }: { section: PropertySection; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(section.name);
  const [icon, setIcon] = useState(section.icon);
  const [color, setColor] = useState(section.color);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await updateSectionAction({
      id: section.id,
      name,
      icon,
      color
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Section updated');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="edit-section-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="edit-section-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Kitchen"
          required
          maxLength={50}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium">Icon</label>
        <div className="flex flex-wrap gap-1">
          {SECTION_ICONS.map(iconName => {
            const IconComponent = iconMap[iconName];
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

export function EditSectionDialog({ section, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>Update section name, icon, and color.</DialogDescription>
        </DialogHeader>
        {open && <EditSectionForm section={section} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
