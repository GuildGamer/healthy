import { useQuery } from '@tanstack/react-query';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeckDisc, DeckListRow, DeckNoteCard } from '@/components/deck';
import { boardLinkMeta, boardStanding, type BoardStanding } from '@/components/leaderboard';
import { selectDailyTip } from '@/components/tips';
import { apiClient } from '@/lib/api';
import { PROGRESS_COPY } from './constants/progress-copy';
import { ProgressSkeleton } from './ProgressSkeleton';
import { ProgressStats } from './ProgressStats';
import { useMeQuery, useProgressDays, useWeeklyBoard } from './useProgressQueries';
import { WeekCard } from './WeekCard';
import { buildWeekSummary } from './week-summary';
import { youStats } from './you-stats';

/** Everything the progress half of You reads; refetches on focus only when stale. */
function useYouProgress() {
  const meQuery = useMeQuery();
  const daysQuery = useProgressDays();
  const boardQuery = useWeeklyBoard();
  const tipsQuery = useQuery({ queryKey: ['tips'], queryFn: () => apiClient.listTips() });

  useFocusEffect(
    useCallback(() => {
      if (daysQuery.isStale) {
        void daysQuery.refetch();
      }
      if (boardQuery.isStale) {
        void boardQuery.refetch();
      }
    }, [boardQuery, daysQuery]),
  );

  const me = meQuery.data;
  const days = daysQuery.data;
  const standing: BoardStanding | null = boardQuery.data
    ? boardStanding(boardQuery.data, me?.showOnLeaderboard === false)
    : null;
  const todayTip = days
    ? selectDailyTip(tipsQuery.data?.tips ?? [], me?.categories ?? [], days.dayKey)
    : null;

  return {
    me,
    days,
    daysQuery,
    standing,
    todayTip,
    isPending: daysQuery.isPending || meQuery.isPending,
  };
}

/** You opens on how you're doing: this week, three figures, and the ways to look back. */
export function YouProgress() {
  const { me, days, daysQuery, standing, todayTip, isPending } = useYouProgress();

  if (isPending) {
    return <ProgressSkeleton />;
  }

  const isFirstDay = days !== undefined && days.joinedDayKey === days.dayKey;
  const historyMeta = isFirstDay ? PROGRESS_COPY.firstDayHistoryMeta : PROGRESS_COPY.historyMeta;

  return (
    <View>
      {days ? (
        <>
          <WeekCard
            summary={buildWeekSummary(days)}
            todayKey={days.dayKey}
            weekStartKey={days.weekStartKey}
          />
          {me ? <ProgressStats stats={youStats(me, standing ?? { kind: 'unranked' })} /> : null}
        </>
      ) : (
        <DeckNoteCard
          action={{
            label: PROGRESS_COPY.tryAgain,
            onPress: () => void daysQuery.refetch(),
            testID: 'progress-retry',
          }}
          body={PROGRESS_COPY.failedBody}
          glyph="offline"
          testID="progress-error"
          title={PROGRESS_COPY.weekFailedTitle}
        />
      )}
      <ProgressLinks
        historyMeta={historyMeta}
        leaderboardMeta={standing ? boardLinkMeta(standing) : null}
        tipMeta={todayTip ? `Today: ${todayTip.title}` : null}
      />
    </View>
  );
}

function ProgressLinks({
  historyMeta,
  leaderboardMeta,
  tipMeta,
}: {
  historyMeta: string;
  leaderboardMeta: string | null;
  tipMeta: string | null;
}) {
  const router = useRouter();

  return (
    <View style={styles.links}>
      <DeckListRow
        isFirst
        leading={<DeckDisc glyph="history" />}
        meta={historyMeta}
        onPress={() => router.push('/history')}
        testID="progress-open-history"
        title={PROGRESS_COPY.historyTitle}
      />
      <DeckListRow
        leading={<DeckDisc glyph="trophy" />}
        meta={leaderboardMeta}
        onPress={() => router.push('/leaderboard')}
        testID="progress-open-leaderboard"
        title={PROGRESS_COPY.leaderboardTitle}
      />
      <DeckListRow
        leading={<DeckDisc glyph="leaf" />}
        meta={tipMeta}
        onPress={() => router.push('/tips')}
        testID="progress-open-tips"
        title={PROGRESS_COPY.tipsTitle}
      />
      <DeckListRow
        leading={<DeckDisc glyph="check" />}
        meta={PROGRESS_COPY.verifyClipMeta}
        onPress={() => router.push('/v/new' as Href)}
        testID="progress-open-verify-clip"
        title={PROGRESS_COPY.verifyClipTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  links: {
    marginTop: 18,
  },
});
