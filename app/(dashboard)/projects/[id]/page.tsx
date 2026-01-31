import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getProject } from '@/lib/core/project/queries';
import { ProjectHeader } from './project-header';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

async function Content({ projectId }: { projectId: string }) {
  await cookies();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const project = yield* getProject(projectId);

      return (
        <div className="container mx-auto px-4 py-8">
          <ProjectHeader project={project} />

          <div className="mt-8 border rounded-lg bg-card p-6">
            <p className="text-muted-foreground text-sm">
              Timeline and financial tracking coming soon...
            </p>
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
            Match.when('NotFoundError', () => NextEffect.redirect('/projects')),
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

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <Content projectId={id} />
    </Suspense>
  );
}
