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

/**
 * Default sections to seed for new properties.
 */
export const DEFAULT_SECTIONS = [
  { name: 'Kitchen', color: '#ef4444', sortOrder: '0' },
  { name: 'Bathroom', color: '#3b82f6', sortOrder: '1' },
  { name: 'Living Room', color: '#22c55e', sortOrder: '2' },
  { name: 'Bedroom', color: '#a855f7', sortOrder: '3' },
  { name: 'Garden', color: '#84cc16', sortOrder: '4' },
  { name: 'Garage', color: '#6b7280', sortOrder: '5' },
  { name: 'Other', color: '#f59e0b', sortOrder: '6' }
] as const;
