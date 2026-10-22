import type { ChallengeFrequency } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { goalPatch } from './challenge-goal';
import type { AddChallengeInput, SaveReminderInput } from './types/challenge-mutations';

/** Everything under `challenges` reads enrolments: the catalogue, Today, and its details. */
function useRefreshChallenges() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['challenges'] });
}

/** Adds a challenge with the settings its preview showed. Safe to retry: enrolling is a set. */
export function useAddChallenge() {
  const refresh = useRefreshChallenges();
  return useMutation({
    mutationFn: async ({ challengeId, frequency, goal, reminderMinute }: AddChallengeInput) => {
      await apiClient.setChallengeEnrollment({
        challengeId,
        isEnrolled: true,
        frequency,
        ...(goal ? goalPatch(goal.field, goal.amount) : {}),
      });
      if (reminderMinute !== null) {
        await apiClient.addChallengeReminder({ challengeId, minuteOfDay: reminderMinute });
      }
    },
    onSettled: refresh,
  });
}

/** Each setting saves on its own as it changes, so going back never loses an edit. */
export function useUpdateEnrollment() {
  const refresh = useRefreshChallenges();
  return useMutation({
    mutationFn: (input: {
      challengeId: string;
      frequency?: ChallengeFrequency;
      targetCount?: number;
      targetDurationMinutes?: number;
    }) => apiClient.setChallengeEnrollment({ ...input, isEnrolled: true }),
    onSettled: refresh,
  });
}

export function useRemoveChallenge() {
  const refresh = useRefreshChallenges();
  return useMutation({
    mutationFn: (challengeId: string) =>
      apiClient.setChallengeEnrollment({ challengeId, isEnrolled: false }),
    onSettled: refresh,
  });
}

export function useSaveReminder() {
  const refresh = useRefreshChallenges();
  return useMutation({
    mutationFn: async ({ challengeId, minuteOfDay, replacing }: SaveReminderInput) => {
      if (replacing?.minuteOfDay === minuteOfDay) {
        return;
      }

      if (replacing) {
        await apiClient.removeChallengeReminder({ reminderId: replacing.id });
      }
      await apiClient.addChallengeReminder({ challengeId, minuteOfDay });
    },
    onSettled: refresh,
  });
}

export function useRemoveReminder() {
  const refresh = useRefreshChallenges();
  return useMutation({
    mutationFn: (reminderId: string) => apiClient.removeChallengeReminder({ reminderId }),
    onSettled: refresh,
  });
}
