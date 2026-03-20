import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { getProjectsWithSummary } from '@/lib/core/project/queries';
import { getSections } from '@/lib/core/property-section/queries';
import { getRecentLogItems } from '@/lib/core/log-item/queries';
import { ProjectList } from './project-list';
import { CreateProjectDialog } from './create-project-dialog';
import { Timeline } from '@/components/ui/timeline';

export const dynamic = 'force-dynamic';

async function Content() {
  await cookies();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const { user } = yield* getSessionWithProperty();
      const [projects, sections, recentActivity] = yield* Effect.all([
        getProjectsWithSummary(),
        getSections(),
        getRecentLogItems(20)
      ]);

      return (
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold">Projects</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage your renovation projects</p>
            </div>
            <CreateProjectDialog sections={sections} />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              {projects.length === 0 ? (
                <div className="text-center py-12 rounded-xl border bg-card">
                  <p className="text-muted-foreground">No projects yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first project to get started.
                  </p>
                </div>
              ) : (
                <ProjectList projects={projects} sections={sections} />
              )}
            </div>
            <div>
              <Timeline
                logItems={recentActivity}
                currentUserId={user.id}
                title="Recent Activity"
                subtitle="Latest updates across all projects"
                showProjectName
                maxHeight="max-h-[32rem]"
              />
            </div>
          </div>
        </div>
      );
    }).pipe(
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error._tag).pipe(
            Match.when('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.orElse(() =>
              Effect.succeed(
                <div className="mx-auto max-w-6xl px-4 py-8">
                  <p className="text-red-500">Error: {error.message}</p>
                </div>
              )
            )
          ),
        onSuccess: Effect.succeed
      })
    )
  );
}

export default async function ProjectsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8">Loading...</div>}>
      <Content />
    </Suspense>
  );
}
