import { ORPCError, os } from '@orpc/server';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type OrpcAuthContext = {
  user?: AuthUser | null;
  session?: unknown;
};

/**
 * oRPC middleware: require an authenticated user on the procedure context.
 * Nest's global guard is bypassed for oRPC via @AllowAnonymous on the controller;
 * this middleware is the source of truth for protected contract procedures.
 */
export const requireAuth = os
  .$context<OrpcAuthContext>()
  .middleware(async ({ context, next }) => {
    if (!context.user?.id || !context.user.email) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Authentication required',
      });
    }

    return next({
      context: {
        user: context.user,
        session: context.session ?? null,
      },
    });
  });
