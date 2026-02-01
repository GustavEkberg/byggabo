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

const CreateInvoiceInput = S.Struct({
  projectId: S.String.pipe(S.minLength(1)),
  description: S.String.pipe(S.minLength(1), S.maxLength(2000)),
  amount: S.String.pipe(S.minLength(1)),
  invoiceDate: S.optional(S.DateFromString),
  fileUrl: S.optional(S.NullOr(S.String)),
  quotationId: S.optional(S.NullOr(S.String)),
  contactId: S.optional(S.NullOr(S.String))
});

type CreateInvoiceInput = S.Schema.Encoded<typeof CreateInvoiceInput>;

export const createInvoiceAction = async (input: CreateInvoiceInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateInvoiceInput)(input).pipe(
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

      // Verify user owns the project
      const [project] = yield* db
        .select({ id: schema.project.id, userId: schema.project.userId })
        .from(schema.project)
        .where(eq(schema.project.id, parsed.projectId))
        .limit(1);

      if (!project || project.userId !== session.user.id) {
        return yield* new NotFoundError({
          message: 'Project not found',
          entity: 'project',
          id: parsed.projectId
        });
      }

      // If quotationId provided, verify it exists and is accepted
      if (parsed.quotationId) {
        const [quotation] = yield* db
          .select({
            id: schema.quotation.id,
            status: schema.quotation.status,
            projectId: schema.quotation.projectId
          })
          .from(schema.quotation)
          .where(eq(schema.quotation.id, parsed.quotationId))
          .limit(1);

        if (!quotation || quotation.projectId !== parsed.projectId) {
          return yield* new ValidationError({
            message: 'Quotation not found or does not belong to this project',
            field: 'quotationId'
          });
        }

        if (quotation.status !== 'ACCEPTED') {
          return yield* new ValidationError({
            message: 'Only accepted quotations can be linked to invoices',
            field: 'quotationId'
          });
        }

        // Check if invoice already exists for this quotation
        const [existingInvoice] = yield* db
          .select({ id: schema.invoice.id })
          .from(schema.invoice)
          .where(eq(schema.invoice.quotationId, parsed.quotationId))
          .limit(1);

        if (existingInvoice) {
          return yield* new ValidationError({
            message: 'An invoice already exists for this quotation',
            field: 'quotationId'
          });
        }
      }

      yield* Effect.annotateCurrentSpan({
        'user.id': session.user.id,
        'project.id': parsed.projectId
      });

      // Create invoice
      const [invoice] = yield* db
        .insert(schema.invoice)
        .values({
          projectId: parsed.projectId,
          quotationId: parsed.quotationId ?? null,
          contactId: parsed.contactId ?? null,
          description: parsed.description,
          amount: parsed.amount,
          invoiceDate: parsed.invoiceDate ?? new Date(),
          isPaid: false,
          fileUrl: parsed.fileUrl ?? null
        })
        .returning();

      // Create log item
      const logDescription = parsed.quotationId
        ? `Invoice created from quotation: ${invoice.description}`
        : `Invoice created: ${invoice.description}`;

      yield* db.insert(schema.logItem).values({
        projectId: invoice.projectId,
        type: 'INVOICE',
        referenceId: invoice.id,
        description: logDescription
      });

      return invoice;
    }).pipe(
      Effect.withSpan('action.invoice.create', {
        attributes: { operation: 'invoice.create' }
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
