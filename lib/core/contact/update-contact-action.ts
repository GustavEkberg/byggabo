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

const UpdateContactInput = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1), S.maxLength(200)),
  email: S.optional(S.NullOr(S.String.pipe(S.maxLength(200)))),
  phone: S.optional(S.NullOr(S.String.pipe(S.maxLength(50)))),
  company: S.optional(S.NullOr(S.String.pipe(S.maxLength(200))))
});

type UpdateContactInput = S.Schema.Type<typeof UpdateContactInput>;

export const updateContactAction = async (input: UpdateContactInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateContactInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid contact data',
              field: 'input'
            })
        )
      );

      const session = yield* getSession();
      const db = yield* Db;

      // Verify user owns the contact
      const [existing] = yield* db
        .select()
        .from(schema.contact)
        .where(eq(schema.contact.id, parsed.id))
        .limit(1);

      if (!existing || existing.userId !== session.user.id) {
        return yield* new NotFoundError({
          message: 'Contact not found',
          entity: 'contact',
          id: parsed.id
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'contact.id': parsed.id
      });

      const [contact] = yield* db
        .update(schema.contact)
        .set({
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          company: parsed.company
        })
        .where(eq(schema.contact.id, parsed.id))
        .returning();

      return contact;
    }).pipe(
      Effect.withSpan('action.contact.update', {
        attributes: { operation: 'contact.update' }
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
                message: 'Failed to update contact'
              })
            )
          ),
        onSuccess: contact =>
          Effect.sync(() => {
            revalidatePath('/contacts');
            return { _tag: 'Success' as const, contact };
          })
      })
    )
  );
};
