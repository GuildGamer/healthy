import type { TodayChallenge } from '@product/client';
import { activityMeetsTarget, type DeviceActivity } from '@product/contract/challenge-capture';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { listTodayDeviceSamples, type DeviceSample } from '@/lib/device-health';
import { pathDistanceMeters } from '@/lib/geo-session';
import { goBackOrHome } from '@/lib/go-back';
import { playGoalReachedHaptic } from '@/lib/haptics';
import { setPendingShareRoute } from '@/lib/share-card-session';
import { bankedWalkFromBestMeasured } from './banked-walk-from-detail';
import { finishAndLeave } from './finish-challenge';
import { partialWalkSession, walkSessionId } from './partial-session';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useSavePartialSession } from './useSavePartialSession';
import { useWalkRecorder, type WalkRecording } from './useWalkRecorder';
import { WALK_LOCATION_DENIED } from './walk-session-copy';
import { walkShortfall, type WalkProgress } from './walk-session-progress';

/** What the walk screen is showing. */
export type WalkView = 'locationOff' | 'ready' | 'recording' | 'paused' | 'short';

function activityFrom(occurrence: TodayChallenge, walk: WalkRecording): DeviceActivity {
  return {
    source: 'in_app_gps',
    metric: occurrence.capture.metric ?? 'walk',
    durationSeconds: walk.durationSeconds,
    distanceMeters: walk.distanceMeters,
    startedAt: walk.startedAt,
    endedAt: walk.endedAt,
    // Stable across resumes, so a retried submit stays the same walk.
    externalId: walkSessionId(occurrence, walk.startedAt),
  };
}

function useTodaySamples(occurrence: TodayChallenge): DeviceSample[] {
  const [samples, setSamples] = useState<DeviceSample[]>([]);
  const metric = occurrence.capture.metric;

  useEffect(() => {
    if (!metric) {
      return;
    }

    let isCancelled = false;
    void listTodayDeviceSamples(metric).then((found) => {
      if (!isCancelled) {
        setSamples(found);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [metric]);

  return samples;
}

function useStartOccurrence(occurrence: TodayChallenge) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
  });
}

function useGoalBuzz(isGoalMet: boolean, isRecording: boolean): void {
  const didBuzz = useRef(false);

  useEffect(() => {
    if (!isGoalMet || !isRecording || didBuzz.current) {
      return;
    }

    didBuzz.current = true;
    void playGoalReachedHaptic();
  }, [isGoalMet, isRecording]);
}

/**
 * A recorded walk, from ready to saved. Pausing banks what is walked so far;
 * finishing short of the goal asks to keep walking rather than failing.
 */
export function useWalkSession(occurrence: TodayChallenge) {
  const recorder = useWalkRecorder();
  const samples = useTodaySamples(occurrence);
  const startOccurrence = useStartOccurrence(occurrence);
  const complete = useCompleteChallenge();
  const { savePartial } = useSavePartialSession();
  const [banked, setBanked] = useState<WalkRecording | null>(null);
  const [hasTriedToFinish, setHasTriedToFinish] = useState(false);
  const didRestoreRef = useRef(false);
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });
  const dayKey = todayQuery.data?.dayKey ?? '';
  const detailsQuery = useQuery({
    queryKey: ['challenges', 'today', 'details', dayKey],
    queryFn: () => apiClient.getTodayDetails(),
    enabled: todayQuery.isSuccess,
  });
  const target = occurrence.capture.target;
  const liveDistance = pathDistanceMeters(recorder.points);
  const progress: WalkProgress = {
    elapsedSeconds: recorder.elapsedSeconds,
    distanceMeters:
      recorder.phase === 'recording' || liveDistance > 0
        ? liveDistance
        : (banked?.distanceMeters ?? 0),
  };
  const isGoalMet = walkShortfall(progress, target) === null;
  useGoalBuzz(isGoalMet, recorder.phase === 'recording');

  // Home already shows bestMeasuredInPeriod; put that time back on the clock
  // when the walker opens the session again after leaving.
  useEffect(() => {
    if (didRestoreRef.current || recorder.phase !== 'idle' || banked) {
      return;
    }

    const detail = detailsQuery.data?.occurrences.find(
      (item) => item.userChallengeId === occurrence.id,
    );
    const restored = bankedWalkFromBestMeasured(occurrence, detail?.bestMeasuredInPeriod);
    if (!restored) {
      return;
    }

    didRestoreRef.current = true;
    recorder.restore(restored);
    setBanked(restored);
    setHasTriedToFinish(true);
  }, [banked, detailsQuery.data, occurrence, recorder.phase, recorder.restore]);

  function submit(activity: DeviceActivity) {
    const routePoints = recorder.points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
    complete.mutate(
      { occurrence, payload: { deviceActivity: activity } },
      {
        onSuccess: (result) => {
          setPendingShareRoute({
            userChallengeId: occurrence.id,
            points: routePoints,
          });
          finishAndLeave(result, {
            kind: 'walk',
            durationSeconds: activity.durationSeconds ?? 0,
            distanceMeters: activity.distanceMeters ?? null,
          });
        },
      },
    );
  }

  /** Banks the walk so far and keeps it as progress, so nothing walked is lost. */
  function bank(): WalkRecording {
    const walk = recorder.stop();
    setBanked(walk);
    const partial = partialWalkSession(occurrence, walk);
    if (partial) {
      savePartial(partial);
    }
    return walk;
  }

  function finish() {
    const walk = recorder.phase === 'recording' ? recorder.stop() : banked;
    if (!walk) {
      return;
    }

    setBanked(walk);
    const activity = activityFrom(occurrence, walk);
    if (activityMeetsTarget(activity, target)) {
      submit(activity);
      return;
    }

    const partial = partialWalkSession(occurrence, walk);
    if (partial) {
      savePartial(partial);
    }
    setHasTriedToFinish(true);
  }

  return {
    view: walkView(recorder.phase, recorder.error, hasTriedToFinish),
    recorder,
    progress,
    isGoalMet,
    foundSample: samples.find((sample) => activityMeetsTarget(sample, target)) ?? null,
    isStarting: startOccurrence.isPending,
    isSaving: complete.isPending,
    saveFailed: complete.isError,
    start: () =>
      void recorder.start({
        resume: false,
        beforeRecording: () => startOccurrence.mutateAsync(),
        analytics: { context: 'challenge' },
      }),
    resume: () => {
      setHasTriedToFinish(false);
      void recorder.start({ resume: true, analytics: { context: 'challenge' } });
    },
    pause: () => void bank(),
    finish,
    submitSample: (sample: DeviceSample) =>
      complete.mutate(
        { occurrence, payload: { deviceActivity: sample } },
        {
          onSuccess: (result) =>
            finishAndLeave(result, {
              kind: 'walk',
              durationSeconds: sample.durationSeconds ?? 0,
              distanceMeters: sample.distanceMeters ?? null,
            }),
        },
      ),
    logByHand: () =>
      complete.mutate(
        {
          occurrence,
          payload: {
            deviceActivity: { source: 'manual', metric: occurrence.capture.metric ?? 'walk' },
          },
        },
        { onSuccess: (result) => finishAndLeave(result, { kind: 'checkedIn' }) },
      ),
    leave: () => {
      if (recorder.phase === 'recording') {
        bank();
      }
      recorder.abandon();
      goBackOrHome();
    },
  };
}

function walkView(
  phase: ReturnType<typeof useWalkRecorder>['phase'],
  error: string | null,
  hasTriedToFinish: boolean,
): WalkView {
  if (phase === 'recording') {
    return 'recording';
  }

  if (phase === 'review') {
    return hasTriedToFinish ? 'short' : 'paused';
  }

  return error === WALK_LOCATION_DENIED ? 'locationOff' : 'ready';
}

export type WalkSession = ReturnType<typeof useWalkSession>;
