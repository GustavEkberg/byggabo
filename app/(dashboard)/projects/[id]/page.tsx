import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getProject } from '@/lib/core/project/queries';
import { getCostItems } from '@/lib/core/cost-item/queries';
import { getQuotations } from '@/lib/core/quotation/queries';
import { getContacts } from '@/lib/core/contact/queries';
import { getLogItems } from '@/lib/core/log-item/queries';
import { ProjectHeader } from './project-header';
import { CostItemList } from './cost-item-list';
import { QuotationList } from './quotation-list';
import { Timeline } from './timeline';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

async function Content({ projectId }: { projectId: string }) {
  await cookies();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const [project, costItems, quotations, contacts, logItems] = yield* Effect.all([
        getProject(projectId),
        getCostItems(projectId),
        getQuotations(projectId),
        getContacts(),
        getLogItems(projectId)
      ]);

      return (
        <div className="container mx-auto px-4 py-8">
          <ProjectHeader project={project} />

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <CostItemList projectId={projectId} costItems={costItems} />
              <QuotationList projectId={projectId} quotations={quotations} contacts={contacts} />
            </div>
            <Timeline logItems={logItems} />
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
