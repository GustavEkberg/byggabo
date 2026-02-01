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

const UpdateProjectInput = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1), S.maxLength(100)),
  description: S.optional(S.NullOr(S.String.pipe(S.maxLength(1000))))
});

type UpdateProjectInput = S.Schema.Type<typeof UpdateProjectInput>;

export const updateProjectAction = async (input: UpdateProjectInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateProjectInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid input: name required (1-100 chars)',
              field: 'name'
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

      const [project] = yield* db
        .update(schema.project)
        .set({
          name: parsed.name,
          description: parsed.description
        })
        .where(eq(schema.project.id, parsed.id))
        .returning();

      return project;
    }).pipe(
      Effect.withSpan('action.project.update', {
        attributes: { operation: 'project.update' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.tag('ValidationError', e =>
              Effect.succeed({ _tag: 'Error' as const, message: e.message })
            ),
            Match.tag('NotFoundError', e =>
              Effect.succeed({ _tag: 'Error' as const, message: e.message })
            ),
            Match.orElse(() =>
              Effect.succeed({ _tag: 'Error' as const, message: 'Failed to update project' })
            )
          ),
        onSuccess: project =>
          Effect.sync(() => {
            revalidatePath('/projects');
            revalidatePath(`/projects/${project.id}`);
            return { _tag: 'Success' as const, project };
          })
      })
    )
  );
};
