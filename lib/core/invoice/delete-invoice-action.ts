'use server';

import { Effect, Match, Option } from 'effect';
import { revalidatePath } from 'next/cache';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import { S3 } from '@/lib/services/s3/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

export const deleteInvoiceAction = async (invoiceId: string) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      // Get invoice with project to verify ownership
      const [existing] = yield* db
        .select({
          invoice: schema.invoice,
          project: {
            id: schema.project.id,
            propertyId: schema.project.propertyId
          }
        })
        .from(schema.invoice)
        .innerJoin(schema.project, eq(schema.invoice.projectId, schema.project.id))
        .where(eq(schema.invoice.id, invoiceId))
        .limit(1);

      if (!existing || existing.project.propertyId !== propertyId) {
        return yield* new NotFoundError({
          message: 'Invoice not found',
          entity: 'invoice',
          id: invoiceId
        });
      }

      const projectId = existing.project.id;
      const fileUrl = existing.invoice.fileUrl;

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'invoice.id': invoiceId,
        'project.id': projectId
      });

      // Delete S3 file if exists
      yield* Option.fromNullable(fileUrl).pipe(
        Option.match({
          onNone: () => Effect.void,
          onSome: url =>
            Effect.gen(function* () {
              const s3 = yield* S3;
              const key = s3.getObjectKeyFromUrl(url);
              yield* s3.deleteFile(key);
            }).pipe(
              Effect.tapError(e =>
                Effect.logWarning('Failed to delete S3 file for invoice', {
                  invoiceId,
                  fileUrl: url,
                  error: e
                })
              ),
              Effect.catchAll(() => Effect.void) // Don't fail deletion if S3 cleanup fails
            )
        })
      );

      // Delete associated log items first
      yield* db.delete(schema.logItem).where(eq(schema.logItem.referenceId, invoiceId));

      // Delete the invoice
      yield* db.delete(schema.invoice).where(eq(schema.invoice.id, invoiceId));

      return { projectId };
    }).pipe(
      Effect.withSpan('action.invoice.delete', {
        attributes: { operation: 'invoice.delete' }
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
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to delete invoice'
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
