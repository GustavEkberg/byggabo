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

const CreateQuotationInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  contactId: S.optional(S.NullOr(S.String)),
  description: S.String.pipe(S.minLength(1), S.maxLength(2000)),
  amount: S.String.pipe(S.minLength(1)), // Decimal as string
  status: S.optional(S.Literal('PENDING', 'ACCEPTED', 'REJECTED')),
  receivedDate: S.Date,
  fileUrl: S.optional(S.String)
});

type CreateQuotationInput = S.Schema.Type<typeof CreateQuotationInput>;

export const createQuotationAction = async (input: CreateQuotationInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateQuotationInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid quotation data',
              field: 'input'
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

      // If contactId provided, verify user owns the contact
      if (parsed.contactId) {
        const [contact] = yield* db
          .select({ id: schema.contact.id })
          .from(schema.contact)
          .where(
            and(eq(schema.contact.id, parsed.contactId), eq(schema.contact.userId, session.user.id))
          )
          .limit(1);

        if (!contact) {
          return yield* new NotFoundError({
            message: 'Contact not found',
            entity: 'contact',
            id: parsed.contactId
          });
        }
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'project.id': parsed.projectId,
        'quotation.amount': parsed.amount
      });

      const [quotation] = yield* db
        .insert(schema.quotation)
        .values({
          projectId: parsed.projectId,
          contactId: parsed.contactId ?? null,
          description: parsed.description,
          amount: parsed.amount,
          status: parsed.status ?? 'PENDING',
          receivedDate: parsed.receivedDate,
          fileUrl: parsed.fileUrl
        })
        .returning();

      // Create log item for timeline
      yield* db.insert(schema.logItem).values({
        projectId: parsed.projectId,
        type: 'QUOTATION',
        referenceId: quotation.id,
        description: `Received quotation: ${parsed.description.slice(0, 50)}${parsed.description.length > 50 ? '...' : ''} - ${parsed.amount} kr`
      });

      return quotation;
    }).pipe(
      Effect.withSpan('action.quotation.create', {
        attributes: { operation: 'quotation.create' }
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
                message: 'Failed to create quotation'
              })
            )
          ),
        onSuccess: quotation =>
          Effect.sync(() => {
            revalidatePath(`/projects/${quotation.projectId}`);
            return { _tag: 'Success' as const, quotation };
          })
      })
    )
  );
};
