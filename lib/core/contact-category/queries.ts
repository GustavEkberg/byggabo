import { Effect } from 'effect';
import { eq, asc } from 'drizzle-orm';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';

export const getContactCategories = (propertyId: string) =>
  Effect.gen(function* () {
    const db = yield* Db;

    return yield* db
      .select()
      .from(schema.contactCategory)
      .where(eq(schema.contactCategory.propertyId, propertyId))
      .orderBy(asc(schema.contactCategory.sortOrder));
  }).pipe(Effect.withSpan('ContactCategory.getAll'));
