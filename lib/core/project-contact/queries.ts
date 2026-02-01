import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get all contacts linked to a project.
 * Returns full contact objects.
 */
export const getProjectContacts = (projectId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    // Verify project belongs to property and get linked contacts
    const results = yield* db
      .select({
        contact: schema.contact
      })
      .from(schema.projectContact)
      .innerJoin(schema.contact, eq(schema.projectContact.contactId, schema.contact.id))
      .innerJoin(schema.project, eq(schema.projectContact.projectId, schema.project.id))
      .where(
        and(
          eq(schema.projectContact.projectId, projectId),
          eq(schema.project.propertyId, propertyId)
        )
      );

    return results.map(r => r.contact);
  }).pipe(Effect.withSpan('ProjectContact.getAll'));

/**
 * Check if a contact is linked to a project.
 */
export const isContactLinked = (projectId: string, contactId: string) =>
  Effect.gen(function* () {
    const db = yield* Db;

    const [existing] = yield* db
      .select({ id: schema.projectContact.id })
      .from(schema.projectContact)
      .where(
        and(
          eq(schema.projectContact.projectId, projectId),
          eq(schema.projectContact.contactId, contactId)
        )
      )
      .limit(1);

    return !!existing;
  }).pipe(Effect.withSpan('ProjectContact.isLinked'));
