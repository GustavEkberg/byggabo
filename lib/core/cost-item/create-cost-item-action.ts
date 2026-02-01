'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const CreateCostItemInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1), S.maxLength(200)),
  description: S.optional(S.String.pipe(S.maxLength(2000))),
  amount: S.String.pipe(S.minLength(1)), // Decimal as string
  date: S.DateFromString,
  receiptFileUrl: S.optional(S.String)
});

type CreateCostItemInput = S.Schema.Encoded<typeof CreateCostItemInput>;

export const createCostItemAction = async (input: CreateCostItemInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateCostItemInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid cost item data',
              field: 'input'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      // Verify project belongs to property
      const [project] = yield* db
        .select({ id: schema.project.id })
        .from(schema.project)
        .where(
          and(eq(schema.project.id, parsed.projectId), eq(schema.project.propertyId, propertyId))
        )
        .limit(1);

      if (!project) {
        return yield* new NotFoundError({
          message: 'Project not found',
          entity: 'project',
          id: parsed.projectId
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'project.id': parsed.projectId,
        'costItem.name': parsed.name
      });

      const [costItem] = yield* db
        .insert(schema.costItem)
        .values({
          projectId: parsed.projectId,
          name: parsed.name,
          description: parsed.description,
          amount: parsed.amount,
          date: parsed.date,
          receiptFileUrl: parsed.receiptFileUrl
        })
        .returning();

      // Create log item for timeline
      yield* db.insert(schema.logItem).values({
        projectId: parsed.projectId,
        type: 'COST_ITEM',
        referenceId: costItem.id,
        description: `Added cost: ${parsed.name} - ${parsed.amount} kr`
      });

      return costItem;
    }).pipe(
      Effect.withSpan('action.costItem.create', {
        attributes: { operation: 'costItem.create' }
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
            Match.tag('ValidationError', e =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: e.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to create cost item'
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
