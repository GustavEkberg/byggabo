import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getPropertyWithMembers, getPendingInvites } from '@/lib/core/property/queries';
import { MembersList } from './members-list';
import { InviteForm } from './invite-form';

export const dynamic = 'force-dynamic';

async function Content() {
  await cookies();

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const [propertyData, pendingInvites] = yield* Effect.all([
        getPropertyWithMembers(),
        getPendingInvites()
      ]);

      return (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold">{propertyData.property.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your property members</p>
          </div>

          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Members</h2>
              <MembersList members={propertyData.members} />
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium">Invite new member</h2>
              <InviteForm />
            </section>

            {pendingInvites.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-medium">Pending invites</h2>
                <div className="space-y-2">
                  {pendingInvites.map(invite => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                    >
                      <span>{invite.email}</span>
                      <span className="text-muted-foreground">
                        Expires {invite.expiresAt.toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      );
    }).pipe(
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('UnauthenticatedError', () => NextEffect.redirect('/login')),
            Match.tag('NoPropertyError', () => NextEffect.redirect('/login')),
            Match.orElse(() =>
              Effect.succeed(
                <div className="mx-auto max-w-2xl px-4 py-8">
                  <p>Something went wrong loading settings.</p>
                </div>
              )
            )
          ),
        onSuccess: Effect.succeed
      })
    )
  );
}

export default async function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-8">Loading...</div>}>
      <Content />
    </Suspense>
  );
}
