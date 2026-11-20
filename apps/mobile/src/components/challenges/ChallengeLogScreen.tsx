import type { TodayChallenge } from '@product/client';
import type { Href } from 'expo-router';
import { useReplaceRoute } from '@/lib/use-replace-route';
import { BloodPressureSheet } from './BloodPressureSheet';
import { isSleepCapture } from './completion-route';
import { NOT_ON_TODAY } from './constants/doing-copy';
import { ClosedReadingSheet } from './ReadingSheetLayout';
import { isSingleReadingKind } from './single-reading';
import { SingleReadingSheet } from './SingleReadingSheet';
import { SleepSheet } from './SleepSheet';
import { useTodayOccurrence } from './useTodayOccurrence';
import { WaterSheet } from './WaterSheet';

const ALREADY_LOGGED = 'This one is already logged today.';

/**
 * When the log route is the wrong surface for this occurrence, replace to the
 * right one so Back does not land on a gate that immediately forwards again.
 */
function logGateHref(challengeId: string, occurrence: TodayChallenge): Href | null {
  if (occurrence.status === 'awaiting_evidence') {
    return `/challenge/${challengeId}/verify`;
  }

  if (
    !isSleepCapture(occurrence.capture) &&
    occurrence.completionKind !== 'vitals_bp' &&
    occurrence.completionKind !== 'water' &&
    !isSingleReadingKind(occurrence.completionKind)
  ) {
    if (occurrence.completionKind === 'check_in') {
      return `/challenge/${challengeId}/confirm`;
    }

    return `/challenge/${challengeId}/evidence`;
  }

  return null;
}

/** Picks the sheet for a log: the blood-pressure pair, one number, or the water count. */
export function ChallengeLogScreen({ challengeId }: { challengeId: string }) {
  const { occurrence, isPending } = useTodayOccurrence(challengeId);
  const gateHref =
    !isPending && occurrence && occurrence.status !== 'completed'
      ? logGateHref(challengeId, occurrence)
      : null;

  useReplaceRoute(gateHref);

  if (isPending) {
    return null;
  }

  if (!occurrence) {
    return <ClosedReadingSheet message={NOT_ON_TODAY} testID="log-reading-missing" />;
  }

  if (occurrence.status === 'completed') {
    return <ClosedReadingSheet message={ALREADY_LOGGED} testID="log-reading-done" />;
  }

  if (gateHref) {
    return null;
  }

  if (isSleepCapture(occurrence.capture)) {
    return <SleepSheet occurrence={occurrence} />;
  }

  if (occurrence.completionKind === 'vitals_bp') {
    return <BloodPressureSheet occurrence={occurrence} />;
  }

  if (occurrence.completionKind === 'water') {
    return <WaterSheet occurrence={occurrence} />;
  }

  if (isSingleReadingKind(occurrence.completionKind)) {
    return <SingleReadingSheet kind={occurrence.completionKind} occurrence={occurrence} />;
  }

  return null;
}
