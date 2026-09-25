import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import {
  MATCH_DEFAULT_METRIC,
  MATCH_METRIC_LABEL,
} from '@/components/matches/match-metric';
import { QUICKPOSE_SDK_KEY } from '@/lib/config';
import type { QuickPosePushupUpdate } from '@/lib/pose/quickpose-pushup';
import {
  POSE_MOVE_CLOSER,
  POSE_MOVE_INTO_FRAME,
  POSE_PRACTICE_HINT,
  POSE_SETUP_HUD_READY,
  POSE_SETUP_INSTRUCTION,
  POSE_TRACKING,
  POSE_TRACKING_WEAK,
  PRACTICE_SESSION_TITLE,
  poseCoachBanner,
  poseReviewTitle,
} from '@/components/challenges/pose-session-copy';
import { PoseCountHud } from '@/components/challenges/PoseCountHud';
import {
  usePoseSessionCounter,
} from '@/components/challenges/usePoseSessionCounter';
import { apiClient } from '@/lib/api';

const SUBMIT_FAILED_MESSAGE = 'We could not mark that as done. Try again.';

type SessionPhase = 'setup' | 'counting' | 'review';

type QuickPoseCameraProps = {
  sdkKey: string;
  onUpdate: (update: QuickPosePushupUpdate) => void;
};

export type PoseSessionScreenProps =
  /** The daily occurrence: scored, streak-bearing, target-bound. */
  | { mode: 'challenge'; challengeId: string }
  /** A head-to-head set, scored on the match board. */
  | { mode: 'match'; matchId: string }
  /** A free set after the daily one is done: recorded, but worth nothing. */
  | { mode: 'practice'; challengeId: string };

export function PoseSessionScreen(props: PoseSessionScreenProps) {
  const isMatch = props.mode === 'match';
  const isPractice = props.mode === 'practice';
  const challengeId = isMatch ? undefined : props.challengeId;
  const matchId = isMatch ? props.matchId : undefined;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const startedAtRef = useRef<string | null>(null);
  const autoStartLockRef = useRef(false);
  const {
    snapshot,
    elapsedSeconds,
    start,
    stop,
    ingestQuickPose,
  } = usePoseSessionCounter();

  const [phase, setPhase] = useState<SessionPhase>('setup');
  const [modelReady, setModelReady] = useState(false);
  const [modelDetail, setModelDetail] = useState('Checking pose camera…');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const phaseRef = useRef<SessionPhase>('setup');
  const [QuickPoseCamera, setQuickPoseCamera] = useState<
    ComponentType<QuickPoseCameraProps> | null
  >(null);

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
    enabled: !isMatch,
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  useEffect(() => {
    if (!QUICKPOSE_SDK_KEY) {
      setModelReady(false);
      setModelDetail(
        'Live counting needs a QuickPose SDK key configured for this build.',
      );
      return;
    }

    let cancelled = false;

    void import('@/components/challenges/QuickPosePushupCamera')
      .then((module) => {
        if (!cancelled) {
          setQuickPoseCamera(() => module.QuickPosePushupCamera);
          setModelReady(true);
          setModelDetail('Camera ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModelReady(false);
          setModelDetail(
            'Pose camera needs a native rebuild with QuickPose installed.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleQuickPoseUpdate = useCallback(
    (update: QuickPosePushupUpdate) => {
      const watchingSetup = phaseRef.current === 'setup';
      const countingLive = phaseRef.current === 'counting';
      if (watchingSetup || countingLive) {
        ingestQuickPose(update);
      }
    },
    [ingestQuickPose],
  );

  const startOccurrence = useMutation({
    mutationFn: async () => {
      if (isMatch || isPractice || !occurrence) {
        return;
      }

      if (occurrence.status !== 'pending') {
        return;
      }

      await apiClient.startChallenge({ userChallengeId: occurrence.id });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] });
    },
  });

  const complete = useMutation({
    mutationFn: async (reps: number) => {
      if (isMatch && matchId) {
        return apiClient.submitMatchAttempt({
          matchId,
          count: reps,
          durationSeconds: elapsedSeconds,
          source: 'in_app_pose',
        });
      }

      if (isPractice) {
        const endedAt = new Date().toISOString();
        const startedAt = startedAtRef.current ?? endedAt;

        return apiClient.recordPracticeSession({
          metric: 'pushups',
          source: 'in_app_pose',
          count: reps,
          durationSeconds: elapsedSeconds,
          startedAt,
          endedAt,
          externalId: `practice:${challengeId ?? 'pushups'}:${startedAt}`,
        });
      }

      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      const endedAt = new Date().toISOString();
      return apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        deviceActivity: {
          source: 'in_app_pose',
          metric: 'pushups',
          count: reps,
          durationSeconds: elapsedSeconds,
          startedAt: startedAtRef.current ?? endedAt,
          endedAt,
          externalId: `in-app-pose:${occurrence.id}:${startedAtRef.current ?? endedAt}`,
        },
      });
    },
    onSuccess: async (result, reps) => {
      if (isMatch && matchId) {
        await queryClient.invalidateQueries({ queryKey: ['matches'] });
        router.replace({
          pathname: '/challenge/success',
          params: {
            title: MATCH_METRIC_LABEL[MATCH_DEFAULT_METRIC],
            count: String(reps),
            matchId,
          },
        });
        return;
      }

      if (isPractice) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['activity'] }),
          queryClient.invalidateQueries({ queryKey: ['practice'] }),
        ]);

        router.replace({
          pathname: '/challenge/success',
          params: {
            title: occurrence?.title ?? PRACTICE_SESSION_TITLE,
            count: String(reps),
            practice: '1',
          },
        });
        return;
      }

      if (!('pointsAwarded' in result)) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);

      router.replace({
        pathname: '/challenge/success',
        params: {
          title: occurrence?.title ?? 'Challenge',
          points: String(result.pointsAwarded),
          streak: String(result.currentStreakDays),
          count: String(reps),
          target: String(occurrence?.capture.target.count ?? 0),
        },
      });
    },
  });

  const beginCounting = useCallback(
    async (options?: { preserveCounter?: boolean }) => {
      if (props.mode === 'challenge' && !occurrence) {
        return;
      }

      setSessionError(null);

      if (!modelReady) {
        setSessionError(
          'Live camera is not ready yet. Wait a moment and try again.',
        );
        autoStartLockRef.current = false;
        return;
      }

      const preserveCounter = options?.preserveCounter === true;
      autoStartLockRef.current = true;

      try {
        await startOccurrence.mutateAsync();
      } catch (error) {
        autoStartLockRef.current = false;
        throw error;
      }

      startedAtRef.current = new Date().toISOString();

      // Remounting the camera mid-rep drops landmarks — only reset on manual start.
      if (!preserveCounter) {
        setCameraSessionKey((current) => current + 1);
      }

      phaseRef.current = 'counting';
      start({ preserveCounter });
      setPhase('counting');
    },
    [modelReady, occurrence, props.mode, start, startOccurrence],
  );

  useEffect(() => {
    if (phase !== 'setup' || !modelReady || autoStartLockRef.current) {
      return;
    }

    const startedPushup =
      snapshot.bodyInFrame &&
      (snapshot.phase === 'down' || snapshot.count > 0);

    if (!startedPushup) {
      return;
    }

    autoStartLockRef.current = true;
    void beginCounting({ preserveCounter: true }).catch(() => {
      autoStartLockRef.current = false;
    });
  }, [
    beginCounting,
    modelReady,
    phase,
    snapshot.bodyInFrame,
    snapshot.count,
    snapshot.phase,
  ]);

  function stopCounting() {
    stop();
    setPhase('review');
  }

  function leaveSession() {
    stop();
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(isMatch && matchId ? `/matches/${matchId}` : '/(tabs)/challenges');
  }

  const calibrated =
    snapshot.bodyInFrame || snapshot.visibilityRatio >= 0.5;
  const coachBanner =
    modelReady || phase !== 'setup' ? poseCoachBanner(snapshot) : null;

  function poseStatusLabel(): string {
    if (phase === 'setup') {
      return modelReady ? POSE_SETUP_HUD_READY : modelDetail;
    }

    if (snapshot.movementTooSmall) {
      return POSE_MOVE_CLOSER;
    }

    if (snapshot.visibilityRatio < 0.25) {
      return POSE_TRACKING_WEAK;
    }

    if (calibrated && snapshot.bodyInFrame) {
      return POSE_TRACKING;
    }

    return POSE_MOVE_INTO_FRAME;
  }

  // Practice needs no occurrence — the title is a nicety, not a gate.
  if (props.mode === 'challenge' && (todayQuery.isLoading || !occurrence)) {
    return <ScreenLoader />;
  }

  const isUnscored = isMatch || isPractice;
  const target = isUnscored ? 0 : (occurrence?.capture.target.count ?? 0);
  const count = snapshot.count;
  const meetsTarget = isUnscored ? count > 0 : count >= target && target > 0;
  const showLiveCamera =
    Boolean(QUICKPOSE_SDK_KEY) &&
    QuickPoseCamera != null &&
    (phase === 'setup' || phase === 'counting');

  return (
    <View style={styles.screen} testID="pose-session-screen">
      <View style={styles.cameraStage} testID="pose-camera">
        {showLiveCamera && QuickPoseCamera ? (
          <QuickPoseCamera
            key={cameraSessionKey}
            onUpdate={handleQuickPoseUpdate}
            sdkKey={QUICKPOSE_SDK_KEY}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.cameraFallbackText}>{modelDetail}</Text>
          </View>
        )}

        <View
          pointerEvents="box-none"
          style={[
            styles.topScrim,
            { paddingTop: insets.top + spacing.sm },
          ]}
        >
          <View pointerEvents="box-none" style={styles.titleRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={leaveSession}
              style={styles.backButton}
              testID="pose-back"
            >
              <Feather color={colors.text} name="arrow-left" size={22} />
            </Pressable>
            <Text style={styles.title}>
              {isMatch ? 'Push-ups' : isPractice ? PRACTICE_SESSION_TITLE : occurrence?.title}
            </Text>
          </View>
          {phase === 'setup' ? (
            <Text style={styles.instruction}>{POSE_SETUP_INSTRUCTION}</Text>
          ) : null}
        </View>

        {coachBanner ? (
          <View
            pointerEvents="none"
            style={styles.coachBanner}
            testID="pose-coach"
          >
            <Text style={styles.coachBannerText} testID="pose-status">
              {coachBanner}
            </Text>
          </View>
        ) : null}

        <PoseCountHud
          count={count}
          meta={coachBanner ? null : poseStatusLabel()}
          target={target}
        />
      </View>

      <View
        style={[
          styles.controls,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md),
            paddingTop: spacing.md,
          },
        ]}
      >
        {sessionError ? <FormErrorBanner message={sessionError} /> : null}
        {complete.isError ? (
          <FormErrorBanner message={SUBMIT_FAILED_MESSAGE} />
        ) : null}

        {phase === 'setup' ? (
          <FormButton
            label="Start counting"
            loading={startOccurrence.isPending}
            onPress={() => void beginCounting()}
            testID="start-pose"
          />
        ) : null}

        {phase === 'counting' ? (
          <FormButton label="Stop" onPress={stopCounting} testID="stop-pose" />
        ) : null}

        {phase === 'review' ? (
          <View style={styles.reviewCard} testID="pose-review">
            <Text style={styles.reviewTitle}>
              {poseReviewTitle({ mode: props.mode, count, meetsTarget })}
            </Text>
            <Text style={styles.reviewBody}>
              {count} push-ups in {elapsedSeconds}s · on-device pose
            </Text>
            {isPractice ? (
              <Text style={styles.reviewBody} testID="pose-practice-hint">
                {POSE_PRACTICE_HINT}
              </Text>
            ) : null}
          </View>
        ) : null}

        {phase === 'review' && meetsTarget ? (
          <FormButton
            label={isPractice ? 'Save set' : 'Submit'}
            loading={complete.isPending}
            onPress={() => complete.mutate(count)}
            testID="submit-pose"
          />
        ) : null}

        {phase === 'review' && !meetsTarget ? (
          <FormButton
            label="Try again"
            onPress={() => void beginCounting()}
            testID="retry-pose"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraStage: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  cameraFallbackText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  instruction: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  coachBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: '40%',
    alignItems: 'center',
  },
  coachBannerText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 26,
    backgroundColor: 'rgba(0,0,0,0.72)',
    overflow: 'hidden',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  controls: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  reviewBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
