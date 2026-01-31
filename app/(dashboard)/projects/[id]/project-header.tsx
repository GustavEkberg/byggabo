'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import type { Project } from '@/lib/services/db/schema';
import { archiveProjectAction } from '@/lib/core/project/archive-project-action';
import { EditProjectDialog } from './edit-project-dialog';

type Props = {
  project: Project;
};

export function ProjectHeader({ project }: Props) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    const result = await archiveProjectAction({ id: project.id });
    setArchiving(false);

    if (result._tag === 'Error') {
      toast.error(result.message);
      return;
    }

    toast.success('Project archived');
    router.push('/projects');
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
        <p className="text-xs text-muted-foreground/60 mt-2">
          Created {project.createdAt.toLocaleDateString('sv-SE')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <EditProjectDialog project={project} />
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>Archive</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will hide the project from your list. You can restore it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive} disabled={archiving}>
                {archiving ? 'Archiving...' : 'Archive'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
