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

const UpdateSectionInput = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1), S.maxLength(50)),
  icon: S.String.pipe(S.minLength(1), S.maxLength(50)),
  color: S.String.pipe(S.pattern(/^#[0-9a-fA-F]{6}$/))
});

type UpdateSectionInput = S.Schema.Type<typeof UpdateSectionInput>;

export const updateSectionAction = async (input: UpdateSectionInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateSectionInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid section data',
              field: 'input'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      // Verify section belongs to property
      const [existing] = yield* db
        .select()
        .from(schema.propertySection)
        .where(eq(schema.propertySection.id, parsed.id))
        .limit(1);

      if (!existing || existing.propertyId !== propertyId) {
        return yield* new NotFoundError({
          message: 'Section not found',
          entity: 'propertySection',
          id: parsed.id
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'section.id': parsed.id
      });

      const [section] = yield* db
        .update(schema.propertySection)
        .set({
          name: parsed.name,
          icon: parsed.icon,
          color: parsed.color
        })
        .where(eq(schema.propertySection.id, parsed.id))
        .returning();

      return section;
    }).pipe(
      Effect.withSpan('action.propertySection.update', {
        attributes: { operation: 'propertySection.update' }
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
                message: 'Failed to update section'
              })
            )
          ),
        onSuccess: section =>
          Effect.sync(() => {
            revalidatePath('/settings');
            return { _tag: 'Success' as const, section };
          })
      })
    )
  );
};
