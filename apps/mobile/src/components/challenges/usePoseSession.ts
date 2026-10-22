import type { TodayChallenge } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { MATCH_DEFAULT_METRIC, MATCH_METRIC_LABEL } from '@/components/matches/match-metric';
import { apiClient } from '@/lib/api';
import { announceChallengeFinish } from '@/lib/challenge-finish-session';
import { QUICKPOSE_SDK_KEY } from '@/lib/config';
import { goBackOrHome } from '@/lib/go-back';
import type { QuickPosePushupUpdate } from '@/lib/pose/quickpose-pushup';
import { trackEvent } from '@/lib/track-event';
import { finishAndLeave } from './finish-challenge';
import { partialSetSession, setSessionId } from './partial-session';
import { refreshAfterCompletion } from './useCompleteChallenge';
import { usePoseSessionCounter } from './usePoseSessionCounter';
import { useSavePartialSession } from './useSavePartialSession';
import { useTodayOccurrence } from './useTodayOccurrence';

export type PoseSessionPhase = 'setup' | 'counting' | 'review';

export type QuickPoseCameraProps = {
  sdkKey: string;
  onUpdate: (update: QuickPosePushupUpdate) => void;
};

export type PoseSessionProps =
  /** The daily occurrence: scored, streak-bearing, target-bound. */
  | { mode: 'challenge'; challengeId: string }
  /** A head-to-head set, scored on the match board. */
  | { mode: 'match'; matchId: string }
  /** A free set after the daily one is done: recorded, but worth nothing. */
  | { mode: 'practice'; challengeId: string };

const LIVE_CAMERA_NOT_READY = 'Live camera is not ready yet. Wait a moment and try again.';

function useQuickPoseCamera() {
  const [camera, setCamera] = useState<ComponentType<QuickPoseCameraProps> | null>(null);
  const [detail, setDetail] = useState('Checking pose camera…');

  useEffect(() => {
    if (!QUICKPOSE_SDK_KEY) {
      setDetail('Live counting needs a QuickPose SDK key configured for this build.');
      return;
    }

    let isCancelled = false;
    void import('@/components/challenges/QuickPosePushupCamera')
      .then((module) => {
        if (!isCancelled) {
          setCamera(() => module.QuickPosePushupCamera);
          setDetail('Camera ready');
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDetail('Pose camera needs a native rebuild with QuickPose installed.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return { QuickPoseCamera: camera, isReady: camera !== null, detail };
}

type SubmitSet = { reps: number; durationSeconds: number; startedAt: string };

function useSubmitSet(props: PoseSessionProps, occurrence: TodayChallenge | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reps, durationSeconds, startedAt }: SubmitSet) => {
      const endedAt = new Date().toISOString();

      if (props.mode === 'match') {
        return {
          mode: 'match' as const,
          reps,
          result: await apiClient.submitMatchAttempt({
            matchId: props.matchId,
            count: reps,
            durationSeconds,
            source: 'in_app_pose',
          }),
        };
      }

      if (props.mode === 'practice') {
        await apiClient.recordPracticeSession({
          metric: 'pushups',
          source: 'in_app_pose',
          count: reps,
          durationSeconds,
          startedAt,
          endedAt,
          externalId: `practice:${props.challengeId}:${startedAt}`,
        });
        return { mode: 'practice' as const, reps };
      }

      if (!occurrence) {
        throw new Error('This challenge is not on today’s list.');
      }

      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      const result = await apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        deviceActivity: {
          source: 'in_app_pose',
          metric: 'pushups',
          count: reps,
          durationSeconds,
          startedAt,
          endedAt,
          externalId: setSessionId(occurrence, startedAt),
        },
      });
      return { mode: 'challenge' as const, reps, durationSeconds, result };
    },
    onSuccess: (submitted) => {
      if (submitted.mode === 'match' && props.mode === 'match') {
        void queryClient.invalidateQueries({ queryKey: ['matches'] });
        router.replace({
          pathname: '/challenge/success',
          params: {
            title: MATCH_METRIC_LABEL[MATCH_DEFAULT_METRIC],
            count: String(submitted.reps),
            matchId: props.matchId,
          },
        });
        return;
      }

      if (submitted.mode === 'practice') {
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
        void queryClient.invalidateQueries({ queryKey: ['practice'] });
        if (occurrence) {
          announceChallengeFinish({
            challenge: occurrence,
            outcome: { kind: 'extraSet', count: submitted.reps },
            pointsAwarded: 0,
            penaltyApplied: 0,
            currentStreakDays: 0,
          });
        }
        goBackOrHome();
        return;
      }

      if (submitted.mode !== 'challenge') {
        return;
      }

      refreshAfterCompletion(queryClient);
      trackEvent('challenge_completed', {
        user_challenge_id: occurrence?.id,
        challenge_goal: submitted.reps,
        challenge_type: 'pushups',
      });
      finishAndLeave(submitted.result, {
        kind: 'reps',
        count: submitted.reps,
        durationSeconds: submitted.durationSeconds,
      });
    },
  });
}

/**
 * A camera-counted set from setup to saved. Counting starts by itself once the
 * first rep is seen; stopping on or past the goal saves straight away.
 */
export function usePoseSession(props: PoseSessionProps) {
  const isMatch = props.mode === 'match';
  const isUnscored = props.mode !== 'challenge';
  const { occurrence, isPending } = useTodayOccurrence(isMatch ? undefined : props.challengeId);
  const queryClient = useQueryClient();
  const camera = useQuickPoseCamera();
  const { snapshot, elapsedSeconds, start, stop, ingestQuickPose } = usePoseSessionCounter();
  const [phase, setPhase] = useState<PoseSessionPhase>('setup');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const phaseRef = useRef<PoseSessionPhase>('setup');
  const startedAtRef = useRef<string | null>(null);
  const autoStartLockRef = useRef(false);
  const submitSet = useSubmitSet(props, occurrence);
  const { savePartial } = useSavePartialSession();
  const target = isUnscored ? 0 : (occurrence?.capture.target.count ?? 0);
  const meetsTarget = isUnscored ? snapshot.count > 0 : target > 0 && snapshot.count >= target;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleQuickPoseUpdate = useCallback(
    (update: QuickPosePushupUpdate) => {
      if (phaseRef.current === 'setup' || phaseRef.current === 'counting') {
        ingestQuickPose(update);
      }
    },
    [ingestQuickPose],
  );

  const startOccurrence = useMutation({
    mutationFn: async () => {
      if (props.mode === 'challenge' && occurrence?.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
  });

  const beginCounting = useCallback(
    async (options?: { preserveCounter?: boolean }) => {
      if (props.mode === 'challenge' && !occurrence) {
        return;
      }

      setSessionError(null);
      if (!camera.isReady) {
        setSessionError(LIVE_CAMERA_NOT_READY);
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
    [camera.isReady, occurrence, props.mode, start, startOccurrence],
  );

  useEffect(() => {
    if (phase !== 'setup' || !camera.isReady || autoStartLockRef.current) {
      return;
    }

    const startedPushup = snapshot.bodyInFrame && (snapshot.phase === 'down' || snapshot.count > 0);
    if (!startedPushup) {
      return;
    }

    autoStartLockRef.current = true;
    void beginCounting({ preserveCounter: true }).catch(() => {
      autoStartLockRef.current = false;
    });
  }, [beginCounting, camera.isReady, phase, snapshot.bodyInFrame, snapshot.count, snapshot.phase]);

  function save() {
    submitSet.mutate({
      reps: snapshot.count,
      durationSeconds: elapsedSeconds,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
    });
  }

  /** A daily set that fell short still counts as progress on Today's card. */
  function keepShortSet() {
    if (props.mode !== 'challenge' || !occurrence) {
      return;
    }

    const partial = partialSetSession(occurrence, {
      count: snapshot.count,
      durationSeconds: elapsedSeconds,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
    });
    if (partial) {
      savePartial(partial);
    }
  }

  function stopCounting() {
    stop();
    setPhase('review');
    if (meetsTarget) {
      save();
      return;
    }

    keepShortSet();
  }

  return {
    occurrence,
    isLoading: props.mode === 'challenge' && (isPending || !occurrence),
    camera,
    cameraSessionKey,
    handleQuickPoseUpdate,
    snapshot,
    phase,
    target,
    meetsTarget,
    sessionError,
    isStarting: startOccurrence.isPending,
    isSaving: submitSet.isPending,
    saveFailed: submitSet.isError,
    startNow: () => void beginCounting(),
    retry: () => void beginCounting(),
    stopCounting,
    save,
    leave: () => {
      stop();
      goBackOrHome(props.mode === 'match' ? `/matches/${props.matchId}` : '/(tabs)');
    },
  };
}

export type PoseSession = ReturnType<typeof usePoseSession>;
