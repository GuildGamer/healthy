import type { MeOutput } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/** Turns "Show me on the leaderboard" back on, keeping every other setting as it is. */
export function useShowOnBoard(me: MeOutput | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!me) {
        return null;
      }

      return apiClient.updateNotificationSettings({
        reminderEnabled: me.reminderEnabled,
        evidenceRemindersEnabled: me.evidenceRemindersEnabled,
        promotionalMessagesEnabled: me.promotionalMessagesEnabled,
        showOnLeaderboard: true,
        inProgressNudgeEnabled: me.inProgressNudgeEnabled,
        inProgressNudgeDelayMinutes: me.inProgressNudgeDelayMinutes,
        groupNotificationsEnabled: me.groupNotificationsEnabled,
      });
    },
    onSuccess: async (updated) => {
      if (updated) {
        queryClient.setQueryData(['me'], updated);
      }
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}
