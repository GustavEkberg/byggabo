'use client';

import Link from 'next/link';
import { SectionIcon } from '@/components/ui/section-icon';
import type { ProjectWithSummary } from '@/lib/core/project/queries';
import type { PropertySection } from '@/lib/services/db/schema';

type Props = {
  projects: ProjectWithSummary[];
  sections: PropertySection[];
};

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return dateObj.toLocaleDateString('sv-SE');
}

export function ProjectList({ projects, sections }: Props) {
  const sectionMap = new Map(sections.map(s => [s.id, s]));

  return (
    <div className="flex flex-col gap-3">
      {projects.map(project => {
        const section = project.sectionId ? sectionMap.get(project.sectionId) : null;

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 transition-all hover:border-foreground/20 hover:shadow-sm"
          >
            {section && <SectionIcon icon={section.icon} color={section.color} size="sm" />}

            <div className="flex-1 min-w-0">
              <h2 className="font-medium truncate">{project.name}</h2>
              {project.description && (
                <p className="text-sm text-muted-foreground truncate">{project.description}</p>
              )}
            </div>

            {/* Activity counts */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              {project.quotationCount > 0 && (
                <span>
                  {project.quotationCount} quotation{project.quotationCount !== 1 && 's'}
                </span>
              )}
              {project.costItemCount > 0 && (
                <span>
                  {project.costItemCount} cost item{project.costItemCount !== 1 && 's'}
                </span>
              )}
              {project.invoiceCount > 0 && (
                <span>
                  {project.invoiceCount} invoice{project.invoiceCount !== 1 && 's'}
                </span>
              )}
            </div>

            {/* Last activity */}
            <div className="text-sm text-muted-foreground shrink-0">
              {project.lastActivityAt ? formatRelativeTime(project.lastActivityAt) : 'No activity'}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
