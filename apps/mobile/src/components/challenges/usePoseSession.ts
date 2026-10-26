import type { MatchMetric, TodayChallenge } from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { ProofRecordingConfig } from 'quickpose-camera';
import { MATCH_DEFAULT_METRIC, MATCH_METRIC_LABEL } from '@/components/matches/match-metric';
import { apiClient } from '@/lib/api';
import { announceChallengeFinish } from '@/lib/challenge-finish-session';
import { QUICKPOSE_SDK_KEY } from '@/lib/config';
import { goBackOrHome } from '@/lib/go-back';
import type { QuickPoseExerciseUpdate } from '@/lib/pose/quickpose-exercise';
import {
  getProofRecordingEnabled,
  hasSeenProofExplainer,
  markProofExplainerSeen,
  setProofRecordingEnabled,
} from '@/lib/proof-clip-preference';
import { saveLocalProofClip } from '@/lib/proof-clip-store';
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
  metric: MatchMetric;
  onUpdate: (update: QuickPoseExerciseUpdate) => void;
  proofRecording?: ProofRecordingConfig | null;
  proofCount?: number;
  finishProofToken?: number;
  onProofRecorded?: (event: {
    fileUri: string;
    sha256: string;
    byteSize: number;
    durationSeconds: number;
    posterUri?: string;
  }) => void;
  onProofRecordingError?: (message: string) => void;
};

export type PoseSessionProps =
  /** The daily occurrence: scored, streak-bearing, target-bound. */
  | { mode: 'challenge'; challengeId: string }
  /** A head-to-head set, scored on the match board. */
  | { mode: 'match'; matchId: string }
  /** A free set after the daily one is done: recorded, but worth nothing. */
  | { mode: 'practice'; challengeId: string };

const LIVE_CAMERA_NOT_READY = 'Live camera is not ready yet. Wait a moment and try again.';
const IPHONE_ONLY = 'Camera counting is iPhone only for now.';

function useQuickPoseCamera() {
  const [camera, setCamera] = useState<ComponentType<QuickPoseCameraProps> | null>(null);
  const [detail, setDetail] = useState('Checking pose camera…');

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setDetail(IPHONE_ONLY);
      return;
    }

    if (!QUICKPOSE_SDK_KEY) {
      setDetail('Live counting needs a QuickPose SDK key configured for this build.');
      return;
    }

    let isCancelled = false;
    void import('@/components/challenges/QuickPoseExerciseCamera')
      .then((module) => {
        if (!isCancelled) {
          setCamera(() => module.QuickPoseExerciseCamera);
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

function poseMetricFromCapture(metric: string | null | undefined): MatchMetric {
  if (metric && isPoseMetric(metric)) {
    return metric;
  }

  return MATCH_DEFAULT_METRIC;
}

type SubmitSet = { reps: number; durationSeconds: number; startedAt: string };

function useSubmitSet(
  props: PoseSessionProps,
  occurrence: TodayChallenge | undefined,
  metric: MatchMetric,
  proofClipIdRef: { current: string | null },
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reps, durationSeconds, startedAt }: SubmitSet) => {
      const endedAt = new Date().toISOString();

      if (props.mode === 'match') {
        return {
          mode: 'match' as const,
          reps,
          metric,
          result: await apiClient.submitMatchAttempt({
            matchId: props.matchId,
            count: reps,
            durationSeconds,
            source: 'in_app_pose',
          }),
        };
      }

      if (props.mode === 'practice') {
        const practiceMetric = poseMetricFromCapture(occurrence?.capture.metric);
        await apiClient.recordPracticeSession({
          metric: practiceMetric,
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

      const challengeMetric = poseMetricFromCapture(occurrence.capture.metric);
      const result = await apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        deviceActivity: {
          source: 'in_app_pose',
          metric: challengeMetric,
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
            title: MATCH_METRIC_LABEL[submitted.metric],
            count: String(submitted.reps),
            matchId: props.matchId,
            ...(proofClipIdRef.current ? { proofClipId: proofClipIdRef.current } : {}),
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
        challenge_type: poseMetricFromCapture(occurrence?.capture.metric),
      });

      if (proofClipIdRef.current) {
        router.replace({
          pathname: '/challenge/success',
          params: {
            title: occurrence?.title ?? MATCH_METRIC_LABEL[metric],
            count: String(submitted.reps),
            points: String(submitted.result.pointsAwarded),
            streak: String(submitted.result.currentStreakDays),
            penalty: String(submitted.result.penaltyApplied),
            userChallengeId: occurrence?.id,
            challengeId: occurrence?.challengeId,
            metric,
            proofClipId: proofClipIdRef.current,
            face: 'reps',
          },
        });
        return;
      }

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
  const matchQuery = useQuery({
    queryKey: ['matches', 'detail', isMatch ? props.matchId : null],
    queryFn: () => apiClient.getMatch({ matchId: props.matchId }),
    enabled: isMatch,
  });
  const metric: MatchMetric = isMatch
    ? (matchQuery.data?.metric ?? MATCH_DEFAULT_METRIC)
    : poseMetricFromCapture(occurrence?.capture.metric);
  const queryClient = useQueryClient();
  const camera = useQuickPoseCamera();
  const { snapshot, elapsedSeconds, start, stop, ingestQuickPose } = usePoseSessionCounter({
    metric,
  });
  const [phase, setPhase] = useState<PoseSessionPhase>('setup');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [recordProof, setRecordProof] = useState(false);
  const [showProofExplainer, setShowProofExplainer] = useState(false);
  const [proofRecording, setProofRecording] = useState<ProofRecordingConfig | null>(null);
  const [proofClipId, setProofClipId] = useState<string | null>(null);
  const [finishProofToken, setFinishProofToken] = useState(0);
  const phaseRef = useRef<PoseSessionPhase>('setup');
  const startedAtRef = useRef<string | null>(null);
  const autoStartLockRef = useRef(false);
  const proofClipIdRef = useRef<string | null>(null);
  const proofMetaRef = useRef<{ code: string; displayCode: string } | null>(null);
  const submitSet = useSubmitSet(props, occurrence, metric, proofClipIdRef);
  const { savePartial } = useSavePartialSession();
  const target = isUnscored ? 0 : (occurrence?.capture.target.count ?? 0);
  const meetsTarget = isUnscored ? snapshot.count > 0 : target > 0 && snapshot.count >= target;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    void getProofRecordingEnabled().then(setRecordProof);
    void hasSeenProofExplainer().then((seen) => setShowProofExplainer(!seen));
  }, []);

  const handleQuickPoseUpdate = useCallback(
    (update: QuickPoseExerciseUpdate) => {
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

  const toggleRecordProof = useCallback((enabled: boolean) => {
    setRecordProof(enabled);
    void setProofRecordingEnabled(enabled);
    if (enabled) {
      void markProofExplainerSeen();
      setShowProofExplainer(false);
    }
  }, []);

  const handleProofRecorded = useCallback(
    async (event: {
      fileUri: string;
      sha256: string;
      byteSize: number;
      durationSeconds: number;
      posterUri?: string;
    }) => {
      const clipId = proofClipIdRef.current;
      const meta = proofMetaRef.current;
      if (!clipId || !meta) {
        return;
      }

      try {
        await apiClient.recordProofClip({
          clipId,
          sha256: event.sha256,
          byteSize: event.byteSize,
          durationSeconds: event.durationSeconds,
          count: snapshot.count,
        });
        await saveLocalProofClip({
          clipId,
          fileUri: event.fileUri,
          posterUri: event.posterUri ?? null,
          sha256: event.sha256,
          byteSize: event.byteSize,
          durationSeconds: event.durationSeconds,
          code: meta.code,
          displayCode: meta.displayCode,
          recordedAt: new Date().toISOString(),
          userChallengeId: props.mode === 'challenge' ? occurrence?.id ?? null : null,
          matchId: props.mode === 'match' ? props.matchId : null,
        });
        setProofClipId(clipId);
      } catch {
        setSessionError('Could not save the proof clip.');
      } finally {
        setProofRecording(null);
      }
    },
    [occurrence?.id, props, snapshot.count],
  );

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

        if (recordProof) {
          const context =
            props.mode === 'match'
              ? ({ kind: 'match' as const, matchId: props.matchId })
              : props.mode === 'practice'
                ? ({ kind: 'practice' as const, challengeId: props.challengeId })
                : ({
                    kind: 'challenge' as const,
                    userChallengeId: occurrence!.id,
                  });
          const reserved = await apiClient.reserveProofClip({ context, metric });
          proofClipIdRef.current = reserved.clipId;
          proofMetaRef.current = { code: reserved.code, displayCode: reserved.displayCode };
          setProofRecording({
            code: reserved.displayCode,
            label: MATCH_METRIC_LABEL[metric],
          });
        } else {
          proofClipIdRef.current = null;
          proofMetaRef.current = null;
          setProofRecording(null);
        }
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
    [camera.isReady, metric, occurrence, props, recordProof, start, startOccurrence],
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
    if (proofRecording) {
      setFinishProofToken((token) => token + 1);
    }
    setPhase('review');
    if (meetsTarget) {
      save();
      return;
    }

    keepShortSet();
  }

  return {
    occurrence,
    metric,
    isLoading:
      (props.mode === 'challenge' && (isPending || !occurrence)) ||
      (isMatch && matchQuery.isPending),
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
    recordProof,
    showProofExplainer,
    proofRecording,
    proofClipId,
    proofCount: snapshot.count,
    finishProofToken,
    toggleRecordProof,
    handleProofRecorded,
    handleProofRecordingError: (message: string) => setSessionError(message),
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
