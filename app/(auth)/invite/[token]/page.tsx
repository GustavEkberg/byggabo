import { Suspense } from 'react';
import { Effect, Match } from 'effect';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { NextEffect } from '@/lib/next-effect';
import { AppLayer } from '@/lib/layers';
import { getInviteByToken } from '@/lib/core/property-invite/get-invite-by-token';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ token: string }>;
};

async function Content({ params }: Props) {
  await cookies();
  const { token } = await params;

  return await NextEffect.runPromise(
    Effect.gen(function* () {
      const invite = yield* getInviteByToken(token);

      return (
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">You&apos;ve been invited</h1>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{invite.invitedByName}</span> has
              invited you to join{' '}
              <span className="font-medium text-foreground">{invite.propertyName}</span>
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              Sign in with <span className="font-medium text-foreground">{invite.email}</span> to
              accept this invitation and join the property.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            render={<Link href={`/login?email=${encodeURIComponent(invite.email)}`} />}
          >
            Continue to sign in
          </Button>
        </div>
      );
    }).pipe(
      Effect.provide(AppLayer),
      Effect.scoped,
      Effect.matchEffect({
        onFailure: error =>
          Match.value(error).pipe(
            Match.tag('NotFoundError', () =>
              Effect.succeed(
                <div className="text-center space-y-4">
                  <h1 className="text-2xl font-semibold">Invitation not found</h1>
                  <p className="text-muted-foreground">
                    This invitation link is invalid or has been removed.
                  </p>
                  <Button variant="outline" render={<Link href="/login" />}>
                    Go to login
                  </Button>
                </div>
              )
            ),
            Match.tag('ValidationError', e =>
              Effect.succeed(
                <div className="text-center space-y-4">
                  <h1 className="text-2xl font-semibold">Invitation expired</h1>
                  <p className="text-muted-foreground">{e.message}</p>
                  <Button variant="outline" render={<Link href="/login" />}>
                    Go to login
                  </Button>
                </div>
              )
            ),
            Match.orElse(() =>
              Effect.succeed(
                <div className="text-center space-y-4">
                  <h1 className="text-2xl font-semibold">Something went wrong</h1>
                  <p className="text-muted-foreground">Please try again later.</p>
                  <Button variant="outline" render={<Link href="/login" />}>
                    Go to login
                  </Button>
                </div>
              )
            )
          ),
        onSuccess: Effect.succeed
      })
    )
  );
}

export default async function Page(props: Props) {
  return (
    <Suspense fallback={null}>
      <Content {...props} />
    </Suspense>
  );
}
