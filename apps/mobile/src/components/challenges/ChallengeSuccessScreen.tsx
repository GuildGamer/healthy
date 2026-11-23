import type { MatchMetric } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { DeckButton, DeckNavButton, DeckSheetMessage } from '@/components/deck';
import { SyncStatusLine } from '@/components/feedback/SyncStatusLine';
import { inviteShareMessage } from '@/components/matches/invite-message';
import { MATCH_DEFAULT_METRIC } from '@/components/matches/match-metric';
import {
  openShareDestination,
  type ShareDestinationId,
} from '@/components/matches/share-destination';
import { SHARE_DEST_COPY, SetSharePager, ShareDestinationRow } from '@/components/share';
import { findBenefitTip, WhyItMatters } from '@/components/tips';
import { apiClient } from '@/lib/api';
import { proofClipMaxDurationSeconds } from '@/lib/proof-clip-max-duration';
import { markMembershipCtaShownThisSession, markSuccessWasPenalty } from '@/lib/app-review-session';
import { getSessionData, isEmailVerified } from '@/lib/auth-client';
import { goBackOrHome } from '@/lib/go-back';
import { usePendingSync } from '@/lib/pending-sync-store';
import { hasDeferredOnboarding } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import { clearPendingSharePhoto, pendingSharePhotoFor } from '@/lib/share-card-session';
import { trackEvent } from '@/lib/track-event';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';
import { FRIEND_CHALLENGE_COPY } from './constants/friend-challenge';
import { SUCCESS_COPY } from './constants/success-copy';
import { friendChallengeSpec } from './friend-challenge';
import { nextGoalLadderOffer, type GoalLadderOffer } from './goal-ladder';
import { poseShareCopy } from './pose-share-copy';
import { ProofClipHero } from './ProofClipActions';
import { posterForSuccess, type SuccessFace } from './success-poster';
import { defaultShareFillId, type ShareFillId } from './share-fill';
import { posterRunLine } from './share-poster';
import { ShareFillCarousel } from './ShareFillCarousel';
import { SharePosterCard } from './SharePosterCard';
import type { FriendChallengeSource } from './types/friend-challenge';
import { useFriendChallenge } from './useFriendChallenge';
import { useUpdateEnrollment } from './useChallengeMutations';
import { type ProofClipState, useProofClip } from './useProofClip';

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
  /** Recording was on but the clip never landed on the phone. */
  proofFailed?: boolean;
  /** Who may watch this set’s clip by its code. */
  proofAudience?: 'anyone' | 'only_me';
  /**
   * Opened after a save-first queue: the set is on the phone and still
   * syncing. Clears to “Saved” once the outbox empties for this session.
   */
  syncing?: boolean;
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
  if (input.face === 'minutes' || input.face === 'glasses' || input.face === 'gym' || input.face === 'logged') {
    return input.face;
  }

  if ((input.completedCount ?? 0) > 0 && input.matchMetric !== 'walk') {
    return 'reps';
  }

  if (input.face === 'reps') {
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

function useShareCardImage() {
  const shotRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return { shotRef, isSharing, error, setError, setIsSharing };
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

    // Dismiss onto the board still under this success screen — replace would
    // stack a second board and force a double Back.
    if (matchId) {
      goBackOrHome(`/matches/${matchId}`);
      return;
    }

    router.replace('/(tabs)');
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
    proofFailed = false,
    proofAudience = 'anyone',
    syncing: startedSyncing = false,
  } = props;
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const sync = usePendingSync();
  const isStillSyncing = startedSyncing && sync.pendingCount > 0;
  const showSyncLine = startedSyncing;
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
  const shareImage = useShareCardImage();
  const proof = useProofClip(proofClipId ?? null, proofAudience, { isGroup: isMatch });
  const meForProofLimits = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
    staleTime: 60_000,
  });
  const proofMaxDurationSeconds = proofClipMaxDurationSeconds(meForProofLimits.data?.proofClipLimits);
  const { me, leave } = useLeaveSuccess(matchId);
  const benefitTip = useSuccessBenefitTip({ challengeId, activityKey, practice, isMatch });
  const [photoUri] = useState(() => pendingSharePhotoFor(userChallengeId));
  const [ladderDismissed, setLadderDismissed] = useState(false);
  const [fillId, setFillId] = useState<ShareFillId | null>(null);

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

  if (proof.isLoading || proof.clip) {
    const clipPose = poseShareCopy(activityKey ?? matchMetric);
    const clipPoster = posterForSuccess({
      title,
      face: successFace({ face, completedCount, matchMetric, minutes, glasses }),
      count: completedCount,
      minutes,
      glasses,
      metric: clipPose.metric,
    });
    const clipFill = fillId ?? defaultShareFillId(clipPoster.kind);
    const streakForClip =
      isMatch || practice ? (me?.currentStreakDays ?? currentStreakDays) : currentStreakDays;

    return (
      <ClipFinishScreen
        completedCount={completedCount}
        friend={friend}
        isDayFinished={isDayFinished}
        isStillSyncing={isStillSyncing}
        matchId={matchId}
        onLeave={leave}
        onSelectFill={setFillId}
        photoUri={photoUri}
        poster={clipPoster}
        proof={proof}
        proofMaxDurationSeconds={proofMaxDurationSeconds}
        selectedFill={clipFill}
        showSyncLine={showSyncLine}
        streakDays={streakForClip}
      />
    );
  }

  const clipFailed = (proofFailed && !proofClipId) || proof.isMissing;
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
  const pose = poseShareCopy(activityKey ?? matchMetric);
  const poster = posterForSuccess({
    title,
    face: successFace({ face, completedCount, matchMetric, minutes, glasses }),
    count: completedCount,
    minutes,
    glasses,
    metric: pose.metric,
  });
  const showMembershipLink =
    friend.isReady && !(me?.hasMembership ?? false) && !isMatch && !practice && !friend.isOffered;
  const selectedFill = fillId ?? defaultShareFillId(poster.kind);

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      {isDayFinished ? <Text style={styles.headline}>{SUCCESS_COPY.dayFinished}</Text> : null}
      {showSyncLine ? (
        <View style={styles.syncLine}>
          <SyncStatusLine
            label={isStillSyncing ? SUCCESS_COPY.savedSyncing : SUCCESS_COPY.saved}
            testID="challenge-success-sync"
            tone={isStillSyncing ? 'syncing' : 'saved'}
          />
        </View>
      ) : null}
      <View style={styles.body}>
        <View collapsable={false} ref={shareImage.shotRef} style={styles.posterWrap}>
          <SharePosterCard
            fillId={selectedFill}
            photoUri={photoUri}
            poster={poster}
            runLine={posterRunLine(streakDays)}
          />
        </View>
        <WhyItMatters tip={benefitTip} />
      </View>
      <View style={styles.actions}>
        {clipFailed ? <DeckSheetMessage message={POSE_COPY.proofFailed} /> : null}
        {shareImage.error ? <DeckSheetMessage message={shareImage.error} /> : null}
        {friend.didFail ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null}
        <ShareFillCarousel onSelect={setFillId} selected={selectedFill} />
        <SuccessActions
          completedCount={completedCount}
          friend={friend}
          matchId={matchId}
          shareImage={shareImage}
        />
        {ladderOffer && challengeId ? (
          <GoalLadderPrompt
            challengeId={challengeId}
            currentTarget={targetCount ?? 0}
            metricUnit={pose.unit}
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

/**
 * Clip finish: video page then poster page. Destinations send the page in
 * front. Close is the X — no audience toggle, Save to Photos, Discard, or Not now.
 */
function ClipFinishScreen({
  proof,
  friend,
  matchId,
  completedCount,
  onLeave,
  onSelectFill,
  photoUri,
  poster,
  selectedFill,
  streakDays,
  proofMaxDurationSeconds,
  isDayFinished,
  showSyncLine,
  isStillSyncing,
}: {
  proof: ProofClipState;
  friend: ReturnType<typeof useFriendChallenge>;
  matchId?: string;
  completedCount?: number;
  onLeave: () => void;
  onSelectFill: (id: ShareFillId) => void;
  photoUri?: string;
  poster: ReturnType<typeof posterForSuccess>;
  selectedFill: ShareFillId;
  streakDays: number;
  proofMaxDurationSeconds: number;
  isDayFinished: boolean;
  showSyncLine: boolean;
  isStillSyncing: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const isGroup = Boolean(matchId);
  const matchQuery = useQuery({
    queryKey: ['matches', matchId],
    queryFn: () => apiClient.getMatch({ matchId: matchId! }),
    enabled: Boolean(matchId),
  });
  const [postToBoard, setPostToBoard] = useState(true);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const inviteUrl = matchQuery.data?.inviteUrl ?? null;
  const caption =
    matchQuery.data != null
      ? inviteShareMessage({
          hostScore: completedCount ?? matchQuery.data.yourScore,
          hostTitle: matchQuery.data.hostTitle,
          metric: matchQuery.data.metric,
          scoringMode: matchQuery.data.scoringMode,
          endsAt: matchQuery.data.endsAt,
        })
      : completedCount != null && completedCount > 0
        ? `I did ${completedCount}. Think you can beat me?`
        : 'Think you can beat me?';

  const clipMedia =
    proof.clip?.fileUri != null
      ? {
          playUri: proof.clip.fileUri,
          shareUri: proof.clip.fileUri,
          socialShareUri: proof.clip.socialFileUri ?? null,
          posterFrameUri: proof.clip.posterUri ?? null,
        }
      : null;

  function leave() {
    if (isGroup && postToBoard) {
      proof.queuePostToGroup();
    }
    onLeave();
  }

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      <View style={styles.clipNav}>
        <View style={styles.navSpacer} />
        <DeckNavButton
          accessibilityLabel={SUCCESS_COPY.close}
          glyph="close"
          onPress={leave}
          testID="challenge-success-close"
        />
      </View>
      {isDayFinished ? <Text style={styles.headline}>{SUCCESS_COPY.dayFinished}</Text> : null}
      {showSyncLine ? (
        <View style={styles.syncLine}>
          <SyncStatusLine
            label={isStillSyncing ? SUCCESS_COPY.savedSyncing : SUCCESS_COPY.saved}
            testID="challenge-success-sync"
            tone={isStillSyncing ? 'syncing' : 'saved'}
          />
        </View>
      ) : null}
      <SetSharePager
        caption={caption}
        clip={clipMedia}
        fillId={selectedFill}
        footer={
          <>
            {isGroup ? (
              <View style={styles.boardRow} testID="proof-group-board-row">
                <Text style={styles.boardLabel}>{POSE_COPY.proofOnGroupBoard}</Text>
                <Switch
                  accessibilityLabel={POSE_COPY.proofOnGroupBoard}
                  disabled={proof.isBusy}
                  onValueChange={setPostToBoard}
                  testID="proof-group-board-switch"
                  thumbColor={colors.surface}
                  trackColor={{ false: colors.tickIdle, true: colors.accent }}
                  value={postToBoard}
                />
              </View>
            ) : null}
            {statusNote ? (
              <Text accessibilityLiveRegion="polite" style={styles.hint} testID="proof-status-line">
                {statusNote}
              </Text>
            ) : null}
          </>
        }
        inviteUrl={inviteUrl}
        isClipLoading={proof.isLoading}
        messages={
          <>
            {proof.error ? <DeckSheetMessage message={proof.error} /> : null}
            {friend.didFail ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null}
          </>
        }
        onChallenge={friend.challengeFriend}
        onCopied={() => setStatusNote(SHARE_DEST_COPY.copiedLink)}
        onSelectFill={onSelectFill}
        photoUri={photoUri}
        poster={poster}
        renderVideo={() => (
          <ProofClipHero
            fill
            maxDurationSeconds={proofMaxDurationSeconds}
            opensViewer={false}
            proof={proof}
            showMeta={false}
          />
        )}
        runLine={posterRunLine(streakDays)}
        showChallenge={!isGroup && friend.isReady && friend.isOffered}
        showCopy={Boolean(inviteUrl)}
        destinationsDisabled={proof.isBusy}
      />
    </SafeAreaView>
  );
}

function GoalLadderPrompt({
  challengeId,
  currentTarget,
  metricUnit,
  offer,
  streakDays,
  onDismiss,
}: {
  challengeId: string;
  currentTarget: number;
  metricUnit: string;
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
      <Text style={styles.actionPrompt}>
        {SUCCESS_COPY.goalLadderPrompt(offer.nextTarget, metricUnit)}
      </Text>
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
  completedCount,
  matchId,
}: {
  friend: ReturnType<typeof useFriendChallenge>;
  shareImage: ReturnType<typeof useShareCardImage>;
  completedCount?: number;
  matchId?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  async function onDestination(id: ShareDestinationId | 'challenge') {
    if (id === 'challenge') {
      friend.challengeFriend();
      return;
    }

    shareImage.setIsSharing(true);
    try {
      const posterUri = shareImage.shotRef.current
        ? await captureRef(shareImage.shotRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          }).catch(() => null)
        : null;

      if (!posterUri) {
        return;
      }

      const caption =
        completedCount != null && completedCount > 0
          ? `I did ${completedCount}. Think you can beat me?`
          : 'Think you can beat me?';

      await openShareDestination(id, {
        caption,
        artifact: { kind: 'image', posterUri },
      });

      if (id === 'copy') {
        setStatusNote(SHARE_DEST_COPY.copiedLink);
      }
    } finally {
      shareImage.setIsSharing(false);
    }
  }

  if (!friend.isReady) {
    return (
      <View style={styles.assigningRow} testID="challenge-success-assigning">
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return (
    <>
      <Text style={styles.actionPrompt}>
        {friend.isOffered ? FRIEND_CHALLENGE_COPY.prompt : SUCCESS_COPY.sharePrompt}
      </Text>
      <View testID="challenge-success-share">
        <ShareDestinationRow
          disabled={shareImage.isSharing || friend.isCreating}
          onSelect={(id) => void onDestination(id)}
          showChallenge={!matchId && friend.isOffered}
          showCopy={false}
        />
      </View>
      {statusNote ? (
        <Text accessibilityLiveRegion="polite" style={styles.hint}>
          {statusNote}
        </Text>
      ) : null}
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
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quietAction,
        pressed || disabled ? styles.quietActionPressed : null,
      ]}
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
    clipNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
    navSpacer: {
      flex: 1,
    },
    headline: {
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.8,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    syncLine: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
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
    boardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    boardLabel: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      flex: 1,
    },
    hint: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      textAlign: 'center',
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
