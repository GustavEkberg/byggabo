import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '@/lib/core/errors';

/**
 * Get all cost items for a project.
 * Verifies project belongs to user's property.
 */
export const getCostItems = (projectId: string) =>
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

    const costItems = yield* db
      .select()
      .from(schema.costItem)
      .where(eq(schema.costItem.projectId, projectId))
      .orderBy(desc(schema.costItem.date));

    return costItems;
  }).pipe(Effect.withSpan('CostItem.getAll'));

/**
 * Get a single cost item by ID.
 * Verifies parent project belongs to user's property.
 */
export const getCostItem = (costItemId: string) =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const [costItem] = yield* db
      .select({
        costItem: schema.costItem,
        project: {
          id: schema.project.id,
          propertyId: schema.project.propertyId
        }
      })
      .from(schema.costItem)
      .innerJoin(schema.project, eq(schema.costItem.projectId, schema.project.id))
      .where(eq(schema.costItem.id, costItemId))
      .limit(1);

    if (!costItem || costItem.project.propertyId !== propertyId) {
      return yield* new NotFoundError({
        message: 'Cost item not found',
        entity: 'costItem',
        id: costItemId
      });
    }

    return costItem.costItem;
  }).pipe(Effect.withSpan('CostItem.getById'));
