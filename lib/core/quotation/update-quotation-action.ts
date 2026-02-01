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

const UpdateQuotationInput = S.Struct({
  quotationId: S.String.pipe(S.minLength(1)),
  contactId: S.optional(S.NullOr(S.String)),
  description: S.optional(S.String.pipe(S.minLength(1), S.maxLength(2000))),
  amount: S.optional(S.String.pipe(S.minLength(1))),
  status: S.optional(S.Literal('PENDING', 'ACCEPTED', 'REJECTED')),
  receivedDate: S.optional(S.DateFromString),
  fileUrl: S.optional(S.NullOr(S.String))
});

type UpdateQuotationInput = S.Schema.Encoded<typeof UpdateQuotationInput>;

export const updateQuotationAction = async (input: UpdateQuotationInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateQuotationInput)(input).pipe(
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

      // Get quotation and verify project belongs to property
      const [existing] = yield* db
        .select({
          quotation: schema.quotation,
          project: {
            id: schema.project.id,
            propertyId: schema.project.propertyId
          }
        })
        .from(schema.quotation)
        .innerJoin(schema.project, eq(schema.quotation.projectId, schema.project.id))
        .where(eq(schema.quotation.id, parsed.quotationId))
        .limit(1);

      if (!existing || existing.project.propertyId !== propertyId) {
        return yield* new NotFoundError({
          message: 'Quotation not found',
          entity: 'quotation',
          id: parsed.quotationId
        });
      }

      // If contactId provided, verify contact belongs to property
      if (parsed.contactId !== undefined && parsed.contactId !== null) {
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
        'quotation.id': parsed.quotationId
      });

      // Build update object only with provided fields
      const updateData: Partial<schema.InsertQuotation> = {};
      if (parsed.description !== undefined) updateData.description = parsed.description;
      if (parsed.amount !== undefined) updateData.amount = parsed.amount;
      if (parsed.status !== undefined) updateData.status = parsed.status;
      if (parsed.receivedDate !== undefined) updateData.receivedDate = parsed.receivedDate;
      if (parsed.contactId !== undefined) updateData.contactId = parsed.contactId;
      if (parsed.fileUrl !== undefined) updateData.fileUrl = parsed.fileUrl;

      const [quotation] = yield* db
        .update(schema.quotation)
        .set(updateData)
        .where(eq(schema.quotation.id, parsed.quotationId))
        .returning();

      // Create log item if status changed
      if (parsed.status !== undefined && parsed.status !== existing.quotation.status) {
        yield* db.insert(schema.logItem).values({
          projectId: quotation.projectId,
          type: 'QUOTATION',
          referenceId: quotation.id,
          description: `Quotation status changed to ${parsed.status.toLowerCase()}`
        });
      }

      return quotation;
    }).pipe(
      Effect.withSpan('action.quotation.update', {
        attributes: { operation: 'quotation.update' }
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
                message: 'Failed to update quotation'
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
