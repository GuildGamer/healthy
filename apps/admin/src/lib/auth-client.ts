'use client';

import { createAuthClient } from 'better-auth/react';

const adminOrigin =
  process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3001';

export const adminAuthClient = createAuthClient({
  baseURL: adminOrigin,
  basePath: '/admin/auth',
});

export const { signIn, signOut, useSession } = adminAuthClient;
