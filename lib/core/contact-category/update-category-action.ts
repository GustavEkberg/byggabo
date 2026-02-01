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

const UpdateCategoryInput = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1), S.maxLength(50)),
  icon: S.String.pipe(S.minLength(1), S.maxLength(50)),
  color: S.String.pipe(S.pattern(/^#[0-9a-fA-F]{6}$/))
});

type UpdateCategoryInput = S.Schema.Type<typeof UpdateCategoryInput>;

export const updateContactCategoryAction = async (input: UpdateCategoryInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateCategoryInput)(input).pipe(
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

      const [category] = yield* db
        .update(schema.contactCategory)
        .set({
          name: parsed.name,
          icon: parsed.icon,
          color: parsed.color
        })
        .where(eq(schema.contactCategory.id, parsed.id))
        .returning();

      return category;
    }).pipe(
      Effect.withSpan('action.contactCategory.update', {
        attributes: { operation: 'contactCategory.update' }
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
                message: 'Failed to update category'
              })
            )
          ),
        onSuccess: category =>
          Effect.sync(() => {
            revalidatePath('/contacts');
            revalidatePath('/settings');
            return { _tag: 'Success' as const, category };
          })
      })
    )
  );
};
