'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const AddCommentInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  description: S.String.pipe(S.minLength(1), S.maxLength(2000))
});

type AddCommentInput = S.Schema.Type<typeof AddCommentInput>;

export const addCommentAction = async (input: AddCommentInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(AddCommentInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Comment is required',
              field: 'description'
            })
        )
      );

      const session = yield* getSession();
      const db = yield* Db;

      // Verify user owns the project
      const [project] = yield* db
        .select({ id: schema.project.id })
        .from(schema.project)
        .where(
          and(eq(schema.project.id, parsed.projectId), eq(schema.project.userId, session.user.id))
        )
        .limit(1);

      if (!project) {
        return yield* new NotFoundError({
          message: 'Project not found',
          entity: 'project',
          id: parsed.projectId
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'project.id': parsed.projectId
      });

      const [logItem] = yield* db
        .insert(schema.logItem)
        .values({
          projectId: parsed.projectId,
          type: 'COMMENT',
          description: parsed.description
        })
        .returning();

      return logItem;
    }).pipe(
      Effect.withSpan('action.logItem.addComment', {
        attributes: { operation: 'logItem.addComment' }
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
                message: 'Failed to add comment'
              })
            )
          ),
        onSuccess: logItem =>
          Effect.sync(() => {
            revalidatePath(`/projects/${logItem.projectId}`);
            return { _tag: 'Success' as const, logItem };
          })
      })
    )
  );
};
