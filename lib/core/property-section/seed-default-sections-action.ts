'use server';

import { Effect, Match } from 'effect';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { DEFAULT_SECTIONS } from './queries';

/**
 * Seeds default sections for the current property if none exist.
 * Call this when a user first creates a property or manually requests to reset sections.
 */
export const seedDefaultSectionsAction = async () => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'property.id': propertyId
      });

      // Check if sections already exist
      const existing = yield* db
        .select({ id: schema.propertySection.id })
        .from(schema.propertySection)
        .where(eq(schema.propertySection.propertyId, propertyId))
        .limit(1);

      if (existing.length > 0) {
        return { created: 0 };
      }

      // Seed default sections
      const sections = yield* db
        .insert(schema.propertySection)
        .values(
          DEFAULT_SECTIONS.map(section => ({
            propertyId,
            name: section.name,
            color: section.color,
            sortOrder: section.sortOrder
          }))
        )
        .returning();

      return { created: sections.length };
    }).pipe(
      Effect.withSpan('action.propertySection.seedDefaults', {
        attributes: { operation: 'propertySection.seedDefaults' }
      }),
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.orElse(() =>
              Effect.succeed({
                _tag: 'Error' as const,
                message: 'Failed to seed default sections'
              })
            )
          ),
        onSuccess: result =>
          Effect.sync(() => {
            revalidatePath('/settings');
            return { _tag: 'Success' as const, ...result };
          })
      })
    )
  );
};
