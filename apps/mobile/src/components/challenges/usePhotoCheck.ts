import type { SurpriseEvidenceRequest, TodayChallenge } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { finishAndLeave } from './finish-challenge';
import { outcomeAfterPhotoCheck } from './photo-check';
import { isOfflineError, saveFailedMessage } from './save-error';
import type { PhotoCheckPhase } from './types/photo-check';
import { refreshAfterCompletion, useCompleteChallenge } from './useCompleteChallenge';
import { usePhotoCheckClock } from './usePhotoCheckClock';
import { useTakePhoto } from './useTakePhoto';

function useSkipPhotoCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (occurrenceId: string) =>
      apiClient.skipChallengeEvidence({ userChallengeId: occurrenceId }),
    onSuccess: () => refreshAfterCompletion(queryClient),
  });
}

/**
 * A photo check from asking to its outcome. Running out of time settles it on
 * the server straight away; a photo that fails the check leaves the window
 * open, so another can be taken while time remains.
 */
export function usePhotoCheck(occurrence: TodayChallenge, request: SurpriseEvidenceRequest) {
  const clock = usePhotoCheckClock(request);
  const cameraRef = useRef<CameraView>(null);
  const { takePhoto, isCapturing } = useTakePhoto(cameraRef);
  const [phase, setPhase] = useState<PhotoCheckPhase>({ kind: 'asking' });
  const [message, setMessage] = useState<string | null>(null);
  const complete = useCompleteChallenge();
  const skip = useSkipPhotoCheck();
  const didSettleExpiry = useRef(false);
  const outcome = outcomeAfterPhotoCheck(occurrence);

  useEffect(() => {
    if (clock.secondsLeft > 0 || phase.kind === 'checking' || didSettleExpiry.current) {
      return;
    }

    didSettleExpiry.current = true;
    setPhase({ kind: 'expired' });
    skip.mutate(occurrence.id);
  }, [clock.secondsLeft, occurrence.id, phase.kind, skip]);

  function submitPhoto(photo: Extract<PhotoCheckPhase, { kind: 'checking' }>['photo']) {
    setPhase({ kind: 'checking', photo });
    complete.mutate(
      {
        occurrence,
        payload: { evidence: { mimeType: photo.mimeType, imageBase64: photo.imageBase64 } },
      },
      {
        onSuccess: (result) => finishAndLeave(result, outcome),
        onError: (error) => {
          const isOffline = isOfflineError(error);
          setPhase(isOffline ? { kind: 'asking' } : { kind: 'rejected' });
          setMessage(isOffline ? saveFailedMessage(error) : null);
        },
      },
    );
  }

  async function shoot() {
    setMessage(null);
    const captured = await takePhoto();
    if (captured.status === 'captured') {
      submitPhoto(captured.photo);
      return;
    }

    setMessage(captured.status === 'failed' ? captured.message : null);
  }

  return {
    phase,
    clock,
    cameraRef,
    message,
    isBusy: isCapturing || complete.isPending,
    isSkipping: skip.isPending,
    shoot: () => void shoot(),
    retake: () => setPhase({ kind: 'asking' }),
    skip: () =>
      skip.mutate(occurrence.id, { onSuccess: (result) => finishAndLeave(result, outcome) }),
    leaveAfterExpiry: () => (skip.data ? finishAndLeave(skip.data, outcome) : goBackOrHome()),
  };
}

export type PhotoCheckFlow = ReturnType<typeof usePhotoCheck>;
