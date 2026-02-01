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

const ConvertToInvoiceInput = S.Struct({
  quotationId: S.String.pipe(S.minLength(1)),
  invoiceDate: S.optional(S.Date),
  fileUrl: S.optional(S.NullOr(S.String))
});

type ConvertToInvoiceInput = S.Schema.Type<typeof ConvertToInvoiceInput>;

export const convertToInvoiceAction = async (input: ConvertToInvoiceInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(ConvertToInvoiceInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid input data',
              field: 'input'
            })
        )
      );

      const session = yield* getSession();
      const db = yield* Db;

      // Get quotation and verify user owns the parent project
      const [quotationResult] = yield* db
        .select({
          quotation: schema.quotation,
          project: {
            id: schema.project.id,
            userId: schema.project.userId
          }
        })
        .from(schema.quotation)
        .innerJoin(schema.project, eq(schema.quotation.projectId, schema.project.id))
        .where(eq(schema.quotation.id, parsed.quotationId))
        .limit(1);

      if (!quotationResult || quotationResult.project.userId !== session.user.id) {
        return yield* new NotFoundError({
          message: 'Quotation not found',
          entity: 'quotation',
          id: parsed.quotationId
        });
      }

      const { quotation, project } = quotationResult;

      // Verify quotation is accepted
      if (quotation.status !== 'ACCEPTED') {
        return yield* new ValidationError({
          message: 'Only accepted quotations can be converted to invoices',
          field: 'status'
        });
      }

      // Check if invoice already exists for this quotation
      const [existingInvoice] = yield* db
        .select({ id: schema.invoice.id })
        .from(schema.invoice)
        .where(eq(schema.invoice.quotationId, quotation.id))
        .limit(1);

      if (existingInvoice) {
        return yield* new ValidationError({
          message: 'An invoice already exists for this quotation',
          field: 'quotationId'
        });
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'quotation.id': quotation.id,
        'project.id': project.id
      });

      // Create invoice from quotation
      const [invoice] = yield* db
        .insert(schema.invoice)
        .values({
          projectId: quotation.projectId,
          quotationId: quotation.id,
          contactId: quotation.contactId,
          description: quotation.description,
          amount: quotation.amount,
          invoiceDate: parsed.invoiceDate ?? new Date(),
          isPaid: false,
          fileUrl: parsed.fileUrl ?? null
        })
        .returning();

      // Create log item for the new invoice
      yield* db.insert(schema.logItem).values({
        projectId: invoice.projectId,
        type: 'INVOICE',
        referenceId: invoice.id,
        description: `Invoice created from quotation: ${invoice.description}`
      });

      return invoice;
    }).pipe(
      Effect.withSpan('action.invoice.convertFromQuotation', {
        attributes: { operation: 'invoice.convert' }
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
                message: 'Failed to create invoice'
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
