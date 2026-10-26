import type { MatchMetric } from '@product/client';
import { PROOF_CLIP_MAX_DURATION_SECONDS } from '@product/contract/proof-clip-limits';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProofRecordingConfig } from 'quickpose-camera';
import { MATCH_METRIC_LABEL } from '@/components/matches/match-metric';
import { apiClient } from '@/lib/api';
import {
  getProofRecordingEnabled,
  hasSeenProofExplainer,
  markProofExplainerSeen,
  setProofRecordingEnabled,
} from '@/lib/proof-clip-preference';
import {
  markLocalProofClipServerRecorded,
  saveLocalProofClip,
} from '@/lib/proof-clip-store';
import type { PoseSessionProps } from './types/pose-session';
import type {
  ProofClipContext,
  ProofClipOutcome,
  ProofClipRecording,
  ProofClipStatus,
  ProofRecordedEvent,
} from './types/proof-clip-recording';

const SETTLE_TIMEOUT_MS = 10_000;

type SettleWaiter = {
  resolve: (outcome: ProofClipOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
};

function reserveContext(props: PoseSessionProps, userChallengeId: string | null) {
  if (props.mode === 'match') {
    return { kind: 'match' as const, matchId: props.matchId };
  }
  if (props.mode === 'practice') {
    return { kind: 'practice' as const, challengeId: props.challengeId };
  }
  return { kind: 'challenge' as const, userChallengeId: userChallengeId! };
}

/**
 * Owns the proof-clip lifecycle for one pose set: arm → record → finalise →
 * save locally (then tell the server). Navigation waits on `waitUntilSettled`.
 */
export function useProofClipRecording(
  context: ProofClipContext,
  getRepCount: () => number,
): ProofClipRecording {
  const [status, setStatus] = useState<ProofClipStatus>('off');
  const [recordProof, setRecordProof] = useState(false);
  const [showProofExplainer, setShowProofExplainer] = useState(false);
  const [proofRecording, setProofRecording] = useState<ProofRecordingConfig | null>(null);
  const [proofClipId, setProofClipId] = useState<string | null>(null);
  const [finishProofToken, setFinishProofToken] = useState(0);
  const [proofFailed, setProofFailed] = useState(false);

  const statusRef = useRef<ProofClipStatus>('off');
  const clipIdRef = useRef<string | null>(null);
  const metaRef = useRef<{ code: string; displayCode: string } | null>(null);
  const waiterRef = useRef<SettleWaiter | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;

  useEffect(() => {
    void getProofRecordingEnabled().then((enabled) => {
      setRecordProof(enabled);
      statusRef.current = enabled ? 'armed' : 'off';
      setStatus(enabled ? 'armed' : 'off');
    });
    void hasSeenProofExplainer().then((seen) => setShowProofExplainer(!seen));
  }, []);

  const clearWaiter = useCallback((outcome: ProofClipOutcome) => {
    const waiter = waiterRef.current;
    if (!waiter) {
      return;
    }
    clearTimeout(waiter.timer);
    waiterRef.current = null;
    waiter.resolve(outcome);
  }, []);

  const setStatusSync = useCallback((next: ProofClipStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const toggleRecordProof = useCallback(
    (enabled: boolean) => {
      setRecordProof(enabled);
      void setProofRecordingEnabled(enabled);
      if (enabled) {
        void markProofExplainerSeen();
        setShowProofExplainer(false);
        if (statusRef.current === 'off') {
          setStatusSync('armed');
        }
        return;
      }

      if (statusRef.current === 'armed' || statusRef.current === 'off') {
        setStatusSync('off');
      }
    },
    [setStatusSync],
  );

  const armForCounting = useCallback(async () => {
    setProofFailed(false);
    setProofClipId(null);

    if (!recordProof) {
      clipIdRef.current = null;
      metaRef.current = null;
      setProofRecording(null);
      setStatusSync('off');
      return;
    }

    const { props, metric, userChallengeId } = contextRef.current;
    if (props.mode === 'challenge' && !userChallengeId) {
      throw new Error('This challenge is not on today’s list.');
    }

    const reserved = await apiClient.reserveProofClip({
      context: reserveContext(props, userChallengeId),
      metric,
    });
    clipIdRef.current = reserved.clipId;
    metaRef.current = { code: reserved.code, displayCode: reserved.displayCode };
    setProofRecording({
      code: reserved.displayCode,
      label: MATCH_METRIC_LABEL[metric as MatchMetric],
      maxDurationSeconds: PROOF_CLIP_MAX_DURATION_SECONDS,
    });
    setStatusSync('recording');
  }, [recordProof, setStatusSync]);

  const requestFinish = useCallback(() => {
    if (statusRef.current !== 'recording' || !clipIdRef.current) {
      return;
    }
    setStatusSync('finalizing');
    setFinishProofToken((token) => token + 1);
  }, [setStatusSync]);

  const waitUntilSettled = useCallback((): Promise<ProofClipOutcome> => {
    const current = statusRef.current;
    if (current === 'saved') {
      return Promise.resolve('saved');
    }
    if (current === 'failed') {
      return Promise.resolve('failed');
    }
    if (current === 'discarded') {
      return Promise.resolve('discarded');
    }
    if (current === 'off' || current === 'armed') {
      return Promise.resolve('off');
    }
    if (current !== 'finalizing' && current !== 'recording') {
      return Promise.resolve('off');
    }

    if (current === 'recording') {
      setStatusSync('finalizing');
      setFinishProofToken((token) => token + 1);
    }

    return new Promise((resolve) => {
      if (waiterRef.current) {
        clearTimeout(waiterRef.current.timer);
      }
      const timer = setTimeout(() => {
        waiterRef.current = null;
        statusRef.current = 'failed';
        setStatus('failed');
        setProofFailed(true);
        setProofRecording(null);
        resolve('failed');
      }, SETTLE_TIMEOUT_MS);
      waiterRef.current = { resolve, timer };
    });
  }, [setStatusSync]);

  const handleProofRecorded = useCallback(
    async (event: ProofRecordedEvent) => {
      const clipId = clipIdRef.current;
      const meta = metaRef.current;
      const { props, userChallengeId, matchId } = contextRef.current;

      if (!clipId || !meta) {
        setStatusSync('failed');
        setProofFailed(true);
        setProofRecording(null);
        clearWaiter('failed');
        return;
      }

      try {
        const count = getRepCount();
        await saveLocalProofClip({
          clipId,
          fileUri: event.fileUri,
          posterUri: event.posterUri ?? null,
          sha256: event.sha256,
          byteSize: event.byteSize,
          durationSeconds: event.durationSeconds,
          count,
          code: meta.code,
          displayCode: meta.displayCode,
          recordedAt: new Date().toISOString(),
          userChallengeId: props.mode === 'challenge' ? userChallengeId : null,
          matchId: props.mode === 'match' ? matchId : null,
          serverRecorded: false,
        });
        setProofClipId(clipId);
        setStatusSync('saved');
        setProofRecording(null);
        clearWaiter('saved');

        try {
          await apiClient.recordProofClip({
            clipId,
            sha256: event.sha256,
            byteSize: event.byteSize,
            durationSeconds: event.durationSeconds,
            count,
          });
          await markLocalProofClipServerRecorded(clipId);
        } catch {
          // Local clip is already saved; upload will retry recordProofClip.
        }
      } catch {
        setStatusSync('failed');
        setProofFailed(true);
        setProofRecording(null);
        clearWaiter('failed');
      }
    },
    [clearWaiter, getRepCount, setStatusSync],
  );

  const handleProofRecordingError = useCallback(
    (_message: string) => {
      setStatusSync('failed');
      setProofFailed(true);
      setProofRecording(null);
      clearWaiter('failed');
    },
    [clearWaiter, setStatusSync],
  );

  const discardReservation = useCallback(async () => {
    const clipId = clipIdRef.current;
    const wasRecording =
      statusRef.current === 'recording' || statusRef.current === 'finalizing';

    if (waiterRef.current) {
      clearTimeout(waiterRef.current.timer);
      waiterRef.current.resolve('discarded');
      waiterRef.current = null;
    }

    setProofRecording(null);
    setStatusSync(recordProof ? 'armed' : 'off');
    clipIdRef.current = null;
    metaRef.current = null;

    if (wasRecording && clipId) {
      try {
        await apiClient.removeProofClip({ clipId });
      } catch {
        // Leaving still wins if the server call fails.
      }
    }
  }, [recordProof, setStatusSync]);

  return {
    status,
    recordProof,
    showProofExplainer,
    proofRecording,
    proofClipId,
    finishProofToken,
    proofFailed,
    toggleRecordProof,
    armForCounting,
    requestFinish,
    waitUntilSettled,
    handleProofRecorded,
    handleProofRecordingError,
    discardReservation,
    clipIdRef,
  };
}
