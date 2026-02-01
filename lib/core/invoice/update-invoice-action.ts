'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

const UpdateInvoiceInput = S.Struct({
  invoiceId: S.String.pipe(S.minLength(1)),
  description: S.optional(S.String.pipe(S.minLength(1), S.maxLength(2000))),
  amount: S.optional(S.String.pipe(S.minLength(1))),
  invoiceDate: S.optional(S.Date),
  isPaid: S.optional(S.Boolean),
  fileUrl: S.optional(S.NullOr(S.String)),
  contactId: S.optional(S.NullOr(S.String))
});

type UpdateInvoiceInput = S.Schema.Type<typeof UpdateInvoiceInput>;

export const updateInvoiceAction = async (input: UpdateInvoiceInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(UpdateInvoiceInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid invoice data',
              field: 'input'
            })
        )
      );

      const session = yield* getSession();
      const db = yield* Db;

      // Get invoice and verify user owns the parent project
      const [existing] = yield* db
        .select({
          invoice: schema.invoice,
          project: {
            id: schema.project.id,
            userId: schema.project.userId
          }
        })
        .from(schema.invoice)
        .innerJoin(schema.project, eq(schema.invoice.projectId, schema.project.id))
        .where(eq(schema.invoice.id, parsed.invoiceId))
        .limit(1);

      if (!existing || existing.project.userId !== session.user.id) {
        return yield* new NotFoundError({
          message: 'Invoice not found',
          entity: 'invoice',
          id: parsed.invoiceId
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'invoice.id': parsed.invoiceId
      });

      // Build update object only with provided fields
      const updateData: Partial<schema.InsertInvoice> = {};
      if (parsed.description !== undefined) updateData.description = parsed.description;
      if (parsed.amount !== undefined) updateData.amount = parsed.amount;
      if (parsed.invoiceDate !== undefined) updateData.invoiceDate = parsed.invoiceDate;
      if (parsed.isPaid !== undefined) updateData.isPaid = parsed.isPaid;
      if (parsed.fileUrl !== undefined) updateData.fileUrl = parsed.fileUrl;
      if (parsed.contactId !== undefined) updateData.contactId = parsed.contactId;

      const [invoice] = yield* db
        .update(schema.invoice)
        .set(updateData)
        .where(eq(schema.invoice.id, parsed.invoiceId))
        .returning();

      // Create log item if isPaid changed
      if (parsed.isPaid !== undefined && parsed.isPaid !== existing.invoice.isPaid) {
        yield* db.insert(schema.logItem).values({
          projectId: invoice.projectId,
          type: 'INVOICE',
          referenceId: invoice.id,
          description: parsed.isPaid ? 'Invoice marked as paid' : 'Invoice marked as unpaid'
        });
      }

      return invoice;
    }).pipe(
      Effect.withSpan('action.invoice.update', {
        attributes: { operation: 'invoice.update' }
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
                message: 'Failed to update invoice'
              })
            )
          ),
        onSuccess: invoice =>
          Effect.sync(() => {
            revalidatePath(`/projects/${invoice.projectId}`);
            return { _tag: 'Success' as const, invoice };
          })
      })
    )
  );
};
