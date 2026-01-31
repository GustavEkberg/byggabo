'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { ValidationError } from '@/lib/core/errors';

const CreateContactInput = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(200)),
  email: S.optional(S.String.pipe(S.maxLength(200))),
  phone: S.optional(S.String.pipe(S.maxLength(50))),
  company: S.optional(S.String.pipe(S.maxLength(200)))
});

type CreateContactInput = S.Schema.Type<typeof CreateContactInput>;

export const createContactAction = async (input: CreateContactInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateContactInput)(input).pipe(
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

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'contact.name': parsed.name
      });

      const [contact] = yield* db
        .insert(schema.contact)
        .values({
          userId: session.user.id,
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          company: parsed.company
        })
        .returning();

      return contact;
    }).pipe(
      Effect.withSpan('action.contact.create', {
        attributes: { operation: 'contact.create' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error._tag).pipe(
            Match.when('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.when('ValidationError', () =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: error.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to create contact'
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
