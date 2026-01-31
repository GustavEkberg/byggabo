'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { ValidationError } from '@/lib/core/errors';

const CreateProjectInput = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(100)),
  description: S.optional(S.String.pipe(S.maxLength(1000)))
});

type CreateProjectInput = S.Schema.Type<typeof CreateProjectInput>;

export const createProjectAction = async (input: CreateProjectInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateProjectInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Project name is required (1-100 characters)',
              field: 'name'
            })
        )
      );

      const session = yield* getSession();
      const db = yield* Db;

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'project.name': parsed.name
      });

      const [project] = yield* db
        .insert(schema.project)
        .values({
          name: parsed.name,
          description: parsed.description,
          userId: session.user.id
        })
        .returning();

      return project;
    }).pipe(
      Effect.withSpan('action.project.create', {
        attributes: { operation: 'project.create' }
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
                message: 'Failed to create project'
              })
            )
          ),
        onSuccess: project =>
          Effect.sync(() => {
            revalidatePath('/projects');
            return { _tag: 'Success' as const, project };
          })
      })
    )
  );
};
