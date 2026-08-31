import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
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
  counting: boolean;
  onPoseFrame: (frame: PoseFrame) => void;
  onModelStateChange?: (ready: boolean, detail: string) => void;
};

export function PoseSessionScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const startedAtRef = useRef<string | null>(null);
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
        },
      });
    },
  });

  async function beginCounting(mode: PoseDriveMode) {
    if (!occurrence) {
      return;
    }

    setSessionError(null);

    if (mode === 'live' && !modelReady) {
      setSessionError(
        'Pose model is not ready yet. Wait a moment, or use guided motion.',
      );
      return;
    }

    await startOccurrence.mutateAsync();
    startedAtRef.current = new Date().toISOString();
    start(mode);
    setPhase('counting');
  }

  function stopCounting() {
    stop();
    setPhase('review');
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

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{occurrence.title}</Text>
      <Text style={styles.instruction}>{occurrence.instruction}</Text>

      <View style={styles.cameraWrap} testID="pose-camera">
        {showLiveCamera && VisionCamera ? (
          <VisionCamera
            counting={phase === 'counting' && driveMode === 'live'}
            onModelStateChange={onModelStateChange}
            onPoseFrame={ingestFrame}
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

        <View style={styles.hud} pointerEvents="none">
          <Text style={styles.count} testID="pose-count">
            {count}
            <Text style={styles.countTarget}> / {target}</Text>
          </Text>
          <Text style={styles.hudMeta} testID="pose-status">
            {phase === 'setup'
              ? modelReady
                ? 'Ready — get shoulders and elbows in frame'
                : modelDetail
              : calibrated
                ? snapshot.bodyInFrame
                  ? driveMode === 'live'
                    ? 'Tracking'
                    : 'Guided tracking'
                  : 'Hold position'
                : 'Move into frame'}
          </Text>
        </View>
      </View>

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
            {driveMode === 'guided' ? ' · guided landmarks' : ' · on-device pose'}
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  instruction: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  cameraWrap: {
    height: 320,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  cameraFallbackText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  hud: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: spacing.md,
    backgroundColor: 'transparent',
  },
  count: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 48,
  },
  countTarget: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: fontWeight.semibold,
  },
  hudMeta: {
    color: colors.muted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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
