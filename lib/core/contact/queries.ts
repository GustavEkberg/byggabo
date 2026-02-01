import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all contacts for the authenticated user's property.
 */
export const getContacts = () =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const contacts = yield* db
      .select()
      .from(schema.contact)
      .where(eq(schema.contact.propertyId, propertyId))
      .orderBy(desc(schema.contact.createdAt));

    return contacts;
  }).pipe(Effect.withSpan('Contact.getAll'));

/**
 * Get a single contact by ID.
 * Verifies contact belongs to user's property.
 */
export const getContact = (contactId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const [contact] = yield* db
      .select()
      .from(schema.contact)
      .where(and(eq(schema.contact.id, contactId), eq(schema.contact.propertyId, propertyId)))
      .limit(1);

    if (!contact) {
      return yield* new NotFoundError({
        message: 'Contact not found',
        entity: 'contact',
        id: contactId
      });
    }

    return contact;
  }).pipe(Effect.withSpan('Contact.getById'));
