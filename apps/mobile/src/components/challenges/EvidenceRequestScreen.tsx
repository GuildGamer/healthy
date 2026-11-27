import type { SurpriseEvidenceRequest, TodayChallenge } from '@product/client';
import { useRef } from 'react';
import {
  DeckButton,
  DeckRingShutter,
  DeckSheet,
  DeckSheetEyebrow,
  DeckSheetMessage,
  DeckSheetSub,
  DeckSheetTitle,
} from '@/components/deck';
import { goBackOrHome } from '@/lib/go-back';
import { PHOTO_CHECK_COPY } from './constants/doing-copy';
import { isReadingCheck, photoCheckTitle } from './photo-check';
import { PhotoCheckPreview, PhotoCheckResult, PhotoCheckTime } from './PhotoCheckParts';
import { ClosedReadingSheet } from './ReadingSheetLayout';
import { useChallengeTone } from './useChallengeTone';
import { type PhotoCheckFlow, usePhotoCheck } from './usePhotoCheck';
import { useTodayOccurrence } from './useTodayOccurrence';

function isOpenCheck(occurrence: TodayChallenge | undefined): occurrence is TodayChallenge {
  return occurrence?.status === 'awaiting_evidence' && occurrence.evidenceRequest !== null;
}

/**
 * The surprise photo check, as a sheet over Today with the camera already
 * live. The check is held once open, so its outcome stays on screen after the
 * list behind it has moved on.
 */
export function EvidenceRequestScreen({ challengeId }: { challengeId: string }) {
  const { occurrence, isPending } = useTodayOccurrence(challengeId);
  const heldCheck = useRef<TodayChallenge | null>(null);

  if (!heldCheck.current && isOpenCheck(occurrence)) {
    heldCheck.current = occurrence;
  }

  const check = heldCheck.current;

  if (check?.evidenceRequest) {
    return <PhotoCheckSheet occurrence={check} request={check.evidenceRequest} />;
  }

  if (isPending) {
    return null;
  }

  return <ClosedReadingSheet message={PHOTO_CHECK_COPY.closed} testID="evidence-request-closed" />;
}

function PhotoCheckSheet({
  occurrence,
  request,
}: {
  occurrence: TodayChallenge;
  request: SurpriseEvidenceRequest;
}) {
  const { tone } = useChallengeTone(occurrence);
  const flow = usePhotoCheck(occurrence, request);
  const canDismiss = flow.phase.kind === 'asking' || flow.phase.kind === 'rejected';
  const showsSavedCorner = isReadingCheck(occurrence) && flow.phase.kind !== 'expired';

  return (
    <DeckSheet
      onDismiss={canDismiss ? () => goBackOrHome() : undefined}
      testID="evidence-request-screen"
    >
      <DeckSheetEyebrow
        corner={showsSavedCorner ? PHOTO_CHECK_COPY.readingSaved : null}
        glyph="camera"
        label={PHOTO_CHECK_COPY.eyebrow}
        tone={tone}
      />
      <PhotoCheckBody
        flow={flow}
        occurrence={occurrence}
        penaltyPoints={request.penaltyPoints}
        tone={tone}
      />
    </DeckSheet>
  );
}

interface PhotoCheckBodyProps {
  flow: PhotoCheckFlow;
  occurrence: TodayChallenge;
  penaltyPoints: number;
  tone: string;
}

function PhotoCheckBody({ flow, occurrence, penaltyPoints, tone }: PhotoCheckBodyProps) {
  const { phase } = flow;

  if (phase.kind === 'expired') {
    return (
      <PhotoCheckResult
        actionLabel={PHOTO_CHECK_COPY.ok}
        factLabel={PHOTO_CHECK_COPY.penaltyFact}
        glyph="clock"
        isBusy={flow.isSkipping}
        onAction={flow.leaveAfterExpiry}
        penaltyPoints={penaltyPoints}
        sub={PHOTO_CHECK_COPY.expiredSub}
        title={PHOTO_CHECK_COPY.expiredTitle}
      />
    );
  }

  if (phase.kind === 'rejected') {
    const isMonitor = occurrence.completionKind === 'vitals_bp';
    return (
      <PhotoCheckResult
        actionLabel={PHOTO_CHECK_COPY.takeAnother}
        factLabel={PHOTO_CHECK_COPY.penaltyIfMissed}
        glyph="eyeOff"
        isBusy={false}
        onAction={flow.retake}
        penaltyPoints={penaltyPoints}
        sub={PHOTO_CHECK_COPY.rejectedSub}
        title={
          isMonitor ? PHOTO_CHECK_COPY.rejectedMonitorTitle : PHOTO_CHECK_COPY.rejectedActTitle
        }
      />
    );
  }

  if (phase.kind === 'checking') {
    return (
      <>
        <DeckSheetTitle>{PHOTO_CHECK_COPY.checkingTitle}</DeckSheetTitle>
        <DeckSheetSub>{PHOTO_CHECK_COPY.checkingSub}</DeckSheetSub>
        <PhotoCheckPreview cameraRef={flow.cameraRef} shotUri={phase.photo.previewUri} />
      </>
    );
  }

  return (
    <>
      <DeckSheetTitle>{photoCheckTitle(occurrence)}</DeckSheetTitle>
      <DeckSheetSub>{PHOTO_CHECK_COPY.why}</DeckSheetSub>
      <PhotoCheckPreview cameraRef={flow.cameraRef} shotUri={null} />
      {flow.message ? <DeckSheetMessage message={flow.message} /> : null}
      <DeckRingShutter
        disabled={flow.isBusy}
        onPress={flow.shoot}
        remaining={flow.clock.fraction}
        testID="evidence-request-camera"
        tone={tone}
      />
      <PhotoCheckTime secondsLeft={flow.clock.secondsLeft} />
      <DeckButton
        label={`Skip this one · −${penaltyPoints} points`}
        loading={flow.isSkipping}
        onPress={flow.skip}
        testID="evidence-request-skip"
        variant="quiet"
      />
    </>
  );
}
