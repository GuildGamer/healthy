import type { CatalogChallenge, ChallengeCompletionKind } from '@product/client';
import { isPoseMetric } from '@product/contract/match-board';
import type { GlyphName } from '@/components/icons';

export type ChallengeProof = {
  glyph: GlyphName;
  /** On a catalogue row: "Counted by camera". */
  short: string;
  /** On a preview: "Your camera counts them." */
  sentence: string;
  /** After "Measured by" in settings: "Your camera". */
  by: string;
};

const CAMERA: ChallengeProof = {
  glyph: 'camera',
  short: 'Counted by camera',
  sentence: 'Your camera counts them.',
  by: 'Your camera',
};
const PHONE: ChallengeProof = {
  glyph: 'phone',
  short: 'Measured by your phone',
  sentence: 'Your phone measures it.',
  by: 'Your phone',
};
const PHOTO: ChallengeProof = {
  glyph: 'camera',
  short: 'Checked from a photo',
  sentence: 'One photo finishes it.',
  by: 'A photo',
};
const LOG: ChallengeProof = {
  glyph: 'pencil',
  short: 'You log it',
  sentence: 'You log it yourself.',
  by: 'What you log',
};
const CONFIRM: ChallengeProof = {
  glyph: 'hand',
  short: 'You confirm it',
  sentence: 'You tap to confirm it.',
  by: 'You confirm it',
};

const LOGGED_KINDS = new Set<ChallengeCompletionKind>([
  'vitals_bp',
  'glucose',
  'peak_flow',
  'water',
  'carbs',
]);

const SLEEP_TIMES: ChallengeProof = {
  glyph: 'pencil',
  short: 'You enter your times',
  sentence: 'You enter your bedtime and wake time.',
  by: 'What you log',
};

/** How a challenge is proved, said the way the catalogue and settings say it. */
export function challengeProof(
  challenge: Pick<CatalogChallenge, 'completionKind' | 'capture'>,
): ChallengeProof {
  const { kind, metric } = challenge.capture;
  if (metric && isPoseMetric(metric)) {
    return CAMERA;
  }

  if (kind === 'device_session' || kind === 'device_sample') {
    return PHONE;
  }

  if (challenge.completionKind === 'evidence_photo' || kind === 'photo') {
    return PHOTO;
  }

  if (kind === 'structured_log' && metric === 'sleep') {
    return SLEEP_TIMES;
  }

  return LOGGED_KINDS.has(challenge.completionKind) ? LOG : CONFIRM;
}
