import { Effect } from 'effect';
import { getSession } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
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

export type ProjectWithSummary = schema.Project & {
  estimated: number;
  actual: number;
  quotationCount: number;
  costItemCount: number;
  invoiceCount: number;
};

export const getProjectsWithSummary = (params: GetProjectsParams = {}) =>
  Effect.gen(function* () {
    const { user } = yield* getSession();
    const db = yield* Db;

    const conditions: SQL[] = [eq(schema.project.userId, user.id)];

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
        userId: schema.project.userId,
        createdAt: schema.project.createdAt,
        updatedAt: schema.project.updatedAt,
        // Estimated: sum of accepted quotations
        estimated: sql<number>`COALESCE((
          SELECT SUM(CAST(${schema.quotation.amount} AS DECIMAL))
          FROM ${schema.quotation}
          WHERE ${schema.quotation.projectId} = ${schema.project.id}
          AND ${schema.quotation.status} = 'ACCEPTED'
        ), 0)`,
        // Actual: sum of cost items + invoices
        actual: sql<number>`COALESCE((
          SELECT SUM(CAST(${schema.costItem.amount} AS DECIMAL))
          FROM ${schema.costItem}
          WHERE ${schema.costItem.projectId} = ${schema.project.id}
        ), 0) + COALESCE((
          SELECT SUM(CAST(${schema.invoice.amount} AS DECIMAL))
          FROM ${schema.invoice}
          WHERE ${schema.invoice.projectId} = ${schema.project.id}
        ), 0)`,
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
        estimated: Number(p.estimated),
        actual: Number(p.actual),
        quotationCount: Number(p.quotationCount),
        costItemCount: Number(p.costItemCount),
        invoiceCount: Number(p.invoiceCount)
      })
    );
  }).pipe(Effect.withSpan('Project.getAllWithSummary'));

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
