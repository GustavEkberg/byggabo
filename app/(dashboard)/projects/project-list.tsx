'use client';

import Link from 'next/link';
import { formatSEK } from '@/lib/utils';
import type { ProjectWithSummary } from '@/lib/core/project/queries';

type Props = {
  projects: ProjectWithSummary[];
};

export function ProjectList({ projects }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => {
        const hasEstimate = project.estimated > 0;
        const isOverBudget = hasEstimate && project.actual > project.estimated;
        const percentage = hasEstimate ? (project.actual / project.estimated) * 100 : 0;
        const displayPercentage = Math.min(percentage, 100);

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block rounded-xl border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
          >
            <h2 className="font-medium">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            )}

            {/* Financial summary */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span className={isOverBudget ? 'font-medium text-red-500' : 'font-medium'}>
                  {formatSEK(project.actual)}
                  {hasEstimate && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      / {formatSEK(project.estimated)}
                    </span>
                  )}
                </span>
              </div>

              {hasEstimate && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverBudget ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${displayPercentage}%` }}
                  />
                </div>
              )}
            </div>

            {/* Activity counts */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
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
              {project.quotationCount === 0 &&
                project.costItemCount === 0 &&
                project.invoiceCount === 0 && <span>No activity yet</span>}
            </div>

            <p className="text-xs text-muted-foreground/60 mt-3 pt-3 border-t">
              Created {project.createdAt.toLocaleDateString('sv-SE')}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
