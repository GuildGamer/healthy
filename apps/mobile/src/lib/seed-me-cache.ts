import type { MeOutput } from '@product/client';
import type { QueryClient } from '@tanstack/react-query';

/** Puts `/me` into React Query so Today does not pay for it again after auth resolve. */
export function seedMeCache(queryClient: QueryClient, me: MeOutput): void {
  queryClient.setQueryData(['me'], me);
}
