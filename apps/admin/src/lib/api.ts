'use client';

import { createAdminApiClient } from '@product/client';

const adminOrigin =
  process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3001';

export const adminApi = createAdminApiClient({
  baseUrl: adminOrigin,
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});
