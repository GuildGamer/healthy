import type {
  ChallengeCompletionKind,
  ChallengeTarget,
  TodayChallenge,
  TodayOccurrenceDetail,
} from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import { challengeProgress } from '@/components/challenges/challenge-progress';
import { waterGlassCount, waterGlassGoal } from '@/components/challenges/water-glasses';
import { TODAY_COPY } from './constants/today-copy';
import { lastReadingLabel } from './today-labels';
import type { DeckMeasure, DeckProof } from './types/today-deck';

type DeckChallenge = Pick<
  TodayChallenge,
  'category' | 'completionKind' | 'capture' | 'status' | 'progress' | 'draft'
>;

/** Readings have no number to chase, so their card never shows a numeral. */
const READING_KINDS = new Set<ChallengeCompletionKind>(['vitals_bp', 'glucose', 'peak_flow']);

const LOG_VERB: Partial<Record<ChallengeCompletionKind, string>> = {
  vitals_bp: 'Log reading',
  glucose: 'Log reading',
  peak_flow: 'Log reading',
  water: 'Add a glass',
  carbs: 'Log meal',
  evidence_photo: 'Add photo',
  check_in: 'Mark as done',
};

const LOG_PROOF: Partial<Record<ChallengeCompletionKind, string>> = {
  vitals_bp: 'You enter the reading',
  glucose: 'You enter the reading',
  peak_flow: 'You enter the reading',
  water: 'You log it, a glass at a time',
  carbs: 'You note it down',
};

/** Water is counted on the card itself, a glass per tap. */
export function isCountedOnCard(
  challenge: Pick<DeckChallenge, 'completionKind' | 'status'>,
): boolean {
  return (
    challenge.completionKind === 'water' &&
    challenge.status !== 'completed' &&
    challenge.status !== 'awaiting_evidence'
  );
}

/** Marked done with one tap on the card, with no screen of its own. */
export function isDoneOnCard(
  challenge: Pick<DeckChallenge, 'completionKind' | 'status' | 'capture'>,
): boolean {
  return (
    challenge.completionKind === 'check_in' &&
    challenge.capture.kind === 'self_report' &&
    (challenge.status === 'pending' || challenge.status === 'in_progress')
  );
}

function isDeviceCapture(challenge: DeckChallenge): boolean {
  return challenge.capture.kind === 'device_session' || challenge.capture.kind === 'device_sample';
}

function isPhotoChallenge(challenge: DeckChallenge): boolean {
  return challenge.completionKind === 'evidence_photo' || challenge.capture.kind === 'photo';
}

function isSleepChallenge(challenge: DeckChallenge): boolean {
  return challenge.capture.kind === 'structured_log' && challenge.capture.metric === 'sleep';
}

/** How the card is proved: Healthy's honest edge, so it gets its own line. */
export function deckCardProof(challenge: DeckChallenge): DeckProof {
  if (challenge.capture.metric && isPoseMetric(challenge.capture.metric)) {
    return {
      glyph: 'camera',
      line:
        challenge.capture.metric === 'plank'
          ? 'Timed by your camera'
          : 'Counted by your camera',
    };
  }

  if (isDeviceCapture(challenge)) {
    return { glyph: 'phone', line: 'Measured by your phone' };
  }

  if (isPhotoChallenge(challenge)) {
    return { glyph: 'camera', line: 'Checked from your photo' };
  }

  if (isSleepChallenge(challenge)) {
    return { glyph: 'pencil', line: 'You enter your times' };
  }

  const logProof = LOG_PROOF[challenge.completionKind];
  if (logProof) {
    return { glyph: 'pencil', line: logProof };
  }

  return { glyph: 'hand', line: 'You confirm it' };
}

/** The next action itself, never a generic "Open". */
export function deckCardVerb(challenge: DeckChallenge): string {
  if (challenge.status === 'awaiting_evidence') {
    return 'Add photo';
  }

  if (isCountedOnCard(challenge)) {
    return LOG_VERB.water ?? 'Add a glass';
  }

  if (challenge.status === 'in_progress') {
    return 'Resume';
  }

  if (challenge.capture.metric && isPoseMetric(challenge.capture.metric)) {
    return challenge.capture.metric === 'plank' ? 'Start hold' : 'Start set';
  }

  if (isDeviceCapture(challenge)) {
    return challenge.capture.metric === 'walk' ? 'Start a walk' : 'Start';
  }

  if (isSleepChallenge(challenge)) {
    return 'Log sleep';
  }

  return LOG_VERB[challenge.completionKind] ?? 'Mark as done';
}

function countUnit(metric: DeckChallenge['capture']['metric']): string {
  if (metric && isPoseMetric(metric)) {
    return metric === 'plank' ? 'seconds' : 'reps';
  }

  return metric === 'steps' ? 'steps' : '';
}

function targetMeasure(
  target: ChallengeTarget,
  metric: DeckChallenge['capture']['metric'],
): { total: number; unit: string } | null {
  if (target.durationMinutes !== null) {
    return { total: target.durationMinutes, unit: 'min' };
  }

  if (target.count !== null) {
    return { total: target.count, unit: countUnit(metric) };
  }

  return null;
}

/** What the server knows about the card beyond the occurrence, once it has landed. */
export type DeckMeasureContext = {
  detail: TodayOccurrenceDetail | null;
  todayKey: string;
  /** Steps this phone has counted today. Null until the pedometer answers. */
  phoneSteps?: number | null;
};

const WITHOUT_DETAIL: DeckMeasureContext = { detail: null, todayKey: '' };

function readingMeasure(challenge: DeckChallenge, context: DeckMeasureContext): DeckMeasure {
  const progress = challengeProgress(challenge.status, challenge.progress);
  if (progress.kind === 'step') {
    return { kind: 'status', line: `${progress.step} of ${progress.total} entered`, note: null };
  }

  const lastDayKey = context.detail?.lastCompletedDayKey ?? null;
  return {
    kind: 'status',
    line: TODAY_COPY.notYetToday,
    note: lastDayKey ? lastReadingLabel(lastDayKey, context.todayKey) : null,
  };
}

/** Done fills the target. Short of that, the best saved session, or the steps already on this phone. */
function measuredSoFar(
  challenge: DeckChallenge,
  total: number,
  context: DeckMeasureContext,
): number {
  if (challenge.status === 'completed') {
    return total;
  }

  const saved = context.detail?.bestMeasuredInPeriod ?? 0;
  const onPhone = challenge.capture.metric === 'steps' ? (context.phoneSteps ?? 0) : 0;
  return Math.min(Math.max(saved, onPhone), total);
}

/** What stands in the middle of the card: a numeral, a sentence, a photo slot, or a ring. */
export function deckCardMeasure(
  challenge: DeckChallenge,
  context: DeckMeasureContext = WITHOUT_DETAIL,
): DeckMeasure {
  if (challenge.status === 'awaiting_evidence') {
    return { kind: 'photo', line: TODAY_COPY.photoCheckWaiting };
  }

  if (isPhotoChallenge(challenge)) {
    return { kind: 'photo', line: TODAY_COPY.photoNeeded };
  }

  if (READING_KINDS.has(challenge.completionKind)) {
    return readingMeasure(challenge, context);
  }

  if (challenge.completionKind === 'water') {
    const glasses = waterGlassCount(challenge);
    const goal = waterGlassGoal(challenge);
    return { kind: 'count', value: glasses, total: goal, unit: 'glasses', fill: glasses / goal };
  }

  const target = targetMeasure(challenge.capture.target, challenge.capture.metric);
  if (target) {
    const value = measuredSoFar(challenge, target.total, context);
    return {
      kind: 'count',
      value,
      total: target.total,
      unit: target.unit,
      fill: value / target.total,
    };
  }

  if (challenge.completionKind === 'check_in') {
    return { kind: 'checkRing' };
  }

  return { kind: 'status', line: TODAY_COPY.notYetToday, note: null };
}
