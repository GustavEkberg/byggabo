import { Effect } from 'effect';
import { headers } from 'next/headers';
import { Header } from './header';
import { getSession } from '@/lib/services/auth/get-session';
import { AppLayer } from '@/lib/layers';
import { LandingPage } from '../landing-page';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/';

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const session = yield* Effect.option(getSession());
      if (session._tag === 'None') {
        return { authenticated: false as const };
      }
      return { authenticated: true as const };
    }).pipe(Effect.provide(AppLayer), Effect.scoped)
  );

  if (!result.authenticated) {
    // Show landing page for root, proxy handles redirect for other routes
    if (pathname === '/') {
      const country = headersList.get('x-vercel-ip-country');
      const isSweden = country === 'SE';
      return <LandingPage isSweden={isSweden} />;
    }
    // For other paths, let proxy handle the redirect
    // This shouldn't happen in practice since proxy redirects unauth users
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>{children}</main>
    </div>
  );
}
