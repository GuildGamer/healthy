import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import type { LeaderboardEntry, LeaderboardPeriod } from '@product/client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import {
  LEADERBOARD_CATEGORIES,
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

function FilterChip<T extends string>({
  id,
  label,
  selected,
  testID,
  onSelect,
}: {
  id: T;
  label: string;
  selected: boolean;
  testID: string;
  onSelect: (id: T) => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => onSelect(id)}
      style={styles.chip}
      testID={testID}
    >
      <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
        {label}
      </Text>
      <View
        style={[styles.chipRule, selected ? styles.chipRuleSelected : null]}
      />
    </Pressable>
  );
}

export function LeaderboardScreen() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [category, setCategory] = useState<LeaderboardCategoryFilter>('all');
  const queryInput = leaderboardQueryInput(period, category);

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', period, category],
    queryFn: () => apiClient.listLeaderboard(queryInput),
    placeholderData: keepPreviousData,
  });

  const entries = leaderboardQuery.data?.entries ?? [];
  const currentUserRank = leaderboardQuery.data?.currentUserRank ?? null;
  const isOffPage =
    currentUserRank !== null &&
    !entries.some((entry) => entry.isCurrentUser);

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => leaderboardQuery.refetch()}
      style={styles.container}
      testID="leaderboard-screen"
    >
      <Text style={styles.intro}>{leaderboardIntro(period)}</Text>

      <View style={styles.filters} testID="leaderboard-period-switch">
        {LEADERBOARD_PERIODS.map((option) => (
          <FilterChip
            id={option.id}
            key={option.id}
            label={option.label}
            onSelect={setPeriod}
            selected={option.id === period}
            testID={`leaderboard-period-${option.id}`}
          />
        ))}
      </View>

      <View style={styles.filters} testID="leaderboard-category-switch">
        {LEADERBOARD_CATEGORIES.map((option) => (
          <FilterChip
            id={option.id}
            key={option.id}
            label={option.label}
            onSelect={setCategory}
            selected={option.id === category}
            testID={`leaderboard-category-${option.id}`}
          />
        ))}
      </View>

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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingBottom: 4,
  },
  chipLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chipLabelSelected: {
    color: colors.accent,
  },
  chipRule: {
    height: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  chipRuleSelected: {
    backgroundColor: colors.accent,
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
});
