import { Effect } from 'effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

type GetProjectsParams = {
  includeArchived?: boolean;
};

export const getProjects = (params: GetProjectsParams = {}) =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    const conditions: SQL[] = [eq(schema.project.userId, user.id)];

    if (!params.includeArchived) {
      conditions.push(eq(schema.project.status, 'ACTIVE'));
    }

    const projects = yield* db
      .select()
      .from(schema.project)
      .where(and(...conditions))
      .orderBy(desc(schema.project.createdAt));

    return projects;
  }).pipe(Effect.withSpan('Project.getAll'));

export const getProject = (projectId: string) =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    const [project] = yield* db
      .select()
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

    return project;
  }).pipe(Effect.withSpan('Project.getById'));
