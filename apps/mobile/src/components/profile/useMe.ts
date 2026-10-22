import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: () => apiClient.me() });
}

/** Only members need it on Settings, for the renewal date. */
export function useMembershipOffer(isEnabled: boolean) {
  return useQuery({
    queryKey: ['membership-offer'],
    queryFn: () => apiClient.getMembershipOffer(),
    enabled: isEnabled,
  });
}
