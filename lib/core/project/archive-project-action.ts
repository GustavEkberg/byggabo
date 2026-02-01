'use server';

import { Effect, Match, Schema as S } from 'effect';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const ArchiveProjectInput = S.Struct({
  id: S.String.pipe(S.minLength(1))
});

type ArchiveProjectInput = S.Schema.Type<typeof ArchiveProjectInput>;

export const archiveProjectAction = async (input: ArchiveProjectInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(ArchiveProjectInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Project ID is required',
              field: 'id'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'project.id': parsed.id
      });

      // Verify ownership via property
      const [existing] = yield* db
        .select()
        .from(schema.project)
        .where(and(eq(schema.project.id, parsed.id), eq(schema.project.propertyId, propertyId)))
        .limit(1);

      if (!existing) {
        return yield* new NotFoundError({
          message: 'Project not found',
          entity: 'project',
          id: parsed.id
        });
      }

      yield* db
        .update(schema.project)
        .set({ status: 'ARCHIVED' })
        .where(eq(schema.project.id, parsed.id));

      return { id: parsed.id };
    }).pipe(
      Effect.withSpan('action.project.archive', {
        attributes: { operation: 'project.archive' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.tag('NotFoundError', e =>
              Effect.succeed({ _tag: 'Error' as const, message: e.message })
            ),
            Match.orElse(() =>
              Effect.succeed({ _tag: 'Error' as const, message: 'Failed to archive project' })
            )
          ),
        onSuccess: result =>
          Effect.sync(() => {
            revalidatePath('/projects');
            return { _tag: 'Success' as const, ...result };
          })
      })
    )
  );
};
