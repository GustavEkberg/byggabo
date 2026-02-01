import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all log items for a project (timeline).
 * Verifies project belongs to user's property.
 */
export const getLogItems = (projectId: string) =>
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

    const logItems = yield* db
      .select()
      .from(schema.logItem)
      .where(eq(schema.logItem.projectId, projectId))
      .orderBy(desc(schema.logItem.createdAt));

    return logItems;
  }).pipe(Effect.withSpan('LogItem.getAll'));
