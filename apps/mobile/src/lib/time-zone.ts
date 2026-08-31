import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from './api';

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * The API buckets challenge days by the zone stored on the profile, so it has
 * to follow the device — otherwise a user's day would roll over at whatever
 * hour UTC midnight happens to fall on for them.
 *
 * Pass the zone already loaded by a `me` query; this only writes on a mismatch.
 */
export function useSyncTimeZone(storedTimeZone: string | undefined): void {
  const queryClient = useQueryClient();
  const attemptedTimeZone = useRef<string | null>(null);

  const { mutate } = useMutation({
    mutationFn: (timeZone: string) => apiClient.updateTimeZone({ timeZone }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
      ]);
    },
  });

  useEffect(() => {
    const current = deviceTimeZone();
    if (!storedTimeZone || storedTimeZone === current) {
      return;
    }

    // One attempt per zone, so a rejected value cannot become a retry loop.
    if (attemptedTimeZone.current === current) {
      return;
    }

    attemptedTimeZone.current = current;
    mutate(current);
  }, [storedTimeZone, mutate]);
}
