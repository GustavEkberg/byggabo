import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Get all property sections for the authenticated user's property.
 */
export const getSections = () =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const sections = yield* db
      .select()
      .from(schema.propertySection)
      .where(eq(schema.propertySection.propertyId, propertyId))
      .orderBy(asc(schema.propertySection.sortOrder));

    return sections;
  }).pipe(Effect.withSpan('PropertySection.getAll'));
