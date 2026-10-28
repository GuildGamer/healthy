import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { selectDailyTip } from '@/components/tips';
import { apiClient } from '@/lib/api';
import { readTodaySteps } from '@/lib/device-health';
import { useSyncTimeZone } from '@/lib/time-zone';
import { useAppReviewPrompt } from '@/lib/use-app-review-prompt';
import { usePushDeviceSync } from '@/lib/use-push-device';
import { buildTodayDeck } from './today-deck';
import { nextDayKey } from './today-labels';

const PHONE_STEPS_REFRESH_MS = 2_000;

/** Today's step count from this phone, refreshed while Today is on screen. */
function useTodayPhoneSteps(): number | null {
  const [steps, setSteps] = useState<number | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const read = useCallback(() => {
    let isCancelled = false;

    async function refresh() {
      try {
        const count = await readTodaySteps();
        if (!isCancelled && count !== null && count !== stepsRef.current) {
          setSteps(count);
        }
      } catch {
        // Pedometer can fail briefly; keep the last good total.
      }
    }

    void refresh();
    const intervalId = setInterval(() => void refresh(), PHONE_STEPS_REFRESH_MS);
    const appSub = AppState.addEventListener('change', () => {
      void refresh();
    });

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      appSub.remove();
    };
  }, []);

  useFocusEffect(read);
  return steps;
}

/** Everything Today reads, and the background work that rides on opening it. */
export function useTodayQueries() {
  const queryClient = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: ['home', 'bootstrap'],
    queryFn: async () => {
      const data = await apiClient.getHomeBootstrap();
      queryClient.setQueryData(['me'], data.me);
      queryClient.setQueryData(['challenges', 'today'], data.today);
      queryClient.setQueryData(
        ['challenges', 'today', 'details', data.today.dayKey],
        data.details,
      );
      return data;
    },
  });

  // After a successful bootstrap, individual keys stay warm for invalidation refetches.
  const homeReady = bootstrapQuery.isSuccess;

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
    enabled: homeReady,
  });
  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
    enabled: homeReady,
  });
  const tipsQuery = useQuery({ queryKey: ['tips'], queryFn: () => apiClient.listTips() });
  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  });
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.listNotifications(),
  });
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiClient.listLeaderboard({ period: 'week' }),
  });
  const matchesQuery = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => apiClient.listMyMatches(),
  });
  const dayKey = challengesQuery.data?.dayKey ?? bootstrapQuery.data?.today.dayKey ?? '';
  // Under the today key, so whatever refreshes today's challenges refreshes these too.
  const detailsQuery = useQuery({
    queryKey: ['challenges', 'today', 'details', dayKey],
    queryFn: () => apiClient.getTodayDetails(),
    enabled: homeReady && Boolean(dayKey),
  });

  const phoneSteps = useTodayPhoneSteps();
  const me = meQuery.data ?? bootstrapQuery.data?.me;
  const tips = tipsQuery.data?.tips ?? [];
  const categories = me?.categories ?? [];
  const enrolled = (catalogQuery.data?.challenges ?? []).filter((item) => item.isEnrolled);
  const tipEnrollment = {
    challengeSlugs: enrolled.map((item) => item.slug),
    activityKeys: enrolled
      .map((item) => item.capture.metric)
      .filter((metric): metric is NonNullable<typeof metric> => metric != null),
  };
  const challenges =
    challengesQuery.data?.challenges ?? bootstrapQuery.data?.today.challenges ?? [];
  const todayTip = selectDailyTip(tips, categories, dayKey, tipEnrollment);
  const deck = buildTodayDeck({
    challenges,
    hasMembership: me?.hasMembership ?? false,
    liveGroups: matchesQuery.data?.live ?? [],
    todayTip,
    details: detailsQuery.data ?? bootstrapQuery.data?.details ?? null,
    phoneSteps,
  });

  useSyncTimeZone(me?.timeZone);
  usePushDeviceSync(me?.reminderEnabled ?? false);
  useAppReviewPrompt({
    userId: me?.id,
    dayKey: challengesQuery.data?.dayKey ?? bootstrapQuery.data?.today.dayKey,
    winLocked: deck.win.locked,
    completedCountToday: deck.completedCount,
    currentStreakDays: me?.currentStreakDays ?? 0,
    ready: Boolean(me) && (challengesQuery.isSuccess || bootstrapQuery.isSuccess),
  });

  const todayData = challengesQuery.data ?? bootstrapQuery.data?.today;

  return {
    me,
    dayKey,
    deck,
    challengesQuery: {
      ...challengesQuery,
      isPending: bootstrapQuery.isPending,
      isError: bootstrapQuery.isError && !todayData,
      isSuccess: Boolean(todayData),
      data: todayData,
      refetch: () => bootstrapQuery.refetch(),
    },
    categories,
    tomorrowTip: dayKey
      ? selectDailyTip(tips, categories, nextDayKey(dayKey), tipEnrollment)
      : null,
    unreadCount: notificationsQuery.data?.unreadCount ?? 0,
    weeklyRank: leaderboardQuery.data?.currentUserRank ?? null,
    weeklyRankAtDayStart: leaderboardQuery.data?.currentUserRankAtDayStart ?? null,
    refetchAll: () =>
      Promise.all([
        bootstrapQuery.refetch(),
        notificationsQuery.refetch(),
        leaderboardQuery.refetch(),
        matchesQuery.refetch(),
        tipsQuery.refetch(),
        catalogQuery.refetch(),
      ]),
  };
}
