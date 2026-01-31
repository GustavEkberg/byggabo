import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getProjects } from '@/lib/core/project/queries';
import { ProjectList } from './project-list';
import { CreateProjectDialog } from './create-project-dialog';

export const dynamic = 'force-dynamic';

async function Content() {
  await cookies();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const projects = yield* getProjects();

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold">Projects</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage your renovation projects</p>
            </div>
            <CreateProjectDialog />
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card">
              <p className="text-muted-foreground">No projects yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first project to get started.
              </p>
            </div>
          ) : (
            <ProjectList projects={projects} />
          )}
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
                <div className="container mx-auto px-4 py-8">
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
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <Content />
    </Suspense>
  );
}
