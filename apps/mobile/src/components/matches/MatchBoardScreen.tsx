import Ionicons from '@expo/vector-icons/Ionicons';
import {
  matchContestTitle,
  type MatchStanding,
} from '@product/contract/match-board';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshableScroll, ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import { formatMatchTimeLeft } from './format-match-time';
import {
  MATCH_HERO_LINE,
  MATCH_HERO_SIZE,
  MatchActivityMark,
  MatchCard,
  MatchChip,
  MatchKicker,
  MatchRankMark,
} from './match-chrome';
import {
  matchActivity,
  matchBoardAction,
  matchScoreUnitFor,
} from './match-metric';
import { standingProgress } from './standing-progress';
import {
  MATCH_CANCEL,
  MATCH_CANCEL_CONFIRM_BODY,
  MATCH_CANCEL_CONFIRM_TITLE,
  MATCH_CANCEL_FAILED,
  MATCH_CANCEL_KEEP,
  MATCH_CANCELLED,
  MATCH_CANCELLED_BANNER,
  MATCH_CREW_SAVE_FAILED,
  MATCH_CREW_SAVED,
  MATCH_ENDED_LABEL,
  MATCH_LIVE,
  MATCH_LOAD_FAILED,
  MATCH_PENDING,
  MATCH_SAVE_CREW,
  MATCH_SHARE_LINK,
  MATCH_STANDINGS,
  MATCH_WAITING_BODY,
  MATCH_WAITING_NOTE,
  MATCH_WAITING_TITLE,
  MATCH_YOUR_SCORE_LABEL,
  matchModeRule,
} from './match-copy';
import { shareMatchLink } from './share-match-link';

export function MatchBoardScreen({ matchId }: { matchId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const saveCrew = useMutation({
    mutationFn: () => apiClient.saveCrew({ matchId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });

  if (matchQuery.isPending) {
    return <ScreenLoader testID="match-board-loading" />;
  }

  const match = matchQuery.data;
  if (!match || matchQuery.isError) {
    return (
      <View style={styles.screen} testID="match-board-missing">
        <FormErrorBanner message={MATCH_LOAD_FAILED} />
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
  const leadScore = Math.max(0, ...match.standings.map((row) => row.score));
  const action = matchBoardAction(match.scoringMode, match.metric);
  // Until someone else is in, there is nothing to rank and the invite is the job.
  const waitingForOthers = open && match.participantCount === 1;
  // Except once there is a score. A walk that shows up as a grey line beneath
  // "Nobody has joined yet" reads as a walk that was thrown away, so the number
  // takes the hero back and the invite drops to a note.
  const soloWithScore = waitingForOthers && match.yourScore > 0;
  const scoreUnit = matchScoreUnitFor(
    match.scoringMode,
    match.metric,
    match.yourScore,
  );

  const board = (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => matchQuery.refetch()}
      testID="match-board-screen"
    >
      <MatchKicker>{kicker}</MatchKicker>
      <View style={styles.titleRow}>
        <MatchActivityMark
          activity={matchActivity(
            match.scoringMode,
            match.metric,
            match.dailyScope,
          )}
        />
        <Text style={styles.title}>{title}</Text>
      </View>
      {/* The rule sentence already names the scoring mode, so the meta line
          carries only what it cannot: how long is left. */}
      <Text style={styles.sub}>{formatMatchTimeLeft(match.endsAt)}</Text>
      <Text style={styles.rule}>
        {matchModeRule(match.scoringMode, match.metric, match.dailyScope)}
      </Text>

      {waitingForOthers && !soloWithScore ? (
        <WaitingCard />
      ) : (
        <ScoreHero
          label={MATCH_YOUR_SCORE_LABEL[match.scoringMode]}
          // A place needs someone to hold it against, and only once somebody
          // has played for it.
          rank={waitingForOthers || leadScore === 0 ? null : (you?.rank ?? null)}
          score={match.yourScore}
          unit={scoreUnit}
        />
      )}

      {cancelled ? (
        <MatchCard emphasized testID="match-cancelled">
          <Text style={styles.cancelled}>{MATCH_CANCELLED_BANNER}</Text>
        </MatchCard>
      ) : null}

      {!open && !cancelled && winner ? (
        <WinnerBanner winner={winner} />
      ) : null}

      {/* Sharing is the primary button while you are alone, so the quiet
          version of it only appears once the board has someone to beat. */}
      {open && underCap && !waitingForOthers ? (
        <MatchChip
          icon="share-outline"
          label={MATCH_SHARE_LINK}
          onPress={() => void shareMatchLink(match.inviteUrl)}
          testID="match-share-link"
        />
      ) : null}

      {soloWithScore ? (
        <Text style={styles.soloNote} testID="match-waiting-note">
          {MATCH_WAITING_NOTE}
        </Text>
      ) : waitingForOthers ? (
        <Text style={styles.soloNote} testID="match-solo-score">
          {`${MATCH_YOUR_SCORE_LABEL[match.scoringMode]}: ${match.yourScore} ${scoreUnit}`}
        </Text>
      ) : (
        <>
          <Text style={styles.section}>{MATCH_STANDINGS}</Text>
          <View style={styles.standings}>
            {match.standings.map((row, index) => (
              <Fragment key={row.userId}>
                <StandingRow leadScore={leadScore} row={row} />
                {index === match.standings.length - 1 ? null : (
                  <View style={styles.divider} />
                )}
              </Fragment>
            ))}
          </View>
        </>
      )}

      {/* Offered from a result, never from an empty "create a crew" screen:
          the roster is already known, so keeping it costs one tap. */}
      {match.canSaveCrew ? (
        <MatchChip
          icon={saveCrew.isSuccess ? 'checkmark' : 'bookmark-outline'}
          label={saveCrew.isSuccess ? MATCH_CREW_SAVED : MATCH_SAVE_CREW}
          onPress={() => saveCrew.mutate()}
          testID="match-save-crew"
        />
      ) : null}

      {saveCrew.isError ? (
        <FormErrorBanner message={MATCH_CREW_SAVE_FAILED} />
      ) : null}

      {cancel.isError ? (
        <FormErrorBanner message={MATCH_CANCEL_FAILED} />
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

  return (
    <View style={styles.screen}>
      {board}
      {open ? (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {waitingForOthers ? (
            <FormButton
              label={MATCH_SHARE_LINK}
              onPress={() => void shareMatchLink(match.inviteUrl)}
              testID="match-share-link"
              trailingIcon="share"
            />
          ) : null}
          <FormButton
            label={action.label}
            onPress={() =>
              router.navigate(
                action.session
                  ? `/matches/${match.id}/${action.session}`
                  : '/(tabs)/challenges',
              )
            }
            testID="match-do-set"
            trailingIcon={action.session ? 'play' : 'arrow-right'}
            variant={waitingForOthers ? 'secondary' : 'primary'}
          />
        </View>
      ) : null}
    </View>
  );
}

/** The one display numeral the screen is allowed, in the role Home gives a streak. */
function ScoreHero({
  label,
  score,
  unit,
  rank,
}: {
  label: string;
  score: number;
  unit: string;
  rank: number | null;
}) {
  return (
    <MatchCard emphasized>
      <Text style={styles.heroKicker}>{label}</Text>
      <Text style={[styles.heroCount, score > 0 ? null : styles.heroCountEmpty]}>
        {score}
      </Text>
      <Text style={styles.heroHint}>
        {unit}
        {rank ? ` · #${rank}` : ''}
      </Text>
    </MatchCard>
  );
}

/** Replaces the hero while the host is alone: the invite is the only score that matters. */
function WaitingCard() {
  return (
    <MatchCard emphasized testID="match-waiting">
      <Text style={styles.waitingTitle}>{MATCH_WAITING_TITLE}</Text>
      <Text style={styles.waitingBody}>{MATCH_WAITING_BODY}</Text>
    </MatchCard>
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

function StandingRow({
  row,
  leadScore,
}: {
  row: MatchStanding;
  leadScore: number;
}) {
  const { fraction, note } = standingProgress({
    score: row.score,
    leadScore,
  });
  const hasScore = row.score > 0;

  return (
    <View
      style={[
        styles.standingRow,
        row.isYou ? styles.standingYou : null,
        // Greyed until they accept: on the board, but plainly not playing yet.
        row.isPending ? styles.standingPending : null,
      ]}
      testID={`match-standing-${row.userId}`}
    >
      <View style={styles.standingTop}>
        <MatchRankMark rank={row.rank} scored={hasScore} />
        <View style={styles.nameBlock}>
          <Text numberOfLines={1} style={styles.name}>
            {row.isYou ? 'You' : row.displayName}
          </Text>
          {row.isPending ? (
            <Text style={styles.hostNote}>{MATCH_PENDING}</Text>
          ) : row.isHost ? (
            <Text style={styles.hostNote}>Host</Text>
          ) : null}
        </View>
        <Text style={[styles.count, hasScore ? null : styles.countEmpty]}>
          {hasScore ? row.score : '—'}
        </Text>
      </View>

      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${fraction * 100}%` }]} />
        </View>
        <Text numberOfLines={1} style={styles.barNote}>
          {row.isPending ? MATCH_PENDING : (note ?? '')}
        </Text>
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
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
  heroCountEmpty: {
    color: colors.disabledText,
  },
  heroHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  waitingTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  waitingBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  soloNote: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
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
    marginHorizontal: -spacing.lg,
  },
  standingRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  standingYou: {
    backgroundColor: colors.accentSurface,
  },
  standingPending: {
    opacity: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  standingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  hostNote: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  count: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  countEmpty: {
    color: colors.disabledText,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  // Fixed so every bar shares one baseline and the counts stay comparable.
  barNote: {
    width: 76,
    textAlign: 'right',
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  actionBar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.background,
  },
});
