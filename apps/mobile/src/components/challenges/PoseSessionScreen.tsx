import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { PoseDebugOverlay } from '@/components/challenges/PoseDebugOverlay';
import { PoseLandmarkOverlay } from '@/components/challenges/PoseLandmarkOverlay';
import {
  POSE_MOVE_CLOSER,
  POSE_MOVE_INTO_FRAME,
  POSE_TOO_CLOSE,
  POSE_SETUP_HUD_READY,
  POSE_SETUP_INSTRUCTION,
  POSE_TRACKING,
  POSE_TRACKING_WEAK,
} from '@/components/challenges/pose-session-copy';
import {
  usePoseSessionCounter,
  type PoseDriveMode,
} from '@/components/challenges/usePoseSessionCounter';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';
import type { PoseFrame } from '@/lib/pose/landmarks';

const SUBMIT_FAILED_MESSAGE = 'We could not mark that as done. Try again.';

type SessionPhase = 'setup' | 'counting' | 'review';

type PoseVisionCameraProps = {
  processing: boolean;
  sessionKey?: number;
  onPoseFrame: (frame: PoseFrame) => void;
  onModelStateChange?: (ready: boolean, detail: string) => void;
};

export function PoseSessionScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const startedAtRef = useRef<string | null>(null);
  const autoStartLockRef = useRef(false);
  const {
    snapshot,
    elapsedSeconds,
    driveMode,
    start,
    stop,
    ingestFrame,
  } = usePoseSessionCounter();

  const [phase, setPhase] = useState<SessionPhase>('setup');
  const [modelReady, setModelReady] = useState(false);
  const [modelDetail, setModelDetail] = useState('Checking pose camera…');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });
  const [overlayFrame, setOverlayFrame] = useState<PoseFrame | null>(null);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const phaseRef = useRef<SessionPhase>('setup');
  const driveModeRef = useRef<PoseDriveMode>('live');
  const [VisionCamera, setVisionCamera] = useState<
    ComponentType<PoseVisionCameraProps> | null
  >(null);

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  useEffect(() => {
    let cancelled = false;

    void import('@/components/challenges/PoseVisionCamera')
      .then((module) => {
        if (!cancelled) {
          setVisionCamera(() => module.PoseVisionCamera);
          setModelDetail('Loading pose model…');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModelReady(false);
          setModelDetail(
            'Pose camera needs a native rebuild — use guided motion for now',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onModelStateChange = useCallback((ready: boolean, detail: string) => {
    setModelReady(ready);
    setModelDetail(detail);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    driveModeRef.current = driveMode;
  }, [driveMode]);

  const handlePoseFrame = useCallback(
    (frame: PoseFrame) => {
      setOverlayFrame(frame);

      const watchingSetup = phaseRef.current === 'setup';
      const countingLive = phaseRef.current === 'counting';
      if (
        driveModeRef.current === 'live' &&
        (watchingSetup || countingLive)
      ) {
        ingestFrame(frame);
      }
    },
    [ingestFrame],
  );

  const startOccurrence = useMutation({
    mutationFn: async () => {
      if (!occurrence || occurrence.status !== 'pending') {
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
    onSuccess: async (result) => {
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
        },
      });
    },
  });

  const beginCounting = useCallback(
    async (
      mode: PoseDriveMode,
      options?: { preserveCounter?: boolean },
    ) => {
      if (!occurrence) {
        return;
      }

      setSessionError(null);

      if (mode === 'live' && !modelReady) {
        setSessionError(
          'Pose model is not ready yet. Wait a moment, or use guided motion.',
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
        setOverlayFrame(null);
        setCameraSessionKey((current) => current + 1);
      }

      driveModeRef.current = mode;
      phaseRef.current = 'counting';
      start(mode, { preserveCounter });
      setPhase('counting');
    },
    [modelReady, occurrence, start, startOccurrence],
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
    void beginCounting('live', { preserveCounter: true }).catch(() => {
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

    router.replace('/(tabs)/challenges');
  }

  function onCameraLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setCameraSize({ width, height });
  }

  function poseStatusLabel(): string {
    if (phase === 'setup') {
      if (modelReady && snapshot.tooClose) {
        return POSE_TOO_CLOSE;
      }
      return modelReady ? POSE_SETUP_HUD_READY : modelDetail;
    }

    if (snapshot.tooClose) {
      return POSE_TOO_CLOSE;
    }

    if (snapshot.movementTooSmall) {
      return POSE_MOVE_CLOSER;
    }

    if (snapshot.visibilityRatio < 0.25) {
      return POSE_TRACKING_WEAK;
    }

    if (calibrated && snapshot.bodyInFrame) {
      return driveMode === 'live' ? POSE_TRACKING : 'Guided tracking';
    }

    return POSE_MOVE_INTO_FRAME;
  }

  if (todayQuery.isLoading || !occurrence) {
    return <ScreenLoader />;
  }

  const target = occurrence.capture.target.count ?? 0;
  const count = snapshot.count;
  const meetsTarget = count >= target && target > 0;
  const calibrated =
    snapshot.bodyInFrame || snapshot.visibilityRatio >= 0.5;
  const showLiveCamera =
    VisionCamera != null && (driveMode === 'live' || phase === 'setup');
  const liveProcessing =
    driveMode === 'live' && (phase === 'setup' || phase === 'counting');
  const landmarkFrame = snapshot.debugFrame ?? overlayFrame;

  return (
    <View style={styles.screen} testID="pose-session-screen">
      <View
        style={styles.cameraStage}
        testID="pose-camera"
        onLayout={onCameraLayout}
      >
        {showLiveCamera && VisionCamera ? (
          <VisionCamera
            processing={liveProcessing}
            sessionKey={cameraSessionKey}
            onModelStateChange={onModelStateChange}
            onPoseFrame={handlePoseFrame}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.cameraFallbackText}>
              {phase === 'counting' && driveMode === 'guided'
                ? 'Guided landmark motion driving the counter'
                : modelDetail}
            </Text>
          </View>
        )}

        <PoseLandmarkOverlay
          frame={landmarkFrame}
          height={cameraSize.height}
          width={cameraSize.width}
        />

        <PoseDebugOverlay snapshot={snapshot} />

        {!snapshot.calibrating &&
        (phase === 'counting' || snapshot.phase === 'down') ? (
          <View
            pointerEvents="none"
            style={[styles.depthTrack, { top: insets.top + spacing.sm }]}
            testID="pose-depth-track"
          >
            <View
              style={[
                styles.depthFill,
                { width: `${Math.round(snapshot.downness * 100)}%` },
              ]}
            />
          </View>
        ) : null}

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
            <Text style={styles.title}>{occurrence.title}</Text>
          </View>
          {phase === 'setup' ? (
            <Text style={styles.instruction}>{POSE_SETUP_INSTRUCTION}</Text>
          ) : null}
        </View>

        <View
          pointerEvents="none"
          style={[styles.hud, { bottom: spacing.md }]}
        >
          <Text style={styles.count} testID="pose-count">
            {count}
            <Text style={styles.countTarget}> / {target}</Text>
          </Text>
          <Text style={styles.hudMeta} testID="pose-status">
            {poseStatusLabel()}
          </Text>
        </View>
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
          <>
            <FormButton
              label="Start counting"
              loading={startOccurrence.isPending}
              onPress={() => void beginCounting('live')}
              testID="start-pose"
            />
            <FormButton
              label="Guided motion (no camera AI)"
              onPress={() => void beginCounting('guided')}
              testID="start-pose-guided"
              variant="secondary"
            />
          </>
        ) : null}

        {phase === 'counting' ? (
          <FormButton label="Stop" onPress={stopCounting} testID="stop-pose" />
        ) : null}

        {phase === 'review' ? (
          <View style={styles.reviewCard} testID="pose-review">
            <Text style={styles.reviewTitle}>
              {meetsTarget ? 'Target reached' : 'Short of the target'}
            </Text>
            <Text style={styles.reviewBody}>
              {count} push-ups in {elapsedSeconds}s
              {driveMode === 'guided'
                ? ' · guided landmarks'
                : ' · on-device pose'}
            </Text>
          </View>
        ) : null}

        {phase === 'review' && meetsTarget ? (
          <FormButton
            label="Submit"
            loading={complete.isPending}
            onPress={() => complete.mutate(count)}
            testID="submit-pose"
          />
        ) : null}

        {phase === 'review' && !meetsTarget ? (
          <FormButton
            label="Try again"
            onPress={() => void beginCounting(driveMode)}
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
  hud: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'transparent',
  },
  depthTrack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  depthFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  count: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 56,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countTarget: {
    color: colors.muted,
    fontSize: 28,
    fontWeight: fontWeight.semibold,
  },
  hudMeta: {
    color: colors.muted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
