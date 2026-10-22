import type { TodayChallenge } from '@product/client';
import { useState } from 'react';
import type { CapturedSelfie } from '@/lib/capture-selfie';
import { goBackOrHome } from '@/lib/go-back';
import { CaptureCameraScreen } from './CaptureCameraScreen';
import { GYM_COPY, NOT_ON_TODAY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { ClosedReadingSheet } from './ReadingSheetLayout';
import { isOfflineError, saveFailedMessage } from './save-error';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useTodayOccurrence } from './useTodayOccurrence';

/** A gym challenge, finished by a selfie at the gym: the front camera opens straight away. */
export function LogEvidenceScreen({ challengeId }: { challengeId: string }) {
  const { occurrence, isPending } = useTodayOccurrence(challengeId);

  if (isPending) {
    return null;
  }

  if (!occurrence || occurrence.status === 'completed') {
    return <ClosedReadingSheet message={NOT_ON_TODAY} testID="log-evidence-missing" />;
  }

  return <GymSelfie occurrence={occurrence} />;
}

function GymSelfie({ occurrence }: { occurrence: TodayChallenge }) {
  const complete = useCompleteChallenge();
  const [checkError, setCheckError] = useState<string | null>(null);

  function submitPhoto(photo: CapturedSelfie) {
    setCheckError(null);
    complete.mutate(
      {
        occurrence,
        payload: { evidence: { mimeType: photo.mimeType, imageBase64: photo.imageBase64 } },
      },
      {
        onSuccess: (result) => finishAndLeave(result, { kind: 'photo' }),
        onError: (error) =>
          setCheckError(isOfflineError(error) ? saveFailedMessage(error) : GYM_COPY.rejected),
      },
    );
  }

  return (
    <CaptureCameraScreen
      checkError={checkError}
      facing="front"
      hint={GYM_COPY.hint}
      isChecking={complete.isPending}
      onClose={() => goBackOrHome()}
      onUse={submitPhoto}
      pill={{ glyph: 'gym', label: GYM_COPY.pill }}
    />
  );
}
