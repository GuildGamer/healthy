import type {
  ChallengeCaptureKind,
  ChallengeCompletionKind,
  TodayChallenge,
  UserChallengeStatus,
} from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import { completionRoute } from './completion-route';

type ActChallenge = Pick<
  TodayChallenge,
  'id' | 'challengeId' | 'completionKind' | 'capture' | 'status'
>;

const LOG_VERB: Partial<Record<ChallengeCompletionKind, string>> = {
  vitals_bp: 'Log reading',
  glucose: 'Log reading',
  peak_flow: 'Log reading',
  water: 'Add a glass',
  carbs: 'Log meal',
  evidence_photo: 'Add photo',
  check_in: 'Mark as done',
};

/** Water is counted on the card itself, a glass per tap. */
export function isCountedOnCard(
  challenge: Pick<ActChallenge, 'completionKind' | 'status'>,
): boolean {
  return (
    challenge.completionKind === 'water' &&
    challenge.status !== 'completed' &&
    challenge.status !== 'awaiting_evidence'
  );
}

/** Marked done with one tap, with no screen of its own. */
export function isDoneOnCard(
  challenge: Pick<ActChallenge, 'completionKind' | 'status' | 'capture'>,
): boolean {
  return (
    challenge.completionKind === 'check_in' &&
    challenge.capture.kind === 'self_report' &&
    (challenge.status === 'pending' || challenge.status === 'in_progress')
  );
}

function isDeviceCapture(capture: { kind: ChallengeCaptureKind }): boolean {
  return capture.kind === 'device_session' || capture.kind === 'device_sample';
}

function isSleepCapture(capture: { kind: ChallengeCaptureKind; metric?: string | null }): boolean {
  return capture.kind === 'structured_log' && capture.metric === 'sleep';
}

/** The next action itself, never a generic "Open". */
export function deckCardVerb(
  challenge: Pick<ActChallenge, 'completionKind' | 'capture' | 'status'>,
): string {
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

  if (isDeviceCapture(challenge.capture)) {
    return challenge.capture.metric === 'walk' ? 'Start a walk' : 'Start';
  }

  if (isSleepCapture(challenge.capture)) {
    return 'Log sleep';
  }

  return LOG_VERB[challenge.completionKind] ?? 'Mark as done';
}

export type ChallengeActKind =
  | { kind: 'addGlass' }
  | { kind: 'markDone' }
  | { kind: 'route'; route: NonNullable<ReturnType<typeof completionRoute>> }
  | { kind: 'advance' }
  | { kind: 'none' };

/**
 * Which gesture the card and the detail page share for this occurrence.
 * A completed occurrence has no primary act here (pose keeps Another set separately).
 */
export function resolveChallengeAct(
  challenge: Pick<
    ActChallenge,
    'challengeId' | 'completionKind' | 'capture' | 'status'
  > & { status: UserChallengeStatus },
): ChallengeActKind {
  // Practice / another set is its own control once today’s points are banked.
  if (challenge.status === 'completed') {
    return { kind: 'none' };
  }

  if (isCountedOnCard(challenge)) {
    return { kind: 'addGlass' };
  }

  if (isDoneOnCard(challenge)) {
    return { kind: 'markDone' };
  }

  const route = completionRoute(challenge);
  if (route) {
    return { kind: 'route', route };
  }

  return { kind: 'advance' };
}

/** Open for today's act: still to do, underway, or waiting on a photo. */
export function isOpenOccurrence(status: UserChallengeStatus): boolean {
  return status === 'pending' || status === 'in_progress' || status === 'awaiting_evidence';
}
