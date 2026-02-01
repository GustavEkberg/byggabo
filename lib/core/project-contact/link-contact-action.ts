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

const LinkContactInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  contactId: S.String.pipe(S.minLength(1))
});

type LinkContactInput = S.Schema.Type<typeof LinkContactInput>;

export const linkContactAction = async (input: LinkContactInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(LinkContactInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid input',
              field: 'input'
            })
        )
      );

      const { propertyId } = yield* getSessionWithProperty();
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

      // Verify contact belongs to property
      const [contact] = yield* db
        .select({ id: schema.contact.id })
        .from(schema.contact)
        .where(
          and(eq(schema.contact.id, parsed.contactId), eq(schema.contact.propertyId, propertyId))
        )
        .limit(1);

      if (!contact) {
        return yield* new NotFoundError({
          message: 'Contact not found',
          entity: 'contact',
          id: parsed.contactId
        });
      }

      yield* Effect.annotateCurrentSpan({
        'project.id': parsed.projectId,
        'contact.id': parsed.contactId
      });

      // Check if already linked
      const [existing] = yield* db
        .select({ id: schema.projectContact.id })
        .from(schema.projectContact)
        .where(
          and(
            eq(schema.projectContact.projectId, parsed.projectId),
            eq(schema.projectContact.contactId, parsed.contactId)
          )
        )
        .limit(1);

      if (existing) {
        // Already linked, return success
        return { alreadyLinked: true };
      }

      // Create link
      yield* db.insert(schema.projectContact).values({
        projectId: parsed.projectId,
        contactId: parsed.contactId
      });

      return { alreadyLinked: false };
    }).pipe(
      Effect.withSpan('action.projectContact.link'),
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
                message: 'Failed to link contact'
              })
            )
          ),
        onSuccess: result =>
          Effect.sync(() => {
            revalidatePath(`/projects/${input.projectId}`);
            return { _tag: 'Success' as const, ...result };
          })
      })
    )
  );
};
