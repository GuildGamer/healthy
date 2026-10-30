import type { MeOutput, UpdateNotificationSettingsInput } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { trackEvent } from '@/lib/analytics';
import { apiClient } from '@/lib/api';
import { requestReminderPermission } from '@/lib/notifications';
import { isMembershipRequiredError } from './membership-required';
import { ME_QUERY_KEY } from './useMe';

const DEFAULT_NUDGE_DELAY_MINUTES = 30;

export type NotificationSettingsChange = Partial<UpdateNotificationSettingsInput>;

function currentSettings(me: MeOutput | undefined): Required<UpdateNotificationSettingsInput> {
  return {
    reminderEnabled: me?.reminderEnabled ?? false,
    evidenceRemindersEnabled: me?.evidenceRemindersEnabled ?? true,
    promotionalMessagesEnabled: me?.promotionalMessagesEnabled ?? false,
    showOnLeaderboard: me?.showOnLeaderboard ?? true,
    groupNotificationsEnabled: me?.groupNotificationsEnabled ?? true,
    inProgressNudgeEnabled: me?.inProgressNudgeEnabled ?? true,
    inProgressNudgeDelayMinutes: me?.inProgressNudgeDelayMinutes ?? DEFAULT_NUDGE_DELAY_MINUTES,
  };
}

/**
 * The API takes the whole snapshot of switches, so every change is merged
 * into what is saved. A refusal for a members-only switch opens Membership.
 */
export function useNotificationSettings(me: MeOutput | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasMembership = me?.hasMembership ?? false;
  const settings = currentSettings(me);

  const mutation = useMutation({
    mutationFn: (input: UpdateNotificationSettingsInput) =>
      apiClient.updateNotificationSettings(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
      ]),
    onError: (error: unknown) => {
      if (isMembershipRequiredError(error)) {
        router.push({ pathname: '/membership', params: { source: 'profile' } });
      }
    },
  });

  async function save(change: NotificationSettingsChange): Promise<void> {
    const isTurningRemindersOn = change.reminderEnabled === true && !settings.reminderEnabled;
    if (isTurningRemindersOn && !(await requestReminderPermission())) {
      return;
    }

    // The stored default is on, so a free account must never send it as on:
    // any other switch would be refused for membership.
    const nudgeEnabled = hasMembership
      ? (change.inProgressNudgeEnabled ?? settings.inProgressNudgeEnabled)
      : false;

    for (const [setting, value] of Object.entries(change)) {
      if (value === undefined) {
        continue;
      }
      trackEvent('setting_changed', {
        setting,
        value: typeof value === 'boolean' || typeof value === 'number' ? value : String(value),
      });
    }

    mutation.mutate({ ...settings, ...change, inProgressNudgeEnabled: nudgeEnabled });
  }

  return {
    settings: {
      ...settings,
      inProgressNudgeEnabled: hasMembership && settings.inProgressNudgeEnabled,
    },
    hasMembership,
    save,
    isSaving: mutation.isPending,
    hasFailed: mutation.isError && !isMembershipRequiredError(mutation.error),
  };
}
