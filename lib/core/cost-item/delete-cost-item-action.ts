'use server';

import { Effect, Match } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

export const deleteCostItemAction = async (costItemId: string) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const session = yield* getSession();
      const db = yield* Db;

      // Get cost item with project to verify ownership
      const [existing] = yield* db
        .select({
          costItem: schema.costItem,
          project: {
            id: schema.project.id,
            userId: schema.project.userId
          }
        })
        .from(schema.costItem)
        .innerJoin(schema.project, eq(schema.costItem.projectId, schema.project.id))
        .where(eq(schema.costItem.id, costItemId))
        .limit(1);

      if (!existing || existing.project.userId !== session.user.id) {
        return yield* new NotFoundError({
          message: 'Cost item not found',
          entity: 'costItem',
          id: costItemId
        });
      }

      const projectId = existing.project.id;

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'costItem.id': costItemId,
        'project.id': projectId
      });

      // Delete associated log items first
      yield* db.delete(schema.logItem).where(eq(schema.logItem.referenceId, costItemId));

      // Delete the cost item
      yield* db.delete(schema.costItem).where(eq(schema.costItem.id, costItemId));

      return { projectId };
    }).pipe(
      Effect.withSpan('action.costItem.delete', {
        attributes: { operation: 'costItem.delete' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error._tag).pipe(
            Match.when('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.when('NotFoundError', () =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: error.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to delete cost item'
              })
            )
          ),
        onSuccess: ({ projectId }) =>
          Effect.sync(() => {
            revalidatePath(`/projects/${projectId}`);
            return { _tag: 'Success' as const };
          })
      })
    )
  );
};
