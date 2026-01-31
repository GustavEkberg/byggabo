import { Effect } from 'effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all contacts for the authenticated user.
 */
export const getContacts = () =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    const contacts = yield* db
      .select()
      .from(schema.contact)
      .where(eq(schema.contact.userId, user.id))
      .orderBy(desc(schema.contact.createdAt));

    return contacts;
  }).pipe(Effect.withSpan('Contact.getAll'));

/**
 * Get a single contact by ID.
 * Verifies user owns the contact.
 */
export const getContact = (contactId: string) =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    const [contact] = yield* db
      .select()
      .from(schema.contact)
      .where(eq(schema.contact.id, contactId))
      .limit(1);

    if (!contact || contact.userId !== user.id) {
      return yield* new NotFoundError({
        message: 'Contact not found',
        entity: 'contact',
        id: contactId
      });
    }

    return contact;
  }).pipe(Effect.withSpan('Contact.getById'));
