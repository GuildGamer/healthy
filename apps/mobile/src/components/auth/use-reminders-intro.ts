import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { requestReminderPermission } from '@/lib/notifications';
import { markRemindersIntroAnswered } from '@/lib/reminders-intro';
import { firstDayFor } from './first-day';
import { useStarterChallenges } from './use-starter-challenges';

/** The reminder this person would actually get: their time and first challenge. */
export function useReminderPreview() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });
  const starters = useStarterChallenges();

  const firstStep =
    me.data && starters.data
      ? firstDayFor(starters.data.challenges, me.data.categories).steps[0]
      : undefined;

  return {
    isPending: me.isPending,
    reminderMinute: me.data?.reminderMinute ?? null,
    challengeTitle: firstStep?.title ?? null,
  };
}

/**
 * Yes asks the phone, then turns reminders on at the account's time. A refusal
 * at the phone prompt is still an answer, so the page never comes back.
 */
export function useAnswerRemindersIntro(reminderMinute: number | null, onAnswered: () => void) {
  const queryClient = useQueryClient();
  const [isTurningOn, setIsTurningOn] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function turnOn() {
    if (isTurningOn || reminderMinute === null) {
      return;
    }

    setIsTurningOn(true);
    setHasFailed(false);
    try {
      const granted = await requestReminderPermission();
      if (granted) {
        await apiClient.updateReminder({ enabled: true, reminderMinute });
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      }

      await markRemindersIntroAnswered();
      onAnswered();
    } catch {
      setHasFailed(true);
    } finally {
      setIsTurningOn(false);
    }
  }

  async function notNow() {
    await markRemindersIntroAnswered();
    onAnswered();
  }

  return { turnOn: () => void turnOn(), notNow: () => void notNow(), isTurningOn, hasFailed };
}
