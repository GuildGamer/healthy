import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { signOut } from '@/lib/auth-client';
import { clearLastSignInMethod } from '@/lib/last-sign-in-method';
import { ACCOUNT_DELETION_FAILED_MESSAGE, refusalFrom } from './account-deletion';

/**
 * The server has already ended every session, so this phone only has to
 * forget it: the ending screen comes first, then the stored session, the last
 * sign-in hint and every cached query go.
 */
export function useDeleteAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => apiClient.deleteAccount(),
    onSuccess: async () => {
      router.replace('/account-deleted');
      await clearLastSignInMethod();
      await signOut().catch(() => undefined);
      queryClient.clear();
    },
  });

  const refusal = refusalFrom(mutation.error);

  return {
    deleteAccount: () => mutation.mutate(),
    isDeleting: mutation.isPending,
    refusal,
    failureMessage: mutation.isError && !refusal ? ACCOUNT_DELETION_FAILED_MESSAGE : null,
  };
}
