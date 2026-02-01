'use server';

import { Effect, Match, Schema as S } from 'effect';
import { revalidatePath } from 'next/cache';
import { eq, desc } from 'drizzle-orm';
import { AppLayer } from '@/lib/layers';
import { NextEffect } from '@/lib/next-effect';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { Db } from '@/lib/services/db/live-layer';
import * as schema from '@/lib/services/db/schema';
import { ValidationError } from '@/lib/core/errors';

const CreateSectionInput = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(50)),
  icon: S.String.pipe(S.minLength(1), S.maxLength(50)),
  color: S.String.pipe(S.pattern(/^#[0-9a-fA-F]{6}$/))
});

type CreateSectionInput = S.Schema.Type<typeof CreateSectionInput>;

export const createSectionAction = async (input: CreateSectionInput) => {
  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const parsed = yield* S.decodeUnknown(CreateSectionInput)(input).pipe(
        Effect.mapError(
          () =>
            new ValidationError({
              message: 'Invalid section data',
              field: 'input'
            })
        )
      );

      const { propertyId, user } = yield* getSessionWithProperty();
      const db = yield* Db;

      yield* Effect.annotateCurrentSpan({
        'user.id': user.id,
        'section.name': parsed.name
      });

      // Get highest sortOrder to append new section at end
      const existing = yield* db
        .select({ sortOrder: schema.propertySection.sortOrder })
        .from(schema.propertySection)
        .where(eq(schema.propertySection.propertyId, propertyId))
        .orderBy(desc(schema.propertySection.sortOrder))
        .limit(1);

      const nextSortOrder = existing.length > 0 ? String(Number(existing[0].sortOrder) + 1) : '0';

      const [section] = yield* db
        .insert(schema.propertySection)
        .values({
          propertyId,
          name: parsed.name,
          icon: parsed.icon,
          color: parsed.color,
          sortOrder: nextSortOrder
        })
        .returning();

      return section;
    }).pipe(
      Effect.withSpan('action.propertySection.create', {
        attributes: { operation: 'propertySection.create' }
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
                message: 'Failed to create section'
              })
            )
          ),
        onSuccess: section =>
          Effect.sync(() => {
            revalidatePath('/settings');
            return { _tag: 'Success' as const, section };
          })
      })
    )
  );
};
