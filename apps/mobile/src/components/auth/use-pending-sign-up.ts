import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { isMatchInviteToken } from '@/lib/deferred-invite';
import { peekPendingMatchToken } from '@/lib/pending-match-token';

/**
 * The group invite someone arrived with, previewed without an account. Null
 * data means a plain sign-up.
 */
export function usePendingInvite() {
  const tokenQuery = useQuery({
    queryKey: ['pending-sign-up', 'invite-token'],
    queryFn: async () => {
      const token = await peekPendingMatchToken();
      return isMatchInviteToken(token) ? token : null;
    },
    staleTime: 0,
  });
  const token = tokenQuery.data ?? null;

  const previewQuery = useQuery({
    queryKey: ['matches', 'invite', 'public', token],
    queryFn: () => apiClient.publicPreviewMatch({ token: token ?? '' }),
    enabled: token !== null,
  });

  return {
    isPending: tokenQuery.isPending || (token !== null && previewQuery.isPending),
    invite: previewQuery.data ?? null,
  };
}
