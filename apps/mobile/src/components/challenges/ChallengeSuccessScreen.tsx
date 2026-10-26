import type { MatchMetric } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { DeckButton, DeckRoundButton, DeckSheetMessage } from '@/components/deck';
import { MATCH_DEFAULT_METRIC } from '@/components/matches/match-metric';
import { findBenefitTip, WhyItMatters } from '@/components/tips';
import { apiClient } from '@/lib/api';
import { markMembershipCtaShownThisSession, markSuccessWasPenalty } from '@/lib/app-review-session';
import { getSessionData, isEmailVerified } from '@/lib/auth-client';
import { hasDeferredOnboarding } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import { clearPendingSharePhoto, pendingSharePhotoFor } from '@/lib/share-card-session';
import { trackEvent } from '@/lib/track-event';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { FRIEND_CHALLENGE_COPY } from './constants/friend-challenge';
import { SUCCESS_COPY } from './constants/success-copy';
import { friendChallengeSpec } from './friend-challenge';
import { nextGoalLadderOffer, type GoalLadderOffer } from './goal-ladder';
import { ProofClipActions } from './ProofClipActions';
import { posterForSuccess, type SuccessFace } from './success-poster';
import { posterRunLine } from './share-poster';
import { SharePosterCard } from './SharePosterCard';
import type { FriendChallengeSource } from './types/friend-challenge';
import { useFriendChallenge } from './useFriendChallenge';
import { useUpdateEnrollment } from './useChallengeMutations';

type ChallengeSuccessScreenProps = {
  title: string;
  pointsAwarded: number;
  currentStreakDays: number;
  penaltyApplied?: number;
  completedCount?: number;
  targetCount?: number;
  matchId?: string;
  /** Habit occurrence that was just completed — seeds a friend challenge. */
  userChallengeId?: string;
  /** Catalog challenge id — used to resolve "Why it matters" via slug. */
  challengeId?: string;
  /** Device / activity key for tip matching when slug is unknown. */
  activityKey?: string;
  /** What the contest is scored on, so the kicker names what was banked. */
  matchMetric?: MatchMetric;
  /** An extra set after the daily challenge: shareable, but worth nothing. */
  practice?: boolean;
  /** What a friend would be challenged to; derived from the finish that opened this page. */
  friendSource?: FriendChallengeSource;
  /** Opened because the last challenge of the day was just finished. */
  isDayFinished?: boolean;
  /** Which result the share card heroes. Absent on older links, which fall back to the count. */
  face?: SuccessFace;
  minutes?: number;
  glasses?: number;
  /** Local proof clip from this set, if recording was on. */
  proofClipId?: string;
};

/**
 * A daily finish or a counted set may invite a friend; a group set only when
 * it was push-ups, as before. A penalised finish never asks.
 */
function canInviteFriend(props: ChallengeSuccessScreenProps, wasPenalized: boolean): boolean {
  if (wasPenalized) {
    return false;
  }

  if (props.matchId) {
    return props.matchMetric !== 'walk';
  }

  return Boolean(props.userChallengeId) || (props.completedCount ?? 0) > 0;
}

/** Reps, minutes and glasses stay the hero. Everything else is a quiet word. */
function successFace(input: {
  face?: SuccessFace;
  completedCount?: number;
  matchMetric: MatchMetric;
  minutes?: number;
  glasses?: number;
}): SuccessFace {
  if (input.face) {
    return input.face;
  }

  if ((input.completedCount ?? 0) > 0 && input.matchMetric !== 'walk') {
    return 'reps';
  }

  if ((input.minutes ?? 0) > 0) {
    return 'minutes';
  }

  if ((input.glasses ?? 0) > 0) {
    return 'glasses';
  }

  return 'done';
}

function useShareCardImage(context: {
  matchId?: string;
  userChallengeId?: string;
  practice: boolean;
}) {
  const shotRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setError(null);
    setIsSharing(true);
    try {
      if (!shotRef.current) {
        setError(SUCCESS_COPY.prepareFailed);
        return;
      }

      // The same card the history Share screen shows. PNG keeps its rounded corners.
      const uri = await captureRef(shotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      if (!(await Sharing.isAvailableAsync())) {
        setError(SUCCESS_COPY.sharingUnavailable);
        return;
      }

      trackEvent('challenge_shared', {
        share_channel: 'image_card',
        match_id: context.matchId,
        user_challenge_id: context.userChallengeId,
        practice: context.practice,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: SUCCESS_COPY.shareDialog,
      });
    } catch {
      setError(SUCCESS_COPY.shareFailed);
    } finally {
      setIsSharing(false);
    }
  }

  return { shotRef, isSharing, error, share: () => void share() };
}

function useLeaveSuccess(matchId: string | undefined) {
  const router = useRouter();
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });

  async function leave() {
    const me = meQuery.data;
    const session = await getSessionData();
    const owesOnboarding =
      me &&
      hasDeferredOnboarding({
        emailVerified: isEmailVerified(session),
        name: me.name,
        countryCode: me.countryCode,
      });

    if (owesOnboarding) {
      const href = await resolvePostAuthHref();
      if (href && href !== '/(tabs)' && !href.startsWith('/match/')) {
        router.replace(href);
        return;
      }
    }

    router.replace(matchId ? `/matches/${matchId}` : '/(tabs)');
  }

  return { me: meQuery.data, leave: () => void leave() };
}

/** The full Well done page: the day's share card, the friend challenge, and a quiet way on. */
export function ChallengeSuccessScreen(props: ChallengeSuccessScreenProps) {
  const {
    title,
    currentStreakDays,
    penaltyApplied = 0,
    completedCount,
    targetCount,
    matchId,
    userChallengeId,
    challengeId,
    activityKey,
    matchMetric = MATCH_DEFAULT_METRIC,
    practice = false,
    isDayFinished = false,
    face,
    minutes,
    glasses,
    proofClipId,
  } = props;
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const isMatch = Boolean(matchId);
  const wasPenalized = penaltyApplied > 0;
  const friend = useFriendChallenge({
    spec: friendChallengeSpec(
      props.friendSource ?? {
        kind: 'reps',
        count: completedCount ?? 0,
        metric:
          props.matchMetric && props.matchMetric !== 'walk' ? props.matchMetric : 'pushups',
      },
    ),
    isEligible: canInviteFriend(props, wasPenalized),
    userChallengeId,
    parentMatchId: matchId,
    practice,
  });
  const shareImage = useShareCardImage({ matchId, userChallengeId, practice });
  const { me, leave } = useLeaveSuccess(matchId);
  const benefitTip = useSuccessBenefitTip({ challengeId, activityKey, practice, isMatch });
  const [photoUri] = useState(() => pendingSharePhotoFor(userChallengeId));
  const [ladderDismissed, setLadderDismissed] = useState(false);

  useEffect(() => {
    markSuccessWasPenalty(penaltyApplied);
  }, [penaltyApplied]);

  useEffect(() => clearPendingSharePhoto, []);

  const doneLabel =
    friend.isOffered || !friend.isReady
      ? SUCCESS_COPY.notNow
      : isMatch
        ? SUCCESS_COPY.backToGroup
        : SUCCESS_COPY.seeNext;

  if (wasPenalized) {
    return (
      <SafeAreaView style={styles.container} testID="challenge-success-screen">
        <PenaltySummary
          currentStreakDays={currentStreakDays}
          penaltyApplied={penaltyApplied}
          title={title}
        />
        <View style={styles.actions}>
          <DeckButton label={doneLabel} onPress={leave} testID="challenge-success-done" />
        </View>
      </SafeAreaView>
    );
  }

  const streakDays =
    isMatch || practice ? (me?.currentStreakDays ?? currentStreakDays) : currentStreakDays;
  const ladderOffer =
    !practice && !isMatch && !ladderDismissed && challengeId
      ? nextGoalLadderOffer({
          metric: activityKey,
          currentTarget: targetCount,
          streakDays,
        })
      : null;
  const poster = posterForSuccess({
    title,
    face: successFace({ face, completedCount, matchMetric, minutes, glasses }),
    count: completedCount,
    minutes,
    glasses,
  });
  const showMembershipLink =
    friend.isReady && !(me?.hasMembership ?? false) && !isMatch && !practice && !friend.isOffered;

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      {isDayFinished ? <Text style={styles.headline}>{SUCCESS_COPY.dayFinished}</Text> : null}
      <View style={styles.body}>
        <View collapsable={false} ref={shareImage.shotRef} style={styles.posterWrap}>
          <SharePosterCard
            photoUri={photoUri}
            poster={poster}
            runLine={posterRunLine(streakDays)}
          />
        </View>
        <WhyItMatters tip={benefitTip} />
      </View>
      <View style={styles.actions}>
        {proofClipId ? (
          <ProofClipActions
            clipId={proofClipId}
            visibility={isMatch ? 'group' : 'shared'}
          />
        ) : null}
        {shareImage.error ? <DeckSheetMessage message={shareImage.error} /> : null}
        {friend.didFail ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null}
        <SuccessActions friend={friend} shareImage={shareImage} />
        {ladderOffer && challengeId ? (
          <GoalLadderPrompt
            challengeId={challengeId}
            currentTarget={targetCount ?? 0}
            offer={ladderOffer}
            onDismiss={() => setLadderDismissed(true)}
            streakDays={streakDays}
          />
        ) : null}
        <View style={[styles.quietRow, showMembershipLink ? styles.quietRowSplit : null]}>
          {showMembershipLink ? (
            <QuietAction
              label={SUCCESS_COPY.unlockMembership}
              onPress={() => {
                markMembershipCtaShownThisSession();
                router.push({ pathname: '/membership', params: { source: 'success' } });
              }}
              testID="challenge-success-membership"
            />
          ) : null}
          <QuietAction label={doneLabel} onPress={leave} testID="challenge-success-done" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function GoalLadderPrompt({
  challengeId,
  currentTarget,
  offer,
  streakDays,
  onDismiss,
}: {
  challengeId: string;
  currentTarget: number;
  offer: GoalLadderOffer;
  streakDays: number;
  onDismiss: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const updateEnrollment = useUpdateEnrollment();
  const offeredTracked = useRef(false);

  useEffect(() => {
    if (offeredTracked.current) {
      return;
    }

    offeredTracked.current = true;
    trackEvent('goal_ladder_offered', {
      challengeId,
      currentTarget,
      nextTarget: offer.nextTarget,
      streakDays,
    });
  }, [challengeId, currentTarget, offer.nextTarget, streakDays]);

  function accept() {
    trackEvent('goal_ladder_accepted', {
      challengeId,
      currentTarget,
      nextTarget: offer.nextTarget,
      streakDays,
    });
    updateEnrollment.mutate(
      { challengeId, targetCount: offer.nextTarget },
      { onSettled: onDismiss },
    );
  }

  function decline() {
    trackEvent('goal_ladder_declined', {
      challengeId,
      currentTarget,
      nextTarget: offer.nextTarget,
      streakDays,
    });
    onDismiss();
  }

  return (
    <View style={styles.ladderBlock} testID="goal-ladder-offer">
      <Text style={styles.actionPrompt}>{SUCCESS_COPY.goalLadderPrompt(offer.nextTarget)}</Text>
      <DeckButton
        label={SUCCESS_COPY.goalLadderAccept(offer.nextTarget)}
        loading={updateEnrollment.isPending}
        onPress={accept}
        testID="goal-ladder-accept"
      />
      <QuietAction
        label={SUCCESS_COPY.goalLadderDecline}
        onPress={decline}
        testID="goal-ladder-decline"
      />
    </View>
  );
}

function SuccessActions({
  friend,
  shareImage,
}: {
  friend: ReturnType<typeof useFriendChallenge>;
  shareImage: ReturnType<typeof useShareCardImage>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!friend.isReady) {
    return (
      <View style={styles.assigningRow} testID="challenge-success-assigning">
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  if (!friend.isOffered) {
    return (
      <>
        <Text style={styles.actionPrompt}>{SUCCESS_COPY.sharePrompt}</Text>
        <DeckButton
          glyph="share"
          label={SUCCESS_COPY.share}
          loading={shareImage.isSharing}
          onPress={shareImage.share}
          testID="challenge-success-share"
        />
      </>
    );
  }

  return (
    <>
      <Text style={styles.actionPrompt}>{FRIEND_CHALLENGE_COPY.prompt}</Text>
      <View style={styles.primaryRow}>
        <DeckButton
          isFlexible
          label={FRIEND_CHALLENGE_COPY.action}
          loading={friend.isCreating}
          onPress={friend.challengeFriend}
          testID="challenge-success-challenge-friend"
        />
        <DeckRoundButton
          accessibilityLabel={SUCCESS_COPY.shareResult}
          disabled={shareImage.isSharing}
          glyph="share"
          onPress={shareImage.share}
          onSurface
          testID="challenge-success-share"
        />
      </View>
    </>
  );
}

function useSuccessBenefitTip(input: {
  challengeId?: string;
  activityKey?: string;
  practice: boolean;
  isMatch: boolean;
}) {
  const canMatch = !input.practice && !input.isMatch && Boolean(input.challengeId || input.activityKey);
  const tipsQuery = useQuery({
    queryKey: ['tips'],
    queryFn: () => apiClient.listTips(),
    enabled: canMatch,
  });
  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
    enabled: canMatch && Boolean(input.challengeId),
  });

  if (!canMatch) {
    return null;
  }

  const challengeSlug = catalogQuery.data?.challenges.find(
    (item) => item.challengeId === input.challengeId,
  )?.slug;

  return findBenefitTip(tipsQuery.data?.tips ?? [], {
    challengeSlug,
    activityKey: input.activityKey,
  });
}

function PenaltySummary({
  title,
  penaltyApplied,
  currentStreakDays,
}: {
  title: string;
  penaltyApplied: number;
  currentStreakDays: number;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.body, styles.penaltyBody]}>
      <Text style={styles.penaltyKicker}>{SUCCESS_COPY.photoCheckMissed}</Text>
      <Text style={styles.penaltyTitle}>{title}</Text>
      <Text style={styles.penaltySubtitle}>
        {penaltyApplied} {SUCCESS_COPY.penaltyLine}
      </Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>-{penaltyApplied}</Text>
          <Text style={styles.statLabel}>points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{currentStreakDays}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
      </View>
    </View>
  );
}

function QuietAction({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.quietAction, pressed ? styles.quietActionPressed : null]}
      testID={testID}
    >
      <Text style={styles.quietActionLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headline: {
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.8,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      minHeight: 0,
      alignItems: 'center',
    },
    posterWrap: {
      marginTop: 18,
    },
    actions: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
    ladderBlock: {
      gap: spacing.sm,
    },
    actionPrompt: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    assigningRow: {
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    quietRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quietRowSplit: {
      justifyContent: 'space-between',
    },
    quietAction: {
      paddingVertical: spacing.xs,
    },
    quietActionPressed: {
      opacity: 0.65,
    },
    quietActionLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    penaltyBody: {
      justifyContent: 'center',
      gap: spacing.sm,
    },
    penaltyKicker: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    penaltyTitle: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    penaltySubtitle: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 20,
      textAlign: 'center',
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginVertical: spacing.sm,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    statValue: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
    },
    statLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: theme.colors.border,
    },
  });
