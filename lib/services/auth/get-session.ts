import { Effect, Option } from 'effect';
import { cookies } from 'next/headers';
import { Auth } from './live-layer';
import { UnauthenticatedError, UnauthorizedError, NoPropertyError } from '@/lib/core/errors';

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  propertyId: Option.Option<string>;
};

export type AppSession = {
  user: AppUser;
};

// Basic session guard - requires authentication
export const getSession = () =>
  Effect.gen(function* () {
    yield* Effect.promise(() => cookies()); // Mark as dynamic

    const authService = yield* Auth;
    const session = yield* authService.getSessionFromCookies();

    if (!session) {
      return yield* Effect.fail(new UnauthenticatedError({ message: 'Not authenticated' }));
    }

    // Better-auth returns user with our additional fields
    // Extract with type-safe property access
    const { id, email, name } = session.user;
    const role = session.user.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const propertyId = 'propertyId' in session.user ? session.user.propertyId : null;

    return {
      user: {
        id,
        email,
        name,
        role,
        propertyId: Option.fromNullable(propertyId)
      }
    } satisfies AppSession;
  }).pipe(Effect.withSpan('Auth.session.get'));

export type AppSessionWithProperty = {
  user: Omit<AppUser, 'propertyId'> & { propertyId: string };
  propertyId: string;
};

// Session guard that requires property membership
export const getSessionWithProperty = () =>
  Effect.gen(function* () {
    const session = yield* getSession();

    const propertyId = Option.getOrNull(session.user.propertyId);

    if (!propertyId) {
      return yield* Effect.fail(new NoPropertyError({ message: 'User has no property' }));
    }

    return {
      user: { ...session.user, propertyId },
      propertyId
    } satisfies AppSessionWithProperty;
  }).pipe(Effect.withSpan('Auth.session.getWithProperty'));

// Admin guard - requires ADMIN role
export const getAdminSession = () =>
  Effect.gen(function* () {
    const authService = yield* Auth;
    const session = yield* authService.getSessionFromCookies();

    if (!session) {
      return yield* Effect.fail(new UnauthenticatedError({ message: 'Not authenticated' }));
    }

    if (session.user.role !== 'ADMIN') {
      return yield* Effect.fail(new UnauthorizedError({ message: 'Not authorized' }));
    }

    return session;
  }).pipe(Effect.withSpan('Auth.session.getAdmin'));
