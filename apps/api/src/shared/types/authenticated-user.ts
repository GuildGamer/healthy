import { ORPCError } from '@orpc/server';

/** The subset of the Better Auth user that domain services rely on. */
export type AuthenticatedUser = {
  id: string;
  email: string;
  name?: string | null;
};

/**
 * Routes are protected by default, so a missing user is a programming error
 * rather than an expected outcome — this is the one place that throws instead
 * of returning a typed result.
 */
export function requireUser(
  currentUser: AuthenticatedUser | null | undefined,
): AuthenticatedUser {
  if (currentUser) {
    return currentUser;
  }

  throw new ORPCError('UNAUTHORIZED', {
    message: 'Authentication required',
  });
}
