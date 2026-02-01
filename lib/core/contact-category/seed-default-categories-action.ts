'use server';

import { Effect, Match } from 'effect';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { getDefaultContactCategories } from './constants';
import { getCountryCode } from '@/lib/utils/get-country';

/**
 * Seeds default contact categories for the current property if none exist.
 * Uses geolocation to determine language (Swedish for SE, English otherwise).
 */
export const seedDefaultContactCategoriesAction = async () => {
  const countryCode = await getCountryCode();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'property.id': propertyId,
        'geo.country': countryCode ?? 'unknown'
      });

      // Check if categories already exist
      const existing = yield* db
        .select({ id: schema.contactCategory.id })
        .from(schema.contactCategory)
        .where(eq(schema.contactCategory.propertyId, propertyId))
        .limit(1);

      if (existing.length > 0) {
        return { created: 0 };
      }

      // Seed default categories based on country
      const defaultCategories = getDefaultContactCategories(countryCode);
      const categories = yield* db
        .insert(schema.contactCategory)
        .values(
          defaultCategories.map(category => ({
            propertyId,
            name: category.name,
            icon: category.icon,
            color: category.color,
            sortOrder: category.sortOrder
          }))
        )
        .returning();

      return { created: categories.length };
    }).pipe(
      Effect.withSpan('action.contactCategory.seedDefaults', {
        attributes: { operation: 'contactCategory.seedDefaults' }
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
                message: 'Failed to seed default categories'
              })
            )
          ),
        onSuccess: result =>
          Effect.sync(() => {
            revalidatePath('/contacts');
            revalidatePath('/settings');
            return { _tag: 'Success' as const, ...result };
          })
      })
    )
  );
};
