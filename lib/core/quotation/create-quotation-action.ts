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

const CreateQuotationInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  contactId: S.optional(S.NullOr(S.String)),
  description: S.String.pipe(S.minLength(1), S.maxLength(2000)),
  amount: S.String.pipe(S.minLength(1)), // Decimal as string
  status: S.optional(S.Literal('PENDING', 'ACCEPTED', 'REJECTED')),
  receivedDate: S.DateFromString,
  fileUrl: S.optional(S.String)
});

type CreateQuotationInput = S.Schema.Encoded<typeof CreateQuotationInput>;

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

      // If contactId provided, verify contact belongs to property
      if (parsed.contactId) {
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
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
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
        createdById: user.id,
        type: 'QUOTATION',
        referenceId: quotation.id,
        description: `Received quotation: ${parsed.description.slice(0, 50)}${parsed.description.length > 50 ? '...' : ''} - ${parsed.amount} kr`
      });

      // Auto-link contact to project if provided
      if (parsed.contactId) {
        const [existingLink] = yield* db
          .select({ id: schema.projectContact.id })
          .from(schema.projectContact)
          .where(
            and(
              eq(schema.projectContact.projectId, parsed.projectId),
              eq(schema.projectContact.contactId, parsed.contactId)
            )
          )
          .limit(1);

        if (!existingLink) {
          yield* db.insert(schema.projectContact).values({
            projectId: parsed.projectId,
            contactId: parsed.contactId
          });
        }
      }

      return quotation;
    }).pipe(
      Effect.withSpan('action.quotation.create', {
        attributes: { operation: 'quotation.create' }
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
