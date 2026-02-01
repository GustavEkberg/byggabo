'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { ValidationError, NotFoundError, UnauthorizedError } from '@/lib/core/errors';

const UpdateLogItemInput = S.Struct({
  logItemId: S.String.pipe(S.minLength(1)),
  description: S.optional(S.String.pipe(S.minLength(1), S.maxLength(2000))),
  createdAt: S.optional(S.Date)
});

type UpdateLogItemInput = S.Schema.Type<typeof UpdateLogItemInput>;

export const updateLogItemAction = async (input: UpdateLogItemInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateLogItemInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid input',
              field: 'input'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      // Get log item with project info
      const [existing] = yield* db
        .select({
          logItem: schema.logItem,
          project: {
            id: schema.project.id,
            propertyId: schema.project.propertyId
          }
        })
        .from(schema.logItem)
        .innerJoin(schema.project, eq(schema.logItem.projectId, schema.project.id))
        .where(eq(schema.logItem.id, parsed.logItemId))
        .limit(1);

      if (!existing || existing.project.propertyId !== propertyId) {
        return yield* new NotFoundError({
          message: 'Log item not found',
          entity: 'logItem',
          id: parsed.logItemId
        });
      }

      // Only allow editing own log items
      if (existing.logItem.createdById !== user.id) {
        return yield* new UnauthorizedError({
          message: 'You can only edit your own log items'
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'logItem.id': parsed.logItemId
      });

      // Build update object
      const updateData: Partial<schema.InsertLogItem> = {};
      if (parsed.description !== undefined) updateData.description = parsed.description;
      if (parsed.createdAt !== undefined) updateData.createdAt = parsed.createdAt;

      if (Object.keys(updateData).length === 0) {
        return existing.logItem;
      }

      const [logItem] = yield* db
        .update(schema.logItem)
        .set(updateData)
        .where(eq(schema.logItem.id, parsed.logItemId))
        .returning();

      return logItem;
    }).pipe(
      Effect.withSpan('action.logItem.update', {
        attributes: { operation: 'logItem.update' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.tag('NotFoundError', e =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: e.message
              })
            ),
            Match.tag('UnauthorizedError', e =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: e.message
              })
            ),
            Match.tag('ValidationError', e =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: e.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to update log item'
              })
            )
          ),
        onSuccess: logItem =>
          Effect.sync(() => {
            revalidatePath(`/projects/${logItem.projectId}`);
            revalidatePath('/projects');
            return { _tag: 'Success' as const, logItem };
          })
      })
    )
  );
};
