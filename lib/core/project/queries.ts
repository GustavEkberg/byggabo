import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

type GetProjectsParams = {
  includeArchived?: boolean;
};

export const getProjects = (params: GetProjectsParams = {}) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const conditions: SQL[] = [eq(schema.project.propertyId, propertyId)];

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

export type ProjectWithSummary = schema.Project & {
  lastActivityAt: Date | null;
  quotationCount: number;
  costItemCount: number;
  invoiceCount: number;
};

export const getProjectsWithSummary = (params: GetProjectsParams = {}) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const conditions: SQL[] = [eq(schema.project.propertyId, propertyId)];

    if (!params.includeArchived) {
      conditions.push(eq(schema.project.status, 'ACTIVE'));
    }

    // Get projects with aggregated financial data
    const projects = yield* db
      .select({
        id: schema.project.id,
        name: schema.project.name,
        description: schema.project.description,
        status: schema.project.status,
        propertyId: schema.project.propertyId,
        sectionId: schema.project.sectionId,
        createdAt: schema.project.createdAt,
        updatedAt: schema.project.updatedAt,
        // Last activity: most recent log item
        lastActivityAt: sql<string | null>`(
          SELECT MAX("createdAt")
          FROM "logItem"
          WHERE "logItem"."projectId" = "project"."id"
        )`,
        // Counts
        quotationCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${schema.quotation}
          WHERE ${schema.quotation.projectId} = ${schema.project.id}
        )`,
        costItemCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${schema.costItem}
          WHERE ${schema.costItem.projectId} = ${schema.project.id}
        )`,
        invoiceCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${schema.invoice}
          WHERE ${schema.invoice.projectId} = ${schema.project.id}
        )`
      })
      .from(schema.project)
      .where(and(...conditions))
      .orderBy(desc(schema.project.createdAt));

    // Convert SQL results to proper types
    return projects.map(
      (p): ProjectWithSummary => ({
        ...p,
        lastActivityAt: p.lastActivityAt ? new Date(p.lastActivityAt) : null,
        quotationCount: Number(p.quotationCount),
        costItemCount: Number(p.costItemCount),
        invoiceCount: Number(p.invoiceCount)
      })
    );
  }).pipe(Effect.withSpan('Project.getAllWithSummary'));

export const getProject = (projectId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const [project] = yield* db
      .select()
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

    return project;
  }).pipe(Effect.withSpan('Project.getById'));
