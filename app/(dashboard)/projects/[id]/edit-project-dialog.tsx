'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Project, PropertySection } from '@/lib/services/db/schema';
import { updateProjectAction } from '@/lib/core/project/update-project-action';

type Props = {
  project: Project;
  sections: PropertySection[];
};

export function EditProjectDialog({ project, sections }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [sectionId, setSectionId] = useState<string | null>(project.sectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await updateProjectAction({
      id: project.id,
      name,
      description: description || null,
      sectionId
    });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Project updated');
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Edit</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update project details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>
          {sections.length > 0 && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Section</label>
              <Select value={sectionId ?? ''} onValueChange={v => setSectionId(v || null)}>
                <SelectTrigger className="w-full">
                  {sectionId ? (
                    <span className="flex items-center gap-2">
                      <SectionIcon
                        icon={sections.find(s => s.id === sectionId)?.icon ?? 'box'}
                        color={sections.find(s => s.id === sectionId)?.color ?? '#6b7280'}
                        size="sm"
                      />
                      {sections.find(s => s.id === sectionId)?.name}
                    </span>
                  ) : (
                    <SelectValue placeholder="Select a section..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      <SectionIcon icon={section.icon} color={section.color} size="sm" />
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
