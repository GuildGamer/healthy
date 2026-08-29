import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { LeaderboardEntry } from '@product/client';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '@/lib/api';

/** Only the podium earns a coloured medal; below that the rank number reads better. */
const MEDAL_COLORS: Record<number, string> = {
  1: '#FACC15',
  2: '#CBD5E1',
  3: '#D97706',
};

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL_COLORS[rank];

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

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
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
  );
}

export function LeaderboardScreen() {
  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiClient.listLeaderboard(),
  });

  if (leaderboardQuery.isPending) {
    return (
      <View style={styles.centred} testID="leaderboard-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const entries = leaderboardQuery.data?.entries ?? [];
  const currentUserRank = leaderboardQuery.data?.currentUserRank ?? null;
  const isOffPage =
    currentUserRank !== null &&
    !entries.some((entry) => entry.isCurrentUser);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
      testID="leaderboard-screen"
    >
      <Text style={styles.intro}>
        Points earned since Monday. Everyone starts level again each week.
      </Text>

      {entries.length === 0 ? (
        <View style={styles.empty} testID="leaderboard-empty">
          <Ionicons color={colors.muted} name="trophy-outline" size={28} />
          <Text style={styles.emptyTitle}>Nobody has scored yet</Text>
          <Text style={styles.emptyBody}>
            Finish a challenge and you will be first on the board.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {entries.map((entry) => (
            <Row entry={entry} key={entry.rank} />
          ))}
        </View>
      )}

      {isOffPage ? (
        <Text style={styles.offPage} testID="leaderboard-own-rank">
          You are ranked {currentUserRank} with{' '}
          {leaderboardQuery.data?.currentUserPoints ?? 0} points this week.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
