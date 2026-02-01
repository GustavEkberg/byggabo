import { Effect } from 'effect';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@/lib/core/errors';

/**
 * Get a valid (not expired, not accepted) invite by token.
 * This is used on the invite page to show invite details before sign-up.
 */
export const getInviteByToken = (token: string) =>
  Effect.gen(function* () {
    const db = yield* Db;

    const [invite] = yield* db
      .select({
        id: schema.propertyInvite.id,
        email: schema.propertyInvite.email,
        expiresAt: schema.propertyInvite.expiresAt,
        acceptedAt: schema.propertyInvite.acceptedAt,
        property: {
          id: schema.property.id,
          name: schema.property.name
        },
        invitedBy: {
          name: schema.user.name
        }
      })
      .from(schema.propertyInvite)
      .innerJoin(schema.property, eq(schema.propertyInvite.propertyId, schema.property.id))
      .innerJoin(schema.user, eq(schema.propertyInvite.invitedById, schema.user.id))
      .where(eq(schema.propertyInvite.token, token))
      .limit(1);

    if (!invite) {
      return yield* new NotFoundError({
        message: 'Invitation not found',
        entity: 'propertyInvite',
        id: token
      });
    }

    if (invite.acceptedAt) {
      return yield* new ValidationError({
        message: 'This invitation has already been used',
        field: 'token'
      });
    }

    if (invite.expiresAt < new Date()) {
      return yield* new ValidationError({
        message: 'This invitation has expired',
        field: 'token'
      });
    }

    return {
      id: invite.id,
      email: invite.email,
      propertyName: invite.property.name,
      propertyId: invite.property.id,
      invitedByName: invite.invitedBy.name
    };
  }).pipe(Effect.withSpan('PropertyInvite.getByToken'));
