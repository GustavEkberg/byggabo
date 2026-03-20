import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getContacts } from '@/lib/core/contact/queries';
import { getContactCategories } from '@/lib/core/contact-category/queries';
import { getSessionWithProperty } from '@/lib/services/auth/get-session';
import { ContactList } from './contact-list';
import { CreateContactDialog } from './create-contact-dialog';
import { CategoriesList } from './categories-list';
import { CreateCategoryDialog } from './create-category-dialog';
import { SeedCategoriesButton } from './seed-categories-button';

export const dynamic = 'force-dynamic';

async function Content() {
  await cookies();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const { propertyId } = yield* getSessionWithProperty();
      const [contacts, categories] = yield* Effect.all([
        getContacts(),
        getContactCategories(propertyId)
      ]);

      return (
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold">Contacts</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Contractors and suppliers for your projects
              </p>
            </div>
            <CreateContactDialog categories={categories} />
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-12 rounded-xl border bg-card">
              <p className="text-muted-foreground">No contacts yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add contractors and suppliers to use in quotations.
              </p>
            </div>
          ) : (
            <ContactList contacts={contacts} categories={categories} />
          )}

          {/* Categories Section */}
          <div className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Categories</h2>
                <p className="text-muted-foreground text-sm">
                  Organize your contacts by trade or type
                </p>
              </div>
              <div className="flex gap-2">
                {categories.length === 0 && <SeedCategoriesButton />}
                <CreateCategoryDialog />
              </div>
            </div>
            <CategoriesList categories={categories} />
          </div>
        </div>
      );
    }).pipe(
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error._tag).pipe(
            Match.when('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.when('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.orElse(() =>
              Effect.succeed(
                <div className="mx-auto max-w-6xl px-4 py-8">
                  <p className="text-red-500">Error: {error.message}</p>
                </div>
              )
            )
          ),
        onSuccess: Effect.succeed
      })
    )
  );
}

export default async function ContactsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8">Loading...</div>}>
      <Content />
    </Suspense>
  );
}
