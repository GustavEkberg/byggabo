'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SectionIcon } from '@/components/ui/section-icon';
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
import type { Contact, Project, PropertySection } from '@/lib/services/db/schema';
import { archiveProjectAction } from '@/lib/core/project/archive-project-action';
import { EditProjectDialog } from './edit-project-dialog';
import { LinkContactDialog } from './link-contact-dialog';

type Props = {
  project: Project;
  sections: PropertySection[];
  contacts: Contact[];
  linkedContactIds: string[];
};

export function ProjectHeader({ project, sections, contacts, linkedContactIds }: Props) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const section = project.sectionId ? sections.find(s => s.id === project.sectionId) : null;

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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {section && <SectionIcon icon={section.icon} color={section.color} size="md" />}
          <h1 className="text-2xl font-semibold truncate">{project.name}</h1>
        </div>
        {section && <p className="text-sm text-muted-foreground mt-1">{section.name}</p>}
        {project.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-2">
          Created {project.createdAt.toLocaleDateString('sv-SE')}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <LinkContactDialog
          project={project}
          contacts={contacts}
          linkedContactIds={linkedContactIds}
        />
        <EditProjectDialog project={project} sections={sections} />
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
