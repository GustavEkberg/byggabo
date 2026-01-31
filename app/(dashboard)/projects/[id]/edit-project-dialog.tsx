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
import type { Project } from '@/lib/services/db/schema';
import { updateProjectAction } from '@/lib/core/project/update-project-action';

type Props = {
  project: Project;
};

export function EditProjectDialog({ project }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await updateProjectAction({
      id: project.id,
      name,
      description: description || null
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
