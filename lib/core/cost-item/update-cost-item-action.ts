'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const UpdateCostItemInput = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1), S.maxLength(200)),
  description: S.optional(S.String.pipe(S.maxLength(2000))),
  amount: S.String.pipe(S.minLength(1)),
  date: S.Date,
  receiptFileUrl: S.optional(S.NullOr(S.String))
});

type UpdateCostItemInput = S.Schema.Type<typeof UpdateCostItemInput>;

export const updateCostItemAction = async (input: UpdateCostItemInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateCostItemInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid cost item data',
              field: 'input'
            })
        )
      );

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
        .where(eq(schema.costItem.id, parsed.id))
        .limit(1);

      if (!existing || existing.project.userId !== session.user.id) {
        return yield* new NotFoundError({
          message: 'Cost item not found',
          entity: 'costItem',
          id: parsed.id
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'costItem.id': parsed.id
      });

      const [costItem] = yield* db
        .update(schema.costItem)
        .set({
          name: parsed.name,
          description: parsed.description,
          amount: parsed.amount,
          date: parsed.date,
          receiptFileUrl: parsed.receiptFileUrl
        })
        .where(eq(schema.costItem.id, parsed.id))
        .returning();

      return costItem;
    }).pipe(
      Effect.withSpan('action.costItem.update', {
        attributes: { operation: 'costItem.update' }
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
            Match.when('ValidationError', () =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: error.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to update cost item'
              })
            )
          ),
        onSuccess: costItem =>
          Effect.sync(() => {
            revalidatePath(`/projects/${costItem.projectId}`);
            return { _tag: 'Success' as const, costItem };
          })
      })
    )
  );
};
