import type { MatchMetric, TodayChallenge } from '@product/client';
import { isPoseMetric, MATCH_METRIC_MEASURE } from '@product/contract/match-board';
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
import { trackEvent } from '@/lib/track-event';
import { finishAndLeave } from './finish-challenge';
import { partialSetSession, setSessionId } from './partial-session';
import { setEndDecision } from './set-end-decision';
import type { PoseSessionProps } from './types/pose-session';
import type { ProofClipStatus } from './types/proof-clip-recording';
import { refreshAfterCompletion } from './useCompleteChallenge';
import { usePoseSessionCounter } from './usePoseSessionCounter';
import { useProofClipRecording } from './useProofClipRecording';
import { useSavePartialSession } from './useSavePartialSession';
import { useTodayOccurrence } from './useTodayOccurrence';

export type { PoseSessionProps } from './types/pose-session';
export type PoseSessionPhase = 'setup' | 'counting' | 'review';

export type QuickPoseCameraProps = {
  sdkKey: string;
  metric: MatchMetric;
  onUpdate: (update: QuickPoseExerciseUpdate) => void;
  proofRecording?: ProofRecordingConfig | null;
  proofCount?: number;
  finishProofToken?: number;
  finishProofEndAtMs?: number;
  onProofRecorded?: (event: {
    fileUri: string;
    sha256: string;
    byteSize: number;
    durationSeconds: number;
    posterUri?: string;
  }) => void;
  onProofRecordingError?: (message: string) => void;
};

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
  proofFailedRef: { current: boolean },
  proofAudienceRef: { current: string | null },
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
          ...(proofClipIdRef.current ? { proofClipId: proofClipIdRef.current } : {}),
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
      const proofParams = {
        ...(proofClipIdRef.current ? { proofClipId: proofClipIdRef.current } : {}),
        ...(proofFailedRef.current && !proofClipIdRef.current ? { proofFailed: '1' } : {}),
        ...(proofAudienceRef.current ? { proofAudience: proofAudienceRef.current } : {}),
      };

      if (submitted.mode === 'match' && props.mode === 'match') {
        void queryClient.invalidateQueries({ queryKey: ['matches'] });
        router.replace({
          pathname: '/challenge/success',
          params: {
            title: MATCH_METRIC_LABEL[submitted.metric],
            count: String(submitted.reps),
            matchId: props.matchId,
            ...proofParams,
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

        if (proofClipIdRef.current || proofFailedRef.current) {
          router.replace({
            pathname: '/challenge/success',
            params: {
              title: occurrence?.title ?? MATCH_METRIC_LABEL[metric],
              count: String(submitted.reps),
              challengeId: props.mode === 'practice' ? props.challengeId : undefined,
              practice: '1',
              face: 'reps',
              ...proofParams,
            },
          });
          return;
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

      if (proofClipIdRef.current || proofFailedRef.current) {
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
            face: 'reps',
            ...proofParams,
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
 * first rep is seen; stopping on or past the goal saves straight away — after
 * any proof clip has finished writing.
 */
export function usePoseSession(props: PoseSessionProps) {
  const isMatch = props.mode === 'match';
  const isUnscored = props.mode !== 'challenge';
  const { occurrence, isPending } = useTodayOccurrence(isMatch ? undefined : props.challengeId);
  const matchId = props.mode === 'match' ? props.matchId : null;
  const matchQuery = useQuery({
    queryKey: ['matches', 'detail', matchId],
    queryFn: () => apiClient.getMatch({ matchId: matchId! }),
    enabled: Boolean(matchId),
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
  const phaseRef = useRef<PoseSessionPhase>('setup');
  const startedAtRef = useRef<string | null>(null);
  const autoStartLockRef = useRef(false);
  const countRef = useRef(0);
  countRef.current = snapshot.count;
  const lastRepAtRef = useRef<number | null>(null);
  const lastSeenCountRef = useRef(0);
  const [finishCountdown, setFinishCountdown] = useState<number | null>(null);
  const keepGoingRef = useRef(false);

  const proof = useProofClipRecording(
    {
      props,
      metric,
      userChallengeId: occurrence?.id ?? null,
      matchId,
      isReady: isMatch ? matchQuery.isSuccess : !isPending,
    },
    () => countRef.current,
  );
  const proofFailedRef = useRef(false);
  proofFailedRef.current = proof.proofFailed;
  const proofAudienceRef = useRef<string | null>(null);
  proofAudienceRef.current = proof.audience;

  const submitSet = useSubmitSet(
    props,
    occurrence,
    metric,
    proof.clipIdRef,
    proofFailedRef,
    proofAudienceRef,
  );
  const { savePartial } = useSavePartialSession();
  const target = isUnscored ? 0 : (occurrence?.capture.target.count ?? 0);
  const meetsTarget = isUnscored ? snapshot.count > 0 : target > 0 && snapshot.count >= target;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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

  /**
   * Counting shows on the first rep. Starting the occurrence and the proof
   * clip run behind it: saving retries the start, and the clip catches up.
   */
  const beginCounting = useCallback(
    (options?: { preserveCounter?: boolean }) => {
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
      startedAtRef.current = new Date().toISOString();
      // Remounting the camera mid-rep drops landmarks — only reset on manual start.
      if (!preserveCounter) {
        setCameraSessionKey((current) => current + 1);
      }

      phaseRef.current = 'counting';
      start({ preserveCounter });
      setPhase('counting');
      proof.armForCounting();
      startOccurrence.mutate();
    },
    [camera.isReady, occurrence, proof, props.mode, start, startOccurrence],
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
    beginCounting({ preserveCounter: true });
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
      const proofClipId = proof.clipIdRef.current;
      savePartial(proofClipId ? { ...partial, proofClipId } : partial);
    }
  }

  async function stopCounting() {
    setFinishCountdown(null);
    stop();
    proof.requestFinish({ lastRepAtMs: lastRepAtRef.current });
    setPhase('review');

    await proof.waitUntilSettled();

    if (meetsTarget) {
      save();
      return;
    }

    keepShortSet();
  }

  const stopCountingRef = useRef(stopCounting);
  stopCountingRef.current = stopCounting;

  useEffect(() => {
    if (phase !== 'counting') {
      lastRepAtRef.current = null;
      lastSeenCountRef.current = 0;
      setFinishCountdown(null);
      return;
    }

    if (snapshot.count > lastSeenCountRef.current) {
      lastRepAtRef.current = Date.now();
      lastSeenCountRef.current = snapshot.count;
      keepGoingRef.current = false;
      setFinishCountdown(null);
    }
  }, [phase, snapshot.count]);

  useEffect(() => {
    if (phase !== 'counting' || MATCH_METRIC_MEASURE[metric] === 'seconds') {
      return;
    }

    const timer = setInterval(() => {
      if (keepGoingRef.current) {
        lastRepAtRef.current = Date.now();
        keepGoingRef.current = false;
        setFinishCountdown(null);
        return;
      }

      const decision = setEndDecision({
        count: countRef.current,
        lastRepAtMs: lastRepAtRef.current,
        nowMs: Date.now(),
        bodyInFrame: snapshot.bodyInFrame,
      });

      if (decision.kind === 'none') {
        setFinishCountdown(null);
        return;
      }
      if (decision.kind === 'countdown') {
        setFinishCountdown(decision.seconds);
        return;
      }
      void stopCountingRef.current();
    }, 250);

    return () => clearInterval(timer);
  }, [metric, phase, snapshot.bodyInFrame]);

  function keepGoing() {
    keepGoingRef.current = true;
    lastRepAtRef.current = Date.now();
    setFinishCountdown(null);
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
    recordProof: proof.recordProof,
    showProofExplainer: proof.showProofExplainer,
    proofRecording: proof.proofRecording,
    proofClipId: proof.proofClipId,
    proofStatus: proof.status as ProofClipStatus,
    proofFailed: proof.proofFailed,
    proofAudience: proof.audience,
    showAudienceSheet: proof.showAudienceSheet,
    openAudienceSheet: proof.openAudienceSheet,
    closeAudienceSheet: proof.closeAudienceSheet,
    setProofAudience: proof.setAudience,
    confirmAudienceSheet: proof.confirmAudienceSheet,
    proofCount: snapshot.count,
    finishProofToken: proof.finishProofToken,
    finishProofEndAtMs: proof.finishProofEndAtMs,
    toggleRecordProof: proof.toggleRecordProof,
    handleProofRecorded: proof.handleProofRecorded,
    handleProofRecordingError: proof.handleProofRecordingError,
    finishCountdown,
    startNow: () => beginCounting(),
    retry: () => beginCounting(),
    stopCounting: () => void stopCounting(),
    keepGoing,
    save,
    leave: () => {
      stop();
      void proof.discardReservation().finally(() => {
        goBackOrHome(props.mode === 'match' ? `/matches/${props.matchId}` : '/(tabs)');
      });
    },
  };
}

export type PoseSession = ReturnType<typeof usePoseSession>;
