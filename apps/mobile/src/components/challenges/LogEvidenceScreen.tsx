import type { CompleteChallengeOutput, TodayChallenge } from '@product/client';
import { router } from 'expo-router';
import { useState } from 'react';
import { announceChallengeFinish } from '@/lib/challenge-finish-session';
import type { CapturedSelfie } from '@/lib/capture-selfie';
import { goBackOrHome } from '@/lib/go-back';
import { setPendingSharePhoto } from '@/lib/share-card-session';
import { CaptureCameraScreen } from './CaptureCameraScreen';
import { GYM_COPY, NOT_ON_TODAY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { ClosedReadingSheet } from './ReadingSheetLayout';
import { isOfflineError, saveFailedMessage } from './save-error';
import { sharePosterParams } from './share-poster';
import { posterForSuccess } from './success-poster';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useTodayOccurrence } from './useTodayOccurrence';

/**
 * Accepted selfie opens the share screen. A surprise photo check still goes to
 * verify. Either way Today hears the finish, so the card is turned over when
 * Share closes.
 */
function openGymShare(occurrence: TodayChallenge, result: CompleteChallengeOutput): void {
  if (result.evidenceRequest) {
    finishAndLeave(result, { kind: 'photo' });
    return;
  }

  announceChallengeFinish({
    challenge: result.challenge,
    outcome: { kind: 'photo' },
    pointsAwarded: result.pointsAwarded,
    penaltyApplied: result.penaltyApplied,
    currentStreakDays: result.currentStreakDays,
  });
  router.replace({
    pathname: '/challenge/share',
    params: {
      ...sharePosterParams(posterForSuccess({ title: GYM_COPY.shareLabel, face: 'gym' })),
      userChallengeId: occurrence.id,
    },
  });
}

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
        onSuccess: (result) => {
          setPendingSharePhoto({ userChallengeId: occurrence.id, photoUri: photo.previewUri });
          openGymShare(occurrence, result);
        },
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
      onRetake={() => setCheckError(null)}
      onUse={submitPhoto}
      pill={{ glyph: 'gym', label: GYM_COPY.pill }}
    />
  );
}
