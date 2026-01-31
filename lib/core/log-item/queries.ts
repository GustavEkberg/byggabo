import { Effect } from 'effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all log items for a project (timeline).
 * Verifies user owns the project before returning.
 */
export const getLogItems = (projectId: string) =>
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

    const logItems = yield* db
      .select()
      .from(schema.logItem)
      .where(eq(schema.logItem.projectId, projectId))
      .orderBy(desc(schema.logItem.createdAt));

    return logItems;
  }).pipe(Effect.withSpan('LogItem.getAll'));
