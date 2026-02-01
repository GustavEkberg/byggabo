import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all invoices for a project with quotation info.
 * Verifies project belongs to user's property.
 */
export const getInvoices = (projectId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    // Verify project belongs to property
    const [project] = yield* db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(and(eq(schema.project.id, projectId), eq(schema.project.propertyId, propertyId)))
      .limit(1);

    if (!project) {
      return yield* new NotFoundError({
        message: 'Project not found',
        entity: 'project',
        id: projectId
      });
    }

    const invoices = yield* db
      .select({
        invoice: schema.invoice,
        quotation: {
          id: schema.quotation.id,
          description: schema.quotation.description,
          contactId: schema.quotation.contactId
        },
        contact: {
          id: schema.contact.id,
          name: schema.contact.name,
          company: schema.contact.company
        }
      })
      .from(schema.invoice)
      .leftJoin(schema.quotation, eq(schema.invoice.quotationId, schema.quotation.id))
      .leftJoin(schema.contact, eq(schema.invoice.contactId, schema.contact.id))
      .where(eq(schema.invoice.projectId, projectId))
      .orderBy(desc(schema.invoice.invoiceDate));

    return invoices.map(row => ({
      ...row.invoice,
      quotation: row.quotation,
      contact: row.contact
    }));
  }).pipe(Effect.withSpan('Invoice.getAll'));

/**
 * Get a single invoice by ID with quotation info.
 * Verifies parent project belongs to user's property.
 */
export const getInvoice = (invoiceId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const [result] = yield* db
      .select({
        invoice: schema.invoice,
        project: {
          id: schema.project.id,
          propertyId: schema.project.propertyId
        },
        quotation: {
          id: schema.quotation.id,
          description: schema.quotation.description,
          contactId: schema.quotation.contactId
        },
        contact: {
          id: schema.contact.id,
          name: schema.contact.name,
          company: schema.contact.company
        }
      })
      .from(schema.invoice)
      .innerJoin(schema.project, eq(schema.invoice.projectId, schema.project.id))
      .leftJoin(schema.quotation, eq(schema.invoice.quotationId, schema.quotation.id))
      .leftJoin(schema.contact, eq(schema.invoice.contactId, schema.contact.id))
      .where(eq(schema.invoice.id, invoiceId))
      .limit(1);

    if (!result || result.project.propertyId !== propertyId) {
      return yield* new NotFoundError({
        message: 'Invoice not found',
        entity: 'invoice',
        id: invoiceId
      });
    }

    return {
      ...result.invoice,
      quotation: result.quotation,
      contact: result.contact
    };
  }).pipe(Effect.withSpan('Invoice.getById'));
