'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import { S3 } from '@/lib/services/s3/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { ValidationError, NotFoundError, UnauthorizedError } from '@/lib/core/errors';

const DeleteAttachmentInput = S.Struct({
  attachmentId: S.String.pipe(S.minLength(1))
});

type DeleteAttachmentInput = S.Schema.Type<typeof DeleteAttachmentInput>;

export const deleteAttachmentAction = async (input: DeleteAttachmentInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(DeleteAttachmentInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid input',
              field: 'input'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      // Get attachment with log item and project info
      const [existing] = yield* db
        .select({
          attachment: schema.logItemAttachment,
          logItem: {
            id: schema.logItem.id,
            createdById: schema.logItem.createdById,
            projectId: schema.logItem.projectId
          },
          project: {
            id: schema.project.id,
            propertyId: schema.project.propertyId
          }
        })
        .from(schema.logItemAttachment)
        .innerJoin(schema.logItem, eq(schema.logItemAttachment.logItemId, schema.logItem.id))
        .innerJoin(schema.project, eq(schema.logItem.projectId, schema.project.id))
        .where(eq(schema.logItemAttachment.id, parsed.attachmentId))
        .limit(1);

      if (!existing || existing.project.propertyId !== propertyId) {
        return yield* new NotFoundError({
          message: 'Attachment not found',
          entity: 'logItemAttachment',
          id: parsed.attachmentId
        });
      }

      // Only allow deleting attachments from own log items
      if (existing.logItem.createdById !== user.id) {
        return yield* new UnauthorizedError({
          message: 'You can only delete attachments from your own comments'
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'attachment.id': parsed.attachmentId,
        'logItem.id': existing.logItem.id
      });

      // Delete S3 file
      const s3 = yield* S3;
      const key = s3.getObjectKeyFromUrl(existing.attachment.fileUrl);
      yield* s3.deleteFile(key).pipe(
        Effect.tapError(e =>
          Effect.logWarning('Failed to delete S3 file for attachment', {
            attachmentId: parsed.attachmentId,
            fileUrl: existing.attachment.fileUrl,
            error: e
          })
        ),
        Effect.catchAll(() => Effect.void)
      );

      // Delete the attachment record
      yield* db
        .delete(schema.logItemAttachment)
        .where(eq(schema.logItemAttachment.id, parsed.attachmentId));

      return { projectId: existing.logItem.projectId };
    }).pipe(
      Effect.withSpan('action.logItemAttachment.delete', {
        attributes: { operation: 'logItemAttachment.delete' }
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
            Match.tag('UnauthorizedError', e =>
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
                message: 'Failed to delete attachment'
              })
            )
          ),
        onSuccess: ({ projectId }) =>
          Effect.sync(() => {
            revalidatePath(`/projects/${projectId}`);
            return { _tag: 'Success' as const };
          })
      })
    )
  );
};
