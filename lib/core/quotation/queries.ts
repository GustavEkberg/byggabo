import { Effect } from 'effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all quotations for a project with contact info.
 * Verifies user owns the project before returning.
 */
export const getQuotations = (projectId: string) =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    // Verify user owns the project
    const [project] = yield* db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(and(eq(schema.project.id, projectId), eq(schema.project.userId, user.id)))
      .limit(1);

    if (!project) {
      return yield* new NotFoundError({
        message: 'Project not found',
        entity: 'project',
        id: projectId
      });
    }

    const quotations = yield* db
      .select({
        quotation: schema.quotation,
        contact: {
          id: schema.contact.id,
          name: schema.contact.name,
          company: schema.contact.company
        }
      })
      .from(schema.quotation)
      .leftJoin(schema.contact, eq(schema.quotation.contactId, schema.contact.id))
      .where(eq(schema.quotation.projectId, projectId))
      .orderBy(desc(schema.quotation.receivedDate));

    return quotations.map(row => ({
      ...row.quotation,
      contact: row.contact
    }));
  }).pipe(Effect.withSpan('Quotation.getAll'));

/**
 * Get a single quotation by ID with contact info.
 * Verifies user owns the parent project.
 */
export const getQuotation = (quotationId: string) =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    const [result] = yield* db
      .select({
        quotation: schema.quotation,
        project: {
          id: schema.project.id,
          userId: schema.project.userId
        },
        contact: {
          id: schema.contact.id,
          name: schema.contact.name,
          company: schema.contact.company
        }
      })
      .from(schema.quotation)
      .innerJoin(schema.project, eq(schema.quotation.projectId, schema.project.id))
      .leftJoin(schema.contact, eq(schema.quotation.contactId, schema.contact.id))
      .where(eq(schema.quotation.id, quotationId))
      .limit(1);

    if (!result || result.project.userId !== user.id) {
      return yield* new NotFoundError({
        message: 'Quotation not found',
        entity: 'quotation',
        id: quotationId
      });
    }

    return {
      ...result.quotation,
      contact: result.contact
    };
  }).pipe(Effect.withSpan('Quotation.getById'));
