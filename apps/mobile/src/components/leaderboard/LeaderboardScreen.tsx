import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import type { LeaderboardEntry, LeaderboardPeriod } from '@product/client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { LeaderboardCategoryPicker } from './LeaderboardCategoryPicker';
import {
  LEADERBOARD_PERIODS,
  type LeaderboardCategoryFilter,
  leaderboardIntro,
  leaderboardQueryInput,
  leaderboardRankWindow,
} from './leaderboard-filters';
import { podiumMedalColor } from './podium';

function RankBadge({ rank }: { rank: number }) {
  const medal = podiumMedalColor(rank);

  if (!medal) {
    return (
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
    );
  }

  return (
    <View style={styles.rankBadge}>
      <Ionicons color={medal} name="medal" size={22} />
    </View>
  );
}

function Row({
  entry,
  isLast,
}: {
  entry: LeaderboardEntry;
  isLast: boolean;
}) {
  return (
    <View>
      <View
        style={[styles.row, entry.isCurrentUser ? styles.rowCurrent : null]}
        testID={`leaderboard-row-${entry.rank}`}
      >
        <RankBadge rank={entry.rank} />
        <Text
          numberOfLines={1}
          style={[styles.name, entry.isCurrentUser ? styles.nameCurrent : null]}
        >
          {entry.displayName}
          {entry.isCurrentUser ? '  (you)' : ''}
        </Text>
        <Text style={styles.points}>{entry.points.toLocaleString()}</Text>
      </View>
      {isLast ? null : <View style={styles.divider} />}
    </View>
  );
}

export function LeaderboardScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [category, setCategory] = useState<LeaderboardCategoryFilter>('all');
  const queryInput = leaderboardQueryInput(period, category);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', period, category],
    queryFn: () => apiClient.listLeaderboard(queryInput),
    placeholderData: keepPreviousData,
  });

  const entries = leaderboardQuery.data?.entries ?? [];
  const currentUserRank = leaderboardQuery.data?.currentUserRank ?? null;
  // Prefer Profile setting (always available) so the notice still shows if the
  // leaderboard payload is stale or missing `currentUserVisible`.
  const isHiddenFromBoard =
    meQuery.data?.showOnLeaderboard === false ||
    leaderboardQuery.data?.currentUserVisible === false;
  const isOffPage =
    !isHiddenFromBoard &&
    currentUserRank !== null &&
    !entries.some((entry) => entry.isCurrentUser);

  const openProfileSettings = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() =>
        Promise.all([meQuery.refetch(), leaderboardQuery.refetch()])
      }
      style={styles.container}
      testID="leaderboard-screen"
    >
      <View style={styles.tabs} testID="leaderboard-period-switch">
        {LEADERBOARD_PERIODS.map((option) => {
          const selected = option.id === period;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => setPeriod(option.id)}
              style={styles.tab}
              testID={`leaderboard-period-${option.id}`}
            >
              <Text
                style={[
                  styles.tabLabel,
                  selected ? styles.tabLabelSelected : null,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.tabRule,
                  selected ? styles.tabRuleSelected : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.intro}>{leaderboardIntro(period)}</Text>

      {isHiddenFromBoard ? (
        <Pressable
          accessibilityHint="Opens profile settings to show you on the leaderboard"
          accessibilityRole="button"
          onPress={openProfileSettings}
          style={styles.hiddenNotice}
          testID="leaderboard-hidden-notice"
        >
          <Text style={styles.hiddenBody}>
            You turned off “Show me this week”, so your name is hidden.{' '}
            <Text style={styles.hiddenLink} testID="leaderboard-enable-in-profile">
              Enable in Profile
            </Text>
          </Text>
        </Pressable>
      ) : null}

      <LeaderboardCategoryPicker
        onSelect={setCategory}
        selected={category}
      />

      {leaderboardQuery.isPending && entries.length === 0 ? (
        <View style={styles.loader}>
          <Loader />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.empty} testID="leaderboard-empty">
          <Ionicons color={colors.muted} name="trophy-outline" size={28} />
          <Text style={styles.emptyTitle}>Nobody has scored yet</Text>
          <Text style={styles.emptyBody}>
            Finish a challenge and you will be first on the board.
          </Text>
        </View>
      ) : (
        <View>
          {entries.map((entry, index) => (
            <Row
              entry={entry}
              isLast={index === entries.length - 1}
              key={entry.rank}
            />
          ))}
        </View>
      )}

      {isOffPage ? (
        <Text style={styles.offPage} testID="leaderboard-own-rank">
          You are ranked {currentUserRank} with{' '}
          {leaderboardQuery.data?.currentUserPoints ?? 0} points{' '}
          {leaderboardRankWindow(period)}.
        </Text>
      ) : null}
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingTop: spacing.sm,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    paddingBottom: spacing.sm,
  },
  tabLabelSelected: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  tabRule: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  tabRuleSelected: {
    backgroundColor: colors.accent,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  rowCurrent: {
    backgroundColor: colors.accentSurface,
  },
  rankBadge: {
    width: 30,
    alignItems: 'center',
  },
  rankText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
  },
  nameCurrent: {
    fontWeight: fontWeight.semibold,
  },
  points: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  offPage: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  hiddenNotice: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  hiddenBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  hiddenLink: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
});
