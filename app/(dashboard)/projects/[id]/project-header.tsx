'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EllipsisVertical, UserPlus, Pencil, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionIcon } from '@/components/ui/section-icon';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  const section = project.sectionId ? sections.find(s => s.id === project.sectionId) : null;

  const [linkOpen, setLinkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const handleArchive = async () => {
    const result = await archiveProjectAction({ id: project.id });

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

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon" className="flex-shrink-0" />}
        >
          <EllipsisVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={() => setLinkOpen(true)}>
            <UserPlus />
            Link Contact
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setArchiveOpen(true)}>
            <Archive />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LinkContactDialog
        project={project}
        contacts={contacts}
        linkedContactIds={linkedContactIds}
        open={linkOpen}
        onOpenChange={setLinkOpen}
      />
      <EditProjectDialog
        project={project}
        sections={sections}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        title="Archive project?"
        description="This will hide the project from your list. You can restore it later."
        actionLabel="Archive"
        variant="default"
        onConfirm={handleArchive}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </div>
  );
}
