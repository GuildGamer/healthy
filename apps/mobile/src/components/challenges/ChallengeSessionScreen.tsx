import Feather from '@expo/vector-icons/Feather';
import {
  activityMeetsTarget,
  isDeviceCapture,
  type ChallengeTarget,
  type DeviceActivity,
} from '@product/contract/challenge-capture';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConnectHealthSheet } from '@/components/health/ConnectHealthSheet';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { WalkRouteMap } from '@/components/challenges/WalkRouteMap';
import {
  walkStatus,
  type WalkPhase,
} from '@/components/challenges/walk-session-copy';
import {
  walkProgressRatio,
  walkReadout,
  walkSecondaryStat,
  walkShortfall,
  type WalkProgress,
} from '@/components/challenges/walk-session-progress';
import { useWalkRecorder } from '@/components/challenges/useWalkRecorder';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';
import {
  listTodayDeviceSamples,
  type DeviceSample,
} from '@/lib/device-health';
import {
  formatDistance,
  formatDuration,
  pathDistanceMeters,
} from '@/lib/geo-session';

const SUBMIT_FAILED_MESSAGE = 'We could not mark that as done. Try again.';

export function ChallengeSessionScreen({
  challengeId,
}: {
  challengeId: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const recorder = useWalkRecorder();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingActivity, setPendingActivity] = useState<DeviceSample | null>(
    null,
  );
  const [samples, setSamples] = useState<DeviceSample[]>([]);

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  useEffect(() => {
    if (meQuery.data?.healthLinkStatus === 'unknown' && occurrence) {
      setSheetOpen(isDeviceCapture(occurrence.capture.kind));
    }
  }, [meQuery.data?.healthLinkStatus, occurrence]);

  useEffect(() => {
    const metric = occurrence?.capture.metric;
    if (!metric) {
      return;
    }

    let cancelled = false;
    void listTodayDeviceSamples(metric).then((found) => {
      if (!cancelled) {
        setSamples(found);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [occurrence?.capture.metric]);

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
    mutationFn: async (activity?: DeviceActivity) => {
      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      return apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        deviceActivity: activity,
      });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        // A tracked walk scores any live walk group the member is in.
        queryClient.invalidateQueries({ queryKey: ['matches'] }),
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

  async function beginWalk({ resume }: { resume: boolean }) {
    if (!occurrence) {
      return;
    }

    setPendingActivity(null);
    await recorder.start({
      resume,
      beforeRecording: () => startOccurrence.mutateAsync(),
    });
  }

  function stopWalk() {
    const walk = recorder.stop();
    if (!occurrence) {
      return;
    }

    setPendingActivity({
      source: 'in_app_gps',
      metric: occurrence.capture.metric ?? 'walk',
      durationSeconds: walk.durationSeconds,
      distanceMeters: walk.distanceMeters,
      startedAt: walk.startedAt,
      endedAt: walk.endedAt,
      // Stable across resumes, so a retried submit stays the same walk.
      externalId: `in-app-gps:${occurrence.id}:${walk.startedAt}`,
      label: `${formatDuration(walk.durationSeconds)} · ${formatDistance(walk.distanceMeters)}`,
    });
  }

  function leaveSession() {
    recorder.abandon();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/challenges');
  }

  if (todayQuery.isLoading || !occurrence) {
    return <ScreenLoader />;
  }

  const { autoPaused, phase, points } = recorder;
  const target = occurrence.capture.target;
  const isSteps = occurrence.capture.kind === 'device_sample';
  const isRecording = phase === 'recording';
  const progress: WalkProgress = {
    elapsedSeconds: recorder.elapsedSeconds,
    distanceMeters: pathDistanceMeters(points),
  };
  const shortfall = walkShortfall(progress, target);
  const reviewMeetsTarget = pendingActivity
    ? activityMeetsTarget(pendingActivity, target)
    : false;
  const matchingSamples = samples.filter((sample) =>
    activityMeetsTarget(sample, target),
  );

  return (
    <View style={styles.screen} testID="challenge-session-screen">
      <View style={styles.stage}>
        {isSteps ? (
          <StepsStage current={samples[0]?.count ?? null} target={target} />
        ) : (
          <View style={StyleSheet.absoluteFill} testID="session-map">
            <WalkRouteMap isRecording={isRecording} points={points} />
          </View>
        )}

        <View
          pointerEvents="box-none"
          style={[styles.topScrim, { paddingTop: insets.top + spacing.sm }]}
        >
          <View pointerEvents="box-none" style={styles.titleRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={leaveSession}
              style={styles.backButton}
              testID="session-back"
            >
              <Feather color={colors.text} name="arrow-left" size={22} />
            </Pressable>
            <Text style={styles.title}>{occurrence.title}</Text>
          </View>
          {phase === 'idle' ? (
            <Text style={styles.instruction}>{occurrence.instruction}</Text>
          ) : null}
        </View>

        {isSteps ? null : (
          <WalkStatusCard
            autoPaused={autoPaused}
            phase={phase}
            progress={progress}
            shortfall={shortfall}
            target={target}
          />
        )}
      </View>

      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {matchingSamples.length > 0 && phase === 'idle' ? (
          <View style={styles.foundCard} testID="found-sample">
            <Text style={styles.foundTitle}>We found this on your phone</Text>
            <Text style={styles.foundBody}>{matchingSamples[0]?.label}</Text>
          </View>
        ) : null}

        {recorder.error ? <FormErrorBanner message={recorder.error} /> : null}
        {complete.isError ? (
          <FormErrorBanner message={SUBMIT_FAILED_MESSAGE} />
        ) : null}

        {phase === 'idle' && !isSteps ? (
          <FormButton
            label="Start walk"
            loading={startOccurrence.isPending}
            onPress={() => void beginWalk({ resume: false })}
            testID="start-session"
          />
        ) : null}

        {isRecording ? (
          <FormButton label="Stop" onPress={stopWalk} testID="stop-session" />
        ) : null}

        {phase === 'review' && pendingActivity && reviewMeetsTarget ? (
          <FormButton
            label="Log this walk"
            loading={complete.isPending}
            onPress={() => complete.mutate(pendingActivity)}
            testID="use-session"
          />
        ) : null}

        {phase === 'review' && !reviewMeetsTarget && !isSteps ? (
          <FormButton
            label="Keep walking"
            onPress={() => void beginWalk({ resume: true })}
            testID="resume-session"
          />
        ) : null}

        {matchingSamples[0] && phase === 'idle' ? (
          <FormButton
            label="Use this"
            loading={complete.isPending}
            onPress={() => complete.mutate(matchingSamples[0])}
            testID="use-sample"
          />
        ) : null}

        {!isRecording ? (
          <FormButton
            label="I did this"
            loading={complete.isPending}
            onPress={() =>
              complete.mutate({
                source: 'manual',
                metric: occurrence.capture.metric ?? 'walk',
              })
            }
            testID="confirm-challenge"
            variant="secondary"
          />
        ) : null}
      </View>

      <ConnectHealthSheet
        onClose={() => setSheetOpen(false)}
        visible={sheetOpen}
      />
    </View>
  );
}

/** Glass card floating over the route: goal, live readout, and what is left. */
function WalkStatusCard({
  autoPaused,
  phase,
  progress,
  shortfall,
  target,
}: {
  autoPaused: boolean;
  phase: WalkPhase;
  progress: WalkProgress;
  shortfall: string | null;
  target: ChallengeTarget;
}) {
  const status = walkStatus({ phase, shortfall, autoPaused });
  const ratio = walkProgressRatio(progress, target);
  const secondaryStat = walkSecondaryStat(progress, target);

  return (
    <View pointerEvents="none" style={styles.statusCard} testID="session-status">
      <View style={styles.statusHeader}>
        <Text
          style={[
            styles.statusEyebrow,
            autoPaused ? styles.statusEyebrowPaused : null,
          ]}
        >
          {status.eyebrow}
        </Text>
        {secondaryStat && phase !== 'idle' ? (
          <Text style={styles.statusSecondary} testID="session-secondary-stat">
            {secondaryStat}
          </Text>
        ) : null}
      </View>

      <Text style={styles.statusReadout} testID="session-stats">
        {walkReadout(progress, target)}
      </Text>

      {ratio === null ? null : (
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${ratio * 100}%` }]}
            testID="session-progress"
          />
        </View>
      )}

      <Text style={styles.statusMeta} testID="session-review">
        {status.meta}
      </Text>
    </View>
  );
}

function StepsStage({
  current,
  target,
}: {
  current: number | null;
  target: ChallengeTarget;
}) {
  return (
    <View style={styles.stepsStage} testID="steps-panel">
      <Text style={styles.stepsCount}>
        {current === null ? '—' : current.toLocaleString('en-GB')}
      </Text>
      <Text style={styles.stepsHint}>
        {target.count
          ? `of ${target.count.toLocaleString('en-GB')} steps today`
          : 'steps today'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stage: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(11,18,32,0.78)',
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
  statusCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(11,18,32,0.88)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusEyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusEyebrowPaused: {
    color: colors.warning,
  },
  statusSecondary: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statusReadout: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: 34,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  statusMeta: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  foundCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  foundTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  foundBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  stepsStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  stepsCount: {
    color: colors.accent,
    fontFamily: displayFontFamily,
    fontSize: 64,
  },
  stepsHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
