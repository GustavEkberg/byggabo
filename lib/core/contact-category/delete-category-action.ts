'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const DeleteCategoryInput = S.Struct({
  id: S.String.pipe(S.minLength(1))
});

type DeleteCategoryInput = S.Schema.Type<typeof DeleteCategoryInput>;

export const deleteContactCategoryAction = async (input: DeleteCategoryInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(DeleteCategoryInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid category data',
              field: 'input'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      // Verify category belongs to property
      const [existing] = yield* db
        .select()
        .from(schema.contactCategory)
        .where(eq(schema.contactCategory.id, parsed.id))
        .limit(1);

      if (!existing || existing.propertyId !== propertyId) {
        return yield* new NotFoundError({
          message: 'Category not found',
          entity: 'contactCategory',
          id: parsed.id
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'category.id': parsed.id
      });

      // Delete the category (contacts will have categoryId set to null via onDelete: 'set null')
      yield* db.delete(schema.contactCategory).where(eq(schema.contactCategory.id, parsed.id));

      return { id: parsed.id };
    }).pipe(
      Effect.withSpan('action.contactCategory.delete', {
        attributes: { operation: 'contactCategory.delete' }
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
                message: 'Failed to delete category'
              })
            )
          ),
        onSuccess: result =>
          Effect.sync(() => {
            revalidatePath('/contacts');
            revalidatePath('/settings');
            return { _tag: 'Success' as const, ...result };
          })
      })
    )
  );
};
