'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { createId } from '@paralleldrive/cuid2';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import { Email } from '@/lib/services/email/live-layer';
import * as schema from '@/lib/services/db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationError } from '@/lib/core/errors';
import { Config } from 'effect';

const CreateInviteInput = S.Struct({
  email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
});

type CreateInviteInput = S.Schema.Type<typeof CreateInviteInput>;

export const createInviteAction = async (input: CreateInviteInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateInviteInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Valid email address is required',
              field: 'email'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;
      const emailService = yield* Email;

      // Check if user with this email already exists
      const [existingUser] = yield* db
        .select({ id: schema.user.id, propertyId: schema.user.propertyId })
        .from(schema.user)
        .where(eq(schema.user.email, parsed.email))
        .limit(1);

      if (existingUser) {
        return yield* new ValidationError({
          message: 'A user with this email already exists',
          field: 'email'
        });
      }

      // Check if there's already a pending invite for this email
      const [existingInvite] = yield* db
        .select({ id: schema.propertyInvite.id })
        .from(schema.propertyInvite)
        .where(
          and(
            eq(schema.propertyInvite.propertyId, propertyId),
            eq(schema.propertyInvite.email, parsed.email)
          )
        )
        .limit(1);

      if (existingInvite) {
        return yield* new ValidationError({
          message: 'An invite has already been sent to this email',
          field: 'email'
        });
      }

      // Get property name for email
      const [property] = yield* db
        .select({ name: schema.property.name })
        .from(schema.property)
        .where(eq(schema.property.id, propertyId))
        .limit(1);

      // Create invite token
      const token = createId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invite] = yield* db
        .insert(schema.propertyInvite)
        .values({
          propertyId,
          invitedById: user.id,
          email: parsed.email,
          token,
          expiresAt
        })
        .returning();

      // Get config for email
      const projectUrl = yield* Config.string('VERCEL_PROJECT_PRODUCTION_URL');
      const appName = yield* Config.string('APP_NAME');
      const emailSender = yield* Config.string('EMAIL_SENDER');

      // Send invite email
      const inviteUrl = `https://${projectUrl}/invite/${token}`;

      yield* emailService.sendEmail({
        from: `${appName} <${emailSender}>`,
        to: parsed.email,
        subject: `${user.name} invited you to ${property.name}`,
        html: `
          <p>${user.name} has invited you to join <strong>${property.name}</strong> on ${appName}.</p>
          <p>Click the link below to accept the invitation and create your account:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          <p>This invitation expires in 7 days.</p>
        `
      });

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'invite.email': parsed.email,
        'invite.id': invite.id
      });

      return invite;
    }).pipe(
      Effect.withSpan('action.propertyInvite.create', {
        attributes: { operation: 'propertyInvite.create' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.tag('ValidationError', e =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: e.message
              })
            ),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to send invitation'
              })
            )
          ),
        onSuccess: invite =>
          Effect.sync(() => {
            revalidatePath('/settings');
            return { _tag: 'Success' as const, invite };
          })
      })
    )
  );
};
