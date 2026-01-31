'use client';

import Link from 'next/link';
import type { Project } from '@/lib/services/db/schema';

type Props = {
  projects: Project[];
};

export function ProjectList({ projects }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="block p-4 border rounded-lg bg-card hover:border-foreground/20 transition-colors"
        >
          <h2 className="font-medium">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-3">
            Created {project.createdAt.toLocaleDateString('sv-SE')}
          </p>
        </Link>
      ))}
    </div>
  );
}
