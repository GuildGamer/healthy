import {
  activityMeetsTarget,
  isDeviceCapture,
  type DeviceActivity,
} from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConnectHealthSheet } from '@/components/health/ConnectHealthSheet';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { displayFontFamily } from '@/lib/fonts';
import {
  NATIVE_MOVEMENT_UNAVAILABLE,
  listTodayDeviceSamples,
  loadLocationModule,
  type DeviceSample,
} from '@/lib/device-health';
import {
  formatDistance,
  formatDuration,
  pathDistanceMeters,
  type GeoPoint,
} from '@/lib/geo-session';

const SUBMIT_FAILED_MESSAGE = 'We could not mark that as done. Try again.';

type SessionPhase = 'idle' | 'recording' | 'review';

export function ChallengeSessionScreen({
  challengeId,
}: {
  challengeId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const watchRef = useRef<{ remove: () => void } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pendingActivity, setPendingActivity] = useState<DeviceSample | null>(
    null,
  );
  const [samples, setSamples] = useState<DeviceSample[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
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

  async function startRecording() {
    if (!occurrence) {
      return;
    }

    setLocationError(null);
    const location = await loadLocationModule();
    if (!location) {
      setLocationError(NATIVE_MOVEMENT_UNAVAILABLE);
      return;
    }

    const permission = await location.requestForegroundPermissionsAsync();
    if (permission.status !== location.PermissionStatus.GRANTED) {
      setLocationError('Location is needed to record a walk on this phone.');
      return;
    }

    await startOccurrence.mutateAsync();
    const begun = new Date().toISOString();
    setStartedAt(begun);
    setPoints([]);
    setElapsedSeconds(0);
    setPhase('recording');

    watchRef.current = await location.watchPositionAsync(
      {
        accuracy: location.Accuracy.Balanced,
        distanceInterval: 5,
        timeInterval: 2_000,
      },
      (fix) => {
        setPoints((current) => [
          ...current,
          {
            latitude: fix.coords.latitude,
            longitude: fix.coords.longitude,
            recordedAt: fix.timestamp,
          },
        ]);
      },
    );

    tickRef.current = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1_000);
  }

  function stopRecording() {
    watchRef.current?.remove();
    watchRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (!occurrence) {
      return;
    }

    const endedAt = new Date().toISOString();
    const distanceMeters = pathDistanceMeters(points);
    const activity: DeviceSample = {
      source: 'in_app_gps',
      metric: occurrence.capture.metric ?? 'walk',
      durationSeconds: elapsedSeconds,
      distanceMeters,
      startedAt: startedAt ?? endedAt,
      endedAt,
      externalId: `in-app-gps:${occurrence.id}:${begunId(startedAt)}`,
      label: `${formatDuration(elapsedSeconds)} · ${formatDistance(distanceMeters)}`,
    };

    setPendingActivity(activity);
    setPhase('review');
  }

  if (todayQuery.isLoading || !occurrence) {
    return <ScreenLoader />;
  }

  const target = occurrence.capture.target;
  const reviewMeetsTarget = pendingActivity
    ? activityMeetsTarget(pendingActivity, target)
    : false;
  const matchingSamples = samples.filter((sample) =>
    activityMeetsTarget(sample, target),
  );
  const lastPoint = points[points.length - 1];
  const isSteps = occurrence.capture.kind === 'device_sample';

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{occurrence.title}</Text>
      <Text style={styles.instruction}>{occurrence.instruction}</Text>

      {isSteps ? (
        <StepsPanel
          current={samples[0]?.count ?? null}
          target={target.count}
        />
      ) : (
        <MapPanel lastPoint={lastPoint} phase={phase} points={points} />
      )}

      {phase === 'recording' ? (
        <Text style={styles.stats} testID="session-stats">
          {formatDuration(elapsedSeconds)}
          {points.length > 1
            ? ` · ${formatDistance(pathDistanceMeters(points))}`
            : ''}
        </Text>
      ) : null}

      {pendingActivity && phase === 'review' ? (
        <View style={styles.foundCard} testID="session-review">
          <Text style={styles.foundTitle}>
            {reviewMeetsTarget ? 'Use this session?' : 'Short of the target'}
          </Text>
          <Text style={styles.foundBody}>{pendingActivity.label}</Text>
        </View>
      ) : null}

      {matchingSamples.length > 0 && phase === 'idle' ? (
        <View style={styles.foundCard} testID="found-sample">
          <Text style={styles.foundTitle}>We found this on your phone</Text>
          <Text style={styles.foundBody}>{matchingSamples[0]?.label}</Text>
        </View>
      ) : null}

      {locationError ? <FormErrorBanner message={locationError} /> : null}
      {complete.isError ? (
        <FormErrorBanner message={SUBMIT_FAILED_MESSAGE} />
      ) : null}

      {phase === 'idle' && !isSteps ? (
        <FormButton
          label="Start walk"
          onPress={() => void startRecording()}
          testID="start-session"
        />
      ) : null}

      {phase === 'recording' ? (
        <FormButton
          label="Stop"
          onPress={stopRecording}
          testID="stop-session"
        />
      ) : null}

      {phase === 'review' && pendingActivity && reviewMeetsTarget ? (
        <FormButton
          label="Use this"
          loading={complete.isPending}
          onPress={() => complete.mutate(pendingActivity)}
          testID="use-session"
        />
      ) : null}

      {phase === 'review' && !reviewMeetsTarget && !isSteps ? (
        <FormButton
          label="Keep walking"
          onPress={() => void startRecording()}
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

      {phase !== 'recording' ? (
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

      <ConnectHealthSheet
        onClose={() => setSheetOpen(false)}
        visible={sheetOpen}
      />
    </View>
  );
}

function begunId(startedAt: string | null): string {
  return startedAt ?? new Date().toISOString();
}

function StepsPanel({
  current,
  target,
}: {
  current: number | null;
  target: number | null;
}) {
  return (
    <View style={styles.stepsCard} testID="steps-panel">
      <Text style={styles.stepsCount}>
        {current === null ? '—' : current.toLocaleString('en-GB')}
      </Text>
      <Text style={styles.stepsHint}>
        {target
          ? `of ${target.toLocaleString('en-GB')} steps today`
          : 'steps today'}
      </Text>
    </View>
  );
}

function MapPanel({
  lastPoint,
  phase,
  points,
}: {
  lastPoint: GeoPoint | undefined;
  phase: SessionPhase;
  points: GeoPoint[];
}) {
  return (
    <View style={styles.mapWrap} testID="session-map">
      <LazyWalkMap lastPoint={lastPoint} phase={phase} points={points} />
      {phase === 'idle' && points.length === 0 ? (
        <View style={styles.mapHint} pointerEvents="none">
          <Text style={styles.mapHintText}>
            Start a walk to record your route
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function LazyWalkMap({
  lastPoint,
  phase,
  points,
}: {
  lastPoint: GeoPoint | undefined;
  phase: SessionPhase;
  points: GeoPoint[];
}) {
  const [maps, setMaps] = useState<{
    MapView: typeof import('react-native-maps').default;
    Polyline: typeof import('react-native-maps').Polyline;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('react-native-maps')
      .then((module) => {
        if (!cancelled) {
          setMaps({ MapView: module.default, Polyline: module.Polyline });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaps(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!maps) {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapHintText}>
          {phase === 'recording'
            ? 'Recording your walk'
            : 'Map appears after a native rebuild'}
        </Text>
      </View>
    );
  }

  const region = lastPoint
    ? {
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 51.5074,
        longitude: -0.1278,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const { MapView, Polyline } = maps;

  return (
    <MapView
      region={region}
      showsUserLocation={phase === 'recording'}
      style={styles.map}
    >
      {points.length > 1 ? (
        <Polyline
          coordinates={points}
          strokeColor={colors.accent}
          strokeWidth={4}
        />
      ) : null}
    </MapView>
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
  mapWrap: {
    height: 240,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  mapHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHintText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  stats: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
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
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsCount: {
    color: colors.accent,
    fontFamily: displayFontFamily,
    fontSize: 40,
  },
  stepsHint: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
});
