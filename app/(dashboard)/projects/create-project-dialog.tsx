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
import { createProjectAction } from '@/lib/core/project/create-project-action';

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await createProjectAction({ name, description: description || undefined });

    setPending(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Project created');
    setOpen(false);
    setName('');
    setDescription('');
    router.push(`/projects/${result.project.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New Project</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Add a new renovation project to track.</DialogDescription>
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
              placeholder="Kitchen renovation"
              required
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
