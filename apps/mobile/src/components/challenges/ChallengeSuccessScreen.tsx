import Feather from '@expo/vector-icons/Feather';
import type { MatchMetric } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { shareMatchLink } from '@/components/matches/share-match-link';
import {
  MATCH_DEFAULT_METRIC,
  MATCH_LOGGED_KICKER,
} from '@/components/matches/match-metric';
import { apiClient } from '@/lib/api';
import {
  markMembershipCtaShownThisSession,
  markSuccessWasPenalty,
} from '@/lib/app-review-session';
import { getSessionData, isEmailVerified } from '@/lib/auth-client';
import { displayFontFamily } from '@/lib/fonts';
import { hasDeferredOnboarding } from '@/lib/post-auth-route';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';
import {
  clearPendingShareCard,
  peekPendingShareCard,
  type ShareCardPayload,
} from '@/lib/share-card-session';
import { trackEvent } from '@/lib/track-event';
import {
  ChallengeShareCard,
  SHARE_CARD_ASPECT_RATIO,
  SHARE_CARD_EXPORT_HEIGHT,
  SHARE_CARD_EXPORT_WIDTH,
} from './ChallengeShareCard';

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
  /** What the contest is scored on, so the kicker names what was banked. */
  matchMetric?: MatchMetric;
  /** An extra set after the daily challenge: shareable, but worth nothing. */
  practice?: boolean;
};

function isTreatmentAssignment(assignment: {
  variantKey: string;
  configuration: Record<string, unknown> | null;
} | null | undefined): boolean {
  if (!assignment) {
    return false;
  }

  if (assignment.variantKey === 'treatment') {
    return true;
  }

  return assignment.configuration?.completionCta === 'challenge_friend_primary';
}

export function ChallengeSuccessScreen({
  title,
  pointsAwarded,
  currentStreakDays,
  penaltyApplied = 0,
  completedCount,
  targetCount,
  matchId,
  userChallengeId,
  matchMetric = MATCH_DEFAULT_METRIC,
  practice = false,
}: ChallengeSuccessScreenProps) {
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const isMatch = Boolean(matchId);
  const wasPenalized = penaltyApplied > 0;
  /**
   * Verified push-up sets enter the flywheel — daily challenge, group attempt,
   * or practice/extra set. The social object is the score, not the points.
   * seedCount alone is enough when `userChallengeId` is absent.
   */
  const canEnterFlywheel =
    !wasPenalized &&
    matchMetric === 'pushups' &&
    (Boolean(userChallengeId) ||
      Boolean(matchId) ||
      (completedCount != null && completedCount > 0));

  const assignmentQuery = useQuery({
    queryKey: ['experiments', 'challenge_referral_v1'],
    queryFn: () =>
      apiClient.getExperimentAssignment({
        experimentKey: 'challenge_referral_v1',
      }),
    enabled: canEnterFlywheel,
  });

  const assignmentReady =
    !canEnterFlywheel ||
    assignmentQuery.isFetched ||
    assignmentQuery.isError;
  const isTreatment =
    canEnterFlywheel &&
    assignmentReady &&
    isTreatmentAssignment(assignmentQuery.data);
  const hasMembership = meQuery.data?.hasMembership ?? false;
  const shareShotRef = useRef<View>(null);
  const [pendingShare] = useState<ShareCardPayload | null>(() =>
    peekPendingShareCard(),
  );
  const [shareBusy, setShareBusy] = useState(false);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const ctaTracked = useRef(false);

  useEffect(() => {
    markSuccessWasPenalty(penaltyApplied);
  }, [penaltyApplied]);

  useEffect(() => {
    return () => {
      clearPendingShareCard();
    };
  }, []);

  useEffect(() => {
    if (!isTreatment || ctaTracked.current) {
      return;
    }

    ctaTracked.current = true;
    trackEvent('challenge_cta_viewed', {
      experiment_id: assignmentQuery.data?.experimentId,
      experiment_variant: assignmentQuery.data?.variantKey,
      match_id: matchId,
      user_challenge_id: userChallengeId,
      challenge_goal: completedCount,
      practice,
    });
  }, [
    assignmentQuery.data?.experimentId,
    assignmentQuery.data?.variantKey,
    completedCount,
    isTreatment,
    matchId,
    practice,
    userChallengeId,
  ]);

  async function shareBrandedPhoto() {
    setActionError(null);
    setShareBusy(true);

    try {
      if (!shareShotRef.current) {
        setActionError('Could not prepare that image. Try again.');
        return;
      }

      // Capture the square bitmap at export resolution. Do not round the
      // capture target — JPEG has no alpha, so clipped corners fill white.
      const uri = await captureRef(shareShotRef, {
        format: 'jpg',
        quality: 1,
        width: SHARE_CARD_EXPORT_WIDTH,
        height: SHARE_CARD_EXPORT_HEIGHT,
        result: 'tmpfile',
      });

      if (!(await Sharing.isAvailableAsync())) {
        setActionError('Sharing is not available on this device.');
        return;
      }

      trackEvent('challenge_shared', {
        share_channel: 'image_card',
        match_id: matchId,
        user_challenge_id: userChallengeId,
        practice,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share your Healthy win',
      });
    } catch {
      setActionError('Could not share that image. Try again.');
    } finally {
      setShareBusy(false);
    }
  }

  const challengeFriend = useMutation({
    mutationFn: async () => {
      const assignment = assignmentQuery.data;
      return apiClient.createMatch({
        window: 'today',
        metric: 'pushups',
        scoringMode: 'best_single',
        sourceUserChallengeId: userChallengeId,
        parentMatchId: matchId,
        experimentId: assignment?.experimentId,
        experimentVariantKey: assignment?.variantKey,
        seedCount:
          completedCount != null && completedCount > 0
            ? completedCount
            : undefined,
      });
    },
    onSuccess: async (result) => {
      trackEvent('challenge_created', {
        challenge_id: result.match.id,
        experiment_id: assignmentQuery.data?.experimentId,
        experiment_variant: assignmentQuery.data?.variantKey,
        parent_challenge_id: matchId,
        user_challenge_id: userChallengeId,
        challenge_goal: completedCount,
        practice,
      });
      trackEvent('challenge_share_sheet_opened', {
        challenge_id: result.match.id,
        practice,
      });

      await shareMatchLink({
        url: result.invite.url,
        hostScore: completedCount ?? result.match.yourScore,
        metricLabel: 'push-ups',
      });

      router.replace(`/matches/${result.match.id}`);
    },
    onError: () => {
      setActionError('Could not create that challenge. Try again.');
    },
  });

  async function handleChallengeFriend() {
    setActionError(null);
    setChallengeBusy(true);
    trackEvent('challenge_friend_clicked', {
      experiment_id: assignmentQuery.data?.experimentId,
      experiment_variant: assignmentQuery.data?.variantKey,
      match_id: matchId,
      user_challenge_id: userChallengeId,
      practice,
    });

    try {
      await challengeFriend.mutateAsync();
    } finally {
      setChallengeBusy(false);
    }
  }

  async function handleDone() {
    const me = meQuery.data;
    const session = await getSessionData();
    if (
      me &&
      hasDeferredOnboarding({
        emailVerified: isEmailVerified(session),
        name: me.name,
        countryCode: me.countryCode,
        categoryCount: me.categories.length,
      })
    ) {
      const href = await resolvePostAuthHref();
      if (href && href !== '/(tabs)' && !href.startsWith('/match/')) {
        router.replace(href);
        return;
      }
    }

    if (isMatch && matchId) {
      router.replace(`/matches/${matchId}`);
      return;
    }

    router.replace('/(tabs)/challenges');
  }

  const cardKicker = isMatch
    ? MATCH_LOGGED_KICKER[matchMetric]
    : practice
      ? 'Extra set'
      : 'Challenge complete';
  const streakDays =
    isMatch || practice
      ? (meQuery.data?.currentStreakDays ?? currentStreakDays)
      : currentStreakDays;
  const showMembershipLink =
    assignmentReady && !hasMembership && !isMatch && !practice && !isTreatment;
  const repsCountedByCamera =
    matchMetric === 'pushups' && completedCount != null && completedCount > 0;
  const actionPrompt = isTreatment
    ? 'Think a friend can beat you?'
    : 'Post it to your story or send it to a friend.';
  const doneLabel = isTreatment || !assignmentReady
    ? 'Not now'
    : isMatch
      ? 'Back to group'
      : "See what's next";

  function openMembership() {
    markMembershipCtaShownThisSession();
    router.push({
      pathname: '/membership',
      params: { source: 'success' },
    });
  }

  if (wasPenalized) {
    return (
      <SafeAreaView style={styles.container} testID="challenge-success-screen">
        <PenaltySummary
          currentStreakDays={currentStreakDays}
          penaltyApplied={penaltyApplied}
          title={title}
        />
        <View style={styles.actions}>
          <FormButton
            label={doneLabel}
            onPress={() => {
              void handleDone();
            }}
            testID="challenge-success-done"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="challenge-success-screen">
      <View style={styles.body}>
        <FittedShareCard>
          <View style={styles.sharePreview}>
            <View collapsable={false} ref={shareShotRef} style={styles.shareShot}>
              <ChallengeShareCard
                completedCount={completedCount}
                currentStreakDays={streakDays}
                kicker={cardKicker}
                photoHeight={pendingShare?.photoHeight}
                photoUri={pendingShare?.photoUri}
                photoWidth={pendingShare?.photoWidth}
                pointsAwarded={pointsAwarded}
                targetCount={targetCount}
                title={title}
                verified={repsCountedByCamera}
              />
            </View>
          </View>
        </FittedShareCard>
      </View>

      <View style={styles.actions}>
        {actionError ? <FormErrorBanner message={actionError} /> : null}

        {assignmentReady ? (
          <Text style={styles.actionPrompt}>{actionPrompt}</Text>
        ) : null}

        {!assignmentReady ? (
          <View style={styles.assigningRow} testID="challenge-success-assigning">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {assignmentReady && isTreatment ? (
          <View style={styles.primaryRow}>
            <View style={styles.primaryFill}>
              <FormButton
                label="Challenge a friend"
                loading={challengeBusy}
                onPress={() => {
                  void handleChallengeFriend();
                }}
                testID="challenge-success-challenge-friend"
              />
            </View>
            <ShareIconButton
              busy={shareBusy}
              onPress={() => {
                void shareBrandedPhoto();
              }}
            />
          </View>
        ) : null}

        {assignmentReady && !isTreatment ? (
          <FormButton
            label="Share"
            loading={shareBusy}
            onPress={() => {
              void shareBrandedPhoto();
            }}
            testID="challenge-success-share"
            trailingIcon="share"
          />
        ) : null}

        <View
          style={[
            styles.quietRow,
            showMembershipLink ? styles.quietRowSplit : null,
          ]}
        >
          {showMembershipLink ? (
            <QuietAction
              label="Unlock membership"
              onPress={openMembership}
              testID="challenge-success-membership"
            />
          ) : null}
          <QuietAction
            label={doneLabel}
            onPress={() => {
              void handleDone();
            }}
            testID="challenge-success-done"
          />
        </View>
      </View>
    </SafeAreaView>
  );
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
  return (
    <View style={[styles.body, styles.penaltyBody]}>
      <View style={styles.badgeOuter}>
        <View style={styles.badgeInner}>
          <Feather color={colors.onAccent} name="alert-circle" size={36} />
        </View>
      </View>
      <Text style={styles.penaltyKicker}>Photo check missed</Text>
      <Text style={styles.penaltyTitle}>{title}</Text>
      <Text style={styles.penaltySubtitle}>
        {penaltyApplied} points were deducted. Tomorrow is a fresh start.
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

/** Secondary to the primary beside it: tonal, square to its height, icon only. */
function ShareIconButton({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Share result"
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      hitSlop={spacing.xs}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shareIconButton,
        pressed ? styles.shareIconButtonPressed : null,
      ]}
      testID="challenge-success-share"
    >
      {busy ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <Feather
          color={colors.accent}
          name={Platform.OS === 'android' ? 'share-2' : 'share'}
          size={20}
        />
      )}
    </Pressable>
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
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quietAction,
        pressed ? styles.quietActionPressed : null,
      ]}
      testID={testID}
    >
      <Text style={styles.quietActionLabel}>{label}</Text>
    </Pressable>
  );
}

function FittedShareCard({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const fittedWidth =
    box.width > 0 && box.height > 0
      ? Math.min(box.width, box.height * SHARE_CARD_ASPECT_RATIO)
      : 0;

  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox({ width, height });
      }}
      style={styles.fitHost}
    >
      <View
        style={
          fittedWidth > 0
            ? {
                width: fittedWidth,
                height: fittedWidth / SHARE_CARD_ASPECT_RATIO,
              }
            : styles.fitFallback
        }
      >
        {children}
      </View>
    </View>
  );
}

const SHARE_ICON_BUTTON_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    minHeight: 0,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  actionPrompt: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  assigningRow: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryFill: {
    flex: 1,
  },
  shareIconButton: {
    width: SHARE_ICON_BUTTON_SIZE,
    height: SHARE_ICON_BUTTON_SIZE,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentContainer,
  },
  shareIconButtonPressed: {
    backgroundColor: colors.accentContainerPressed,
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
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  fitHost: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitFallback: {
    width: '100%',
  },
  /**
   * Rounded and outlined only in-app so the card reads as an image to send.
   * The capture ref sits inside, so exports stay square and borderless.
   */
  sharePreview: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  shareShot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  penaltyBody: {
    justifyContent: 'center',
    gap: spacing.sm,
  },
  badgeOuter: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  penaltyKicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  penaltyTitle: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  penaltySubtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
  },
  statLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
});
