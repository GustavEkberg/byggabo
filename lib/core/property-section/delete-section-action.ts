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

const DeleteSectionInput = S.Struct({
  id: S.String.pipe(S.minLength(1))
});

type DeleteSectionInput = S.Schema.Type<typeof DeleteSectionInput>;

export const deleteSectionAction = async (input: DeleteSectionInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(DeleteSectionInput)(input).pipe(
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

      // Delete the section (projects will have sectionId set to null via onDelete: 'set null')
      yield* db.delete(schema.propertySection).where(eq(schema.propertySection.id, parsed.id));

      return { id: parsed.id };
    }).pipe(
      Effect.withSpan('action.propertySection.delete', {
        attributes: { operation: 'propertySection.delete' }
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
                message: 'Failed to delete section'
              })
            )
          ),
        onSuccess: result =>
          Effect.sync(() => {
            revalidatePath('/settings');
            revalidatePath('/projects');
            return { _tag: 'Success' as const, ...result };
          })
      })
    )
  );
};
