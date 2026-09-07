import Ionicons from '@expo/vector-icons/Ionicons';
import { matchInviteUrl, type MatchStanding } from '@product/client';
import { matchContestTitle } from '@product/contract';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshableScroll, ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import { formatMatchTimeLeft } from './format-match-time';
import {
  MATCH_HERO_LINE,
  MATCH_HERO_SIZE,
  MatchCard,
  MatchInitial,
  MatchKicker,
  MatchMetricMark,
  MatchRankMark,
} from './match-chrome';
import {
  MATCH_CANCEL,
  MATCH_CANCEL_CONFIRM_BODY,
  MATCH_CANCEL_CONFIRM_TITLE,
  MATCH_CANCEL_KEEP,
  MATCH_CANCELLED,
  MATCH_CANCELLED_BANNER,
  MATCH_DO_SET,
  MATCH_ENDED_LABEL,
  MATCH_LIVE,
  MATCH_RULE,
  MATCH_SCORING_LABEL,
  MATCH_SHARE_LINK,
  MATCH_STANDINGS,
  MATCH_YOUR_BEST,
} from './match-copy';
import { shareMatchLink } from './share-match-link';

export function MatchBoardScreen({ matchId }: { matchId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const matchQuery = useQuery({
    queryKey: ['matches', 'detail', matchId],
    queryFn: () => apiClient.getMatch({ matchId }),
  });
  const cancel = useMutation({
    mutationFn: () => apiClient.cancelMatch({ matchId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  if (matchQuery.isPending) {
    return <ScreenLoader testID="match-board-loading" />;
  }

  const match = matchQuery.data;
  if (!match || matchQuery.isError) {
    return (
      <View style={styles.screen} testID="match-board-missing">
        <FormErrorBanner message="We could not load this match." />
      </View>
    );
  }

  const open = match.status === 'open';
  const cancelled = match.status === 'cancelled';
  const underCap = match.participantCount < match.participantCap;
  const winner = match.standings.find(
    (row) => row.userId === match.winnerUserId,
  );
  const you = match.standings.find((row) => row.isYou);
  const kicker = cancelled
    ? MATCH_CANCELLED
    : open
      ? MATCH_LIVE
      : MATCH_ENDED_LABEL;
  const title = matchContestTitle(
    match.standings
      .filter((row) => !row.isYou)
      .map((row) => row.displayName),
  );

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => matchQuery.refetch()}
      style={styles.screen}
      testID="match-board-screen"
    >
      <MatchKicker>{kicker}</MatchKicker>
      <View style={styles.titleRow}>
        <MatchMetricMark />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.sub}>
        {MATCH_SCORING_LABEL}
        {' · '}
        {formatMatchTimeLeft(match.endsAt)}
      </Text>
      <Text style={styles.rule}>{MATCH_RULE}</Text>

      <MatchCard emphasized>
        <Text style={styles.heroKicker}>{MATCH_YOUR_BEST}</Text>
        <Text style={styles.heroCount}>{match.yourBestCount}</Text>
        <Text style={styles.heroHint}>
          push-ups
          {you?.rank ? ` · #${you.rank}` : ''}
        </Text>
      </MatchCard>

      {cancelled ? (
        <MatchCard emphasized testID="match-cancelled">
          <Text style={styles.cancelled}>{MATCH_CANCELLED_BANNER}</Text>
        </MatchCard>
      ) : null}

      {!open && !cancelled && winner ? (
        <WinnerBanner winner={winner} />
      ) : null}

      <Text style={styles.section}>{MATCH_STANDINGS}</Text>
      <View style={styles.standings}>
        {match.standings.map((row) => (
          <StandingRow
            key={row.userId}
            leadCount={match.standings[0]?.bestCount ?? 0}
            row={row}
          />
        ))}
      </View>

      {open ? (
        <FormButton
          label={MATCH_DO_SET}
          onPress={() => router.push(`/matches/${match.id}/pose`)}
          testID="match-do-set"
          trailingIcon="play"
        />
      ) : null}

      {open && underCap ? (
        <FormButton
          label={MATCH_SHARE_LINK}
          onPress={() => void shareMatchLink(matchInviteUrl(match.token))}
          testID="match-share-link"
          trailingIcon="share"
          variant="secondary"
        />
      ) : null}

      {cancel.isError ? (
        <FormErrorBanner message="We could not cancel this match." />
      ) : null}

      {open && you?.isHost ? (
        <Pressable
          accessibilityRole="button"
          disabled={cancel.isPending}
          onPress={() => {
            Alert.alert(
              MATCH_CANCEL_CONFIRM_TITLE,
              MATCH_CANCEL_CONFIRM_BODY,
              [
                { text: MATCH_CANCEL_KEEP, style: 'cancel' },
                {
                  text: MATCH_CANCEL,
                  style: 'destructive',
                  onPress: () => cancel.mutate(),
                },
              ],
            );
          }}
          style={({ pressed }) => [
            styles.cancelLink,
            pressed ? styles.cancelLinkPressed : null,
          ]}
          testID="match-cancel"
        >
          <Text style={styles.cancelLabel}>{MATCH_CANCEL}</Text>
        </Pressable>
      ) : null}
    </RefreshableScroll>
  );
}

function WinnerBanner({ winner }: { winner: MatchStanding }) {
  return (
    <MatchCard emphasized testID="match-winner">
      <View style={styles.winnerRow}>
        <Ionicons color={colors.accent} name="trophy" size={22} />
        <Text style={styles.winner}>
          {winner.isYou ? 'You won' : `${winner.displayName} won`}
        </Text>
      </View>
    </MatchCard>
  );
}

function gapBehindLead(bestCount: number, leadCount: number): string | null {
  if (leadCount <= 0 || bestCount >= leadCount) {
    return null;
  }

  const gap = leadCount - bestCount;
  return gap === 1 ? '1 behind' : `${gap} behind`;
}

function StandingRow({
  row,
  leadCount,
}: {
  row: MatchStanding;
  leadCount: number;
}) {
  const leading = row.rank === 1 && row.bestCount > 0;
  const gapLabel = gapBehindLead(row.bestCount, leadCount);

  return (
    <View
      style={[
        styles.standingCard,
        row.isYou ? styles.standingYou : null,
        leading && !row.isYou ? styles.standingLead : null,
      ]}
      testID={`match-standing-${row.userId}`}
    >
      <MatchRankMark rank={row.rank} />
      <MatchInitial accent={row.isYou} name={row.displayName} />
      <View style={styles.nameBlock}>
        <Text numberOfLines={1} style={styles.name}>
          {row.displayName}
        </Text>
        <View style={styles.pills}>
          {row.isYou ? (
            <View style={styles.youPill}>
              <Text style={styles.youPillLabel}>You</Text>
            </View>
          ) : null}
          {row.isHost ? (
            <View style={styles.hostPill}>
              <Text style={styles.hostPillLabel}>Host</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.score}>
        {row.bestCount > 0 ? (
          <>
            <Text style={[styles.count, leading ? styles.countLead : null]}>
              {row.bestCount}
            </Text>
            <Text style={styles.countHint}>{gapLabel ?? 'best'}</Text>
          </>
        ) : (
          <Text style={styles.emptySet}>No set yet</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xxl,
    lineHeight: 36,
  },
  sub: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  rule: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  heroKicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroCount: {
    color: colors.accent,
    fontFamily: displayFontFamily,
    fontSize: MATCH_HERO_SIZE,
    lineHeight: MATCH_HERO_LINE,
  },
  heroHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  winner: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  cancelled: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelLinkPressed: {
    opacity: 0.7,
  },
  cancelLabel: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  section: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  standings: {
    gap: spacing.sm,
  },
  standingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  standingYou: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accentContainer,
  },
  standingLead: {
    backgroundColor: colors.surfaceRaised,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  youPill: {
    backgroundColor: colors.accentContainer,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youPillLabel: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  hostPill: {
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hostPillLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  score: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  count: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    lineHeight: 28,
  },
  countLead: {
    color: colors.accent,
  },
  countHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  emptySet: {
    color: colors.disabledText,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
