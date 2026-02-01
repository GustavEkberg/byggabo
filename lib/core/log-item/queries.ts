import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/** Log item with creator info */
export type LogItemWithUser = {
  id: string;
  projectId: string;
  type: 'COST_ITEM' | 'QUOTATION' | 'INVOICE' | 'COMMENT';
  referenceId: string | null;
  description: string;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
};

/** Log item with project and creator info (for dashboard) */
export type LogItemWithProjectAndUser = LogItemWithUser & {
  project: { id: string; name: string };
};

/**
 * Get all log items for a project (timeline) with user info.
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

    const rows = yield* db
      .select({
        id: schema.logItem.id,
        projectId: schema.logItem.projectId,
        type: schema.logItem.type,
        referenceId: schema.logItem.referenceId,
        description: schema.logItem.description,
        createdAt: schema.logItem.createdAt,
        createdById: schema.logItem.createdById,
        userName: schema.user.name
      })
      .from(schema.logItem)
      .leftJoin(schema.user, eq(schema.logItem.createdById, schema.user.id))
      .where(eq(schema.logItem.projectId, projectId))
      .orderBy(desc(schema.logItem.createdAt));

    const logItems: LogItemWithUser[] = rows.map(row => ({
      id: row.id,
      projectId: row.projectId,
      type: row.type,
      referenceId: row.referenceId,
      description: row.description,
      createdAt: row.createdAt,
      createdBy: row.createdById ? { id: row.createdById, name: row.userName ?? 'Unknown' } : null
    }));

    return logItems;
  }).pipe(Effect.withSpan('LogItem.getAll'));

/**
 * Get recent log items across all projects for the property (dashboard timeline).
 */
export const getRecentLogItems = (limit = 20) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    // Get all project IDs for the property
    const projects = yield* db
      .select({ id: schema.project.id, name: schema.project.name })
      .from(schema.project)
      .where(and(eq(schema.project.propertyId, propertyId), eq(schema.project.status, 'ACTIVE')));

    if (projects.length === 0) {
      const empty: LogItemWithProjectAndUser[] = [];
      return empty;
    }

    const projectIds = projects.map(p => p.id);
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const rows = yield* db
      .select({
        id: schema.logItem.id,
        projectId: schema.logItem.projectId,
        type: schema.logItem.type,
        referenceId: schema.logItem.referenceId,
        description: schema.logItem.description,
        createdAt: schema.logItem.createdAt,
        createdById: schema.logItem.createdById,
        userName: schema.user.name
      })
      .from(schema.logItem)
      .leftJoin(schema.user, eq(schema.logItem.createdById, schema.user.id))
      .where(inArray(schema.logItem.projectId, projectIds))
      .orderBy(desc(schema.logItem.createdAt))
      .limit(limit);

    const logItems: LogItemWithProjectAndUser[] = rows.map(row => {
      const project = projectMap.get(row.projectId);
      return {
        id: row.id,
        projectId: row.projectId,
        type: row.type,
        referenceId: row.referenceId,
        description: row.description,
        createdAt: row.createdAt,
        createdBy: row.createdById
          ? { id: row.createdById, name: row.userName ?? 'Unknown' }
          : null,
        project: { id: row.projectId, name: project?.name ?? 'Unknown' }
      };
    });

    return logItems;
  }).pipe(Effect.withSpan('LogItem.getRecent'));
