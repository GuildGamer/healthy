import { Redirect } from 'expo-router';
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

/** Picks the sheet for a log: the blood-pressure pair, one number, or the water count. */
export function ChallengeLogScreen({ challengeId }: { challengeId: string }) {
  const { occurrence, isPending } = useTodayOccurrence(challengeId);

  if (isPending) {
    return null;
  }

  if (!occurrence) {
    return <ClosedReadingSheet message={NOT_ON_TODAY} testID="log-reading-missing" />;
  }

  if (occurrence.status === 'completed') {
    return <ClosedReadingSheet message={ALREADY_LOGGED} testID="log-reading-done" />;
  }

  if (occurrence.status === 'awaiting_evidence') {
    return <Redirect href={`/challenge/${challengeId}/verify`} />;
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

  if (occurrence.completionKind === 'check_in') {
    return <Redirect href={`/challenge/${challengeId}/confirm`} />;
  }

  return <Redirect href={`/challenge/${challengeId}/evidence`} />;
}
