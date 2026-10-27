import type { MatchMetric, ProofClipAudience } from '@product/client';
import type { ReserveProofClipInput } from '@product/contract';
import { PROOF_CLIP_MAX_DURATION_SECONDS } from '@product/contract/proof-clip-limits';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canRecordProofClips, type ProofRecordingConfig } from 'quickpose-camera';
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
import type {
  ProofClipContext,
  ProofClipOutcome,
  ProofClipRecording,
  ProofClipStatus,
  ProofRecordedEvent,
} from './types/proof-clip-recording';

const SETTLE_TIMEOUT_MS = 10_000;
/** A held code must outlive the longest set plus the record call that follows it. */
const RESERVATION_HEADROOM_MS = PROOF_CLIP_MAX_DURATION_SECONDS * 1000 + 60_000;

type SettleWaiter = {
  resolve: (outcome: ProofClipOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
};

type Reservation = Awaited<ReturnType<typeof apiClient.reserveProofClip>>;

type ReservationRequest = { key: string; input: ReserveProofClipInput };

type HeldReservation = { key: string; promise: Promise<Reservation> };

function reservationRequest(context: ProofClipContext): ReservationRequest | null {
  const { props, metric, userChallengeId } = context;
  if (props.mode === 'match') {
    return {
      key: `match:${props.matchId}:${metric}`,
      input: { context: { kind: 'match', matchId: props.matchId }, metric },
    };
  }
  if (props.mode === 'practice') {
    return {
      key: `practice:${props.challengeId}:${metric}`,
      input: { context: { kind: 'practice', challengeId: props.challengeId }, metric },
    };
  }
  if (!userChallengeId) {
    return null;
  }
  return {
    key: `challenge:${userChallengeId}:${metric}`,
    input: { context: { kind: 'challenge', userChallengeId }, metric },
  };
}

function hasHeadroom(reservation: Reservation): boolean {
  return Date.parse(reservation.reservedUntil) - Date.now() > RESERVATION_HEADROOM_MS;
}

function removeQuietly(clipId: string): void {
  void apiClient.removeProofClip({ clipId }).catch(() => undefined);
}

function releaseHeld(held: HeldReservation): void {
  void held.promise.then((reservation) => removeQuietly(reservation.clipId)).catch(() => undefined);
}

/**
 * Owns the proof-clip lifecycle for one pose set: hold a code → record →
 * finalise → save locally (then tell the server). The code is reserved while
 * the person sets up, so counting never waits on the network. Navigation waits
 * on `waitUntilSettled`.
 */
export function useProofClipRecording(
  context: ProofClipContext,
  getRepCount: () => number,
): ProofClipRecording {
  const queryClient = useQueryClient();
  const isSupported = canRecordProofClips();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const profileAudience = meQuery.data?.proofClipAudience ?? null;

  const [status, setStatus] = useState<ProofClipStatus>('off');
  const [recordProof, setRecordProof] = useState(false);
  const [showProofExplainer, setShowProofExplainer] = useState(false);
  const [proofRecording, setProofRecording] = useState<ProofRecordingConfig | null>(null);
  const [proofClipId, setProofClipId] = useState<string | null>(null);
  const [finishProofToken, setFinishProofToken] = useState(0);
  const [finishProofEndAtMs, setFinishProofEndAtMs] = useState(0);
  const [proofFailed, setProofFailed] = useState(false);
  const [audience, setAudience] = useState<ProofClipAudience>('anyone');
  const [showAudienceSheet, setShowAudienceSheet] = useState(false);
  const [audienceSheetIsDefault, setAudienceSheetIsDefault] = useState(false);

  useEffect(() => {
    if (profileAudience) {
      setAudience(profileAudience);
    }
  }, [profileAudience]);

  const statusRef = useRef<ProofClipStatus>('off');
  const clipIdRef = useRef<string | null>(null);
  const metaRef = useRef<{ code: string; displayCode: string } | null>(null);
  const waiterRef = useRef<SettleWaiter | null>(null);
  const heldRef = useRef<HeldReservation | null>(null);
  /** Bumped whenever a pending reservation stops being wanted. */
  const generationRef = useRef(0);
  const contextRef = useRef(context);
  contextRef.current = context;

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    void getProofRecordingEnabled().then((enabled) => {
      setRecordProof(enabled);
      statusRef.current = enabled ? 'armed' : 'off';
      setStatus(enabled ? 'armed' : 'off');
    });
    void hasSeenProofExplainer().then((seen) => setShowProofExplainer(!seen));
  }, [isSupported]);

  const releaseHeldReservation = useCallback(() => {
    const held = heldRef.current;
    heldRef.current = null;
    if (held) {
      releaseHeld(held);
    }
  }, []);

  const heldKey = context.isReady ? (reservationRequest(context)?.key ?? null) : null;

  useEffect(() => {
    if (status !== 'armed' || !heldKey || heldRef.current?.key === heldKey) {
      return;
    }
    const request = reservationRequest(contextRef.current);
    if (!request) {
      return;
    }

    releaseHeldReservation();
    const held: HeldReservation = {
      key: request.key,
      promise: apiClient.reserveProofClip(request.input),
    };
    heldRef.current = held;
    held.promise.catch(() => {
      if (heldRef.current === held) {
        heldRef.current = null;
      }
    });
  }, [heldKey, releaseHeldReservation, status]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      releaseHeldReservation();
    },
    [releaseHeldReservation],
  );

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

  const markFailed = useCallback(() => {
    setStatusSync('failed');
    setProofFailed(true);
    setProofRecording(null);
    clearWaiter('failed');
  }, [clearWaiter, setStatusSync]);

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
        if (profileAudience == null) {
          setAudience('anyone');
          setAudienceSheetIsDefault(true);
          setShowAudienceSheet(true);
        }
        return;
      }

      releaseHeldReservation();
      if (statusRef.current === 'armed' || statusRef.current === 'off') {
        setStatusSync('off');
      }
    },
    [profileAudience, releaseHeldReservation, setStatusSync],
  );

  const openAudienceSheet = useCallback(() => {
    setAudienceSheetIsDefault(false);
    setShowAudienceSheet(true);
  }, []);

  const closeAudienceSheet = useCallback(() => {
    setShowAudienceSheet(false);
  }, []);

  const confirmAudienceSheet = useCallback(() => {
    setShowAudienceSheet(false);
    if (!audienceSheetIsDefault) {
      return;
    }
    void apiClient
      .updateProofClipAudience({ audience })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      })
      .catch(() => undefined);
  }, [audience, audienceSheetIsDefault, queryClient]);

  /** The held code when it still matches this set and has time left; otherwise a fresh one. */
  const takeReservation = useCallback(async (): Promise<Reservation> => {
    const request = reservationRequest(contextRef.current);
    if (!request) {
      throw new Error('This challenge is not on today’s list.');
    }

    const held = heldRef.current;
    heldRef.current = null;
    if (held && held.key === request.key) {
      try {
        const reservation = await held.promise;
        if (hasHeadroom(reservation)) {
          return reservation;
        }
        removeQuietly(reservation.clipId);
      } catch {
        // The early reserve failed; try once more now.
      }
    } else if (held) {
      releaseHeld(held);
    }

    return apiClient.reserveProofClip(request.input);
  }, []);

  const armForCounting = useCallback(() => {
    setProofFailed(false);
    setProofClipId(null);
    clipIdRef.current = null;
    metaRef.current = null;
    generationRef.current += 1;
    const generation = generationRef.current;

    if (!recordProof) {
      setProofRecording(null);
      setStatusSync('off');
      return;
    }

    setStatusSync('reserving');
    const { metric } = contextRef.current;
    void takeReservation().then(
      (reservation) => {
        if (generationRef.current !== generation || statusRef.current !== 'reserving') {
          removeQuietly(reservation.clipId);
          return;
        }
        clipIdRef.current = reservation.clipId;
        metaRef.current = { code: reservation.code, displayCode: reservation.displayCode };
        setProofRecording({
          code: reservation.displayCode,
          label: MATCH_METRIC_LABEL[metric as MatchMetric],
          maxDurationSeconds: PROOF_CLIP_MAX_DURATION_SECONDS,
        });
        setStatusSync('recording');
      },
      () => {
        if (generationRef.current === generation) {
          markFailed();
        }
      },
    );
  }, [markFailed, recordProof, setStatusSync, takeReservation]);

  /** A set that ended before its code arrived has no clip to finish. */
  const abandonReserving = useCallback(() => {
    generationRef.current += 1;
    markFailed();
  }, [markFailed]);

  const requestFinish = useCallback(
    (options?: { lastRepAtMs?: number | null }) => {
      const lastRepAtMs = options?.lastRepAtMs;
      if (typeof lastRepAtMs === 'number' && Number.isFinite(lastRepAtMs)) {
        setFinishProofEndAtMs(lastRepAtMs + 1_500);
      } else {
        setFinishProofEndAtMs(0);
      }
      if (statusRef.current === 'reserving') {
        abandonReserving();
        return;
      }
      if (statusRef.current !== 'recording' || !clipIdRef.current) {
        return;
      }
      setStatusSync('finalizing');
      setFinishProofToken((token) => token + 1);
    },
    [abandonReserving, setStatusSync],
  );

  const waitUntilSettled = useCallback((): Promise<ProofClipOutcome> => {
    if (statusRef.current === 'reserving') {
      abandonReserving();
    }

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
  }, [abandonReserving, setStatusSync]);

  const handleProofRecorded = useCallback(
    async (event: ProofRecordedEvent) => {
      const clipId = clipIdRef.current;
      const meta = metaRef.current;
      const { props, userChallengeId, matchId } = contextRef.current;

      if (!clipId || !meta) {
        markFailed();
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
        markFailed();
      }
    },
    [clearWaiter, getRepCount, markFailed, setStatusSync],
  );

  const handleProofRecordingError = useCallback(
    (_message: string) => {
      markFailed();
    },
    [markFailed],
  );

  /** Leaving the session: drop the clip in flight and any code held for the next set. */
  const discardReservation = useCallback(async () => {
    const clipId = clipIdRef.current;
    const wasRecording =
      statusRef.current === 'recording' || statusRef.current === 'finalizing';

    if (waiterRef.current) {
      clearTimeout(waiterRef.current.timer);
      waiterRef.current.resolve('discarded');
      waiterRef.current = null;
    }

    generationRef.current += 1;
    releaseHeldReservation();
    setProofRecording(null);
    setStatusSync('discarded');
    clipIdRef.current = null;
    metaRef.current = null;

    if (wasRecording && clipId) {
      try {
        await apiClient.removeProofClip({ clipId });
      } catch {
        // Leaving still wins if the server call fails.
      }
    }
  }, [releaseHeldReservation, setStatusSync]);

  return {
    isSupported,
    status,
    recordProof,
    showProofExplainer,
    proofRecording,
    proofClipId,
    finishProofToken,
    finishProofEndAtMs,
    proofFailed,
    audience,
    showAudienceSheet,
    openAudienceSheet,
    closeAudienceSheet,
    setAudience,
    confirmAudienceSheet,
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
