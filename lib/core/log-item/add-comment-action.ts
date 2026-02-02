'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const AttachmentInput = S.Struct({
  fileUrl: S.String.pipe(S.minLength(1)),
  fileName: S.String.pipe(S.minLength(1)),
  fileType: S.String.pipe(S.minLength(1))
});

const AddCommentInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  description: S.String.pipe(S.minLength(1), S.maxLength(2000)),
  mentionedContactIds: S.optional(S.Array(S.String)),
  attachments: S.optional(S.Array(AttachmentInput))
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

      const { propertyId, user } = yield* getSessionWithProperty();
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

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'project.id': parsed.projectId
      });

      // Verify mentioned contacts belong to property
      const mentionedContactIds = parsed.mentionedContactIds ?? [];
      if (mentionedContactIds.length > 0) {
        const validContacts = yield* db
          .select({ id: schema.contact.id })
          .from(schema.contact)
          .where(
            and(
              inArray(schema.contact.id, mentionedContactIds),
              eq(schema.contact.propertyId, propertyId)
            )
          );

        const validIds = new Set(validContacts.map(c => c.id));
        const invalidIds = mentionedContactIds.filter(id => !validIds.has(id));
        if (invalidIds.length > 0) {
          return yield* new ValidationError({
            message: 'Some mentioned contacts are invalid',
            field: 'mentionedContactIds'
          });
        }
      }

      const [logItem] = yield* db
        .insert(schema.logItem)
        .values({
          projectId: parsed.projectId,
          createdById: user.id,
          type: 'COMMENT',
          description: parsed.description
        })
        .returning();

      // Insert mentions
      if (mentionedContactIds.length > 0) {
        yield* db.insert(schema.logItemMention).values(
          mentionedContactIds.map(contactId => ({
            logItemId: logItem.id,
            contactId
          }))
        );

        // Auto-link mentioned contacts to project (ignore conflicts)
        for (const contactId of mentionedContactIds) {
          const [existing] = yield* db
            .select({ id: schema.projectContact.id })
            .from(schema.projectContact)
            .where(
              and(
                eq(schema.projectContact.projectId, parsed.projectId),
                eq(schema.projectContact.contactId, contactId)
              )
            )
            .limit(1);

          if (!existing) {
            yield* db.insert(schema.projectContact).values({
              projectId: parsed.projectId,
              contactId
            });
          }
        }
      }

      // Insert attachments
      const attachments = parsed.attachments ?? [];
      if (attachments.length > 0) {
        yield* db.insert(schema.logItemAttachment).values(
          attachments.map(attachment => ({
            logItemId: logItem.id,
            fileUrl: attachment.fileUrl,
            fileName: attachment.fileName,
            fileType: attachment.fileType
          }))
        );
      }

      return logItem;
    }).pipe(
      Effect.withSpan('action.logItem.addComment', {
        attributes: { operation: 'logItem.addComment' }
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
