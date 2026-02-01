import { Effect } from 'effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the current user's property with all members.
 */
export const getPropertyWithMembers = () =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const [property] = yield* db
      .select()
      .from(schema.property)
      .where(eq(schema.property.id, propertyId))
      .limit(1);

    const members = yield* db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email
      })
      .from(schema.user)
      .where(eq(schema.user.propertyId, propertyId));

    return {
      property,
      members
    };
  }).pipe(Effect.withSpan('Property.getWithMembers'));

/**
 * Get pending invites for the current user's property.
 */
export const getPendingInvites = () =>
  Effect.gen(function* () {
    const { propertyId } = yield* getSessionWithProperty();
    const db = yield* Db;

    const invites = yield* db
      .select({
        id: schema.propertyInvite.id,
        email: schema.propertyInvite.email,
        createdAt: schema.propertyInvite.createdAt,
        expiresAt: schema.propertyInvite.expiresAt
      })
      .from(schema.propertyInvite)
      .where(eq(schema.propertyInvite.propertyId, propertyId));

    // Filter out expired and accepted invites
    const now = new Date();
    return invites.filter(i => i.expiresAt > now);
  }).pipe(Effect.withSpan('Property.getPendingInvites'));
