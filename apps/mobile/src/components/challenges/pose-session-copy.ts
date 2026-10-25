export const POSE_TOO_CLOSE =
  'Too close. Step back so your head, arms, and legs all fit in the frame.';

export const POSE_MOVE_INTO_FRAME =
  'Move into frame. Head, torso, arms, and legs should all be visible.';

export const POSE_TARGET_BADGE = 'Target hit';

export const PRACTICE_SESSION_TITLE = 'Extra set';

/** Side-on for push-ups, plank, sit-ups; front-on for the rest. */
export function poseCameraPlacement(
  metric: 'pushups' | 'squats' | 'plank' | 'jumping_jacks' | 'burpees' | 'sit_ups' | 'mountain_climbers' | 'lunges' | string,
): string {
  if (metric === 'pushups' || metric === 'plank' || metric === 'sit_ups') {
    return 'Prop the phone side-on so your whole body fits.';
  }

  return 'Prop the phone facing you so your whole body fits.';
}

export type PoseSessionMode = 'challenge' | 'match' | 'practice';

/** Heading on the review card once counting stops. */
export function poseReviewTitle(input: {
  mode: PoseSessionMode;
  count: number;
  meetsTarget: boolean;
}): string {
  if (input.count === 0) {
    return 'No reps yet';
  }

  if (input.mode === 'match') {
    return 'Set ready';
  }

  if (input.mode === 'practice') {
    return 'Set recorded';
  }

  return input.meetsTarget ? 'Target reached' : 'Short of the target';
}

/**
 * Pill on the live counter once the required reps are in, so extra reps never
 * leave the user guessing whether the target already landed. Null while short.
 */
export function poseTargetBadge(input: { count: number; target: number }): string | null {
  if (input.target <= 0 || input.count < input.target) {
    return null;
  }

  const extra = input.count - input.target;

  return extra === 0 ? POSE_TARGET_BADGE : `${POSE_TARGET_BADGE} · +${extra}`;
}

const SHORT_BY_WORDS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
];

/** "Two short. Take a breather, then go again." Not a failure, just the next attempt. */
export function poseShortLine(input: { count: number; target: number }): string {
  const shortBy = Math.max(input.target - input.count, 0);
  const word = SHORT_BY_WORDS[shortBy - 1] ?? String(shortBy);
  return `${word} short. Take a breather, then go again.`;
}

/** Large on-camera prompt. Framing first, then QuickPose form copy. */
export function poseCoachBanner(input: {
  tooClose: boolean;
  coachPrompt: string | null;
  bodyInFrame: boolean;
}): string | null {
  if (input.tooClose) {
    return POSE_TOO_CLOSE;
  }

  if (input.coachPrompt) {
    return input.coachPrompt;
  }

  if (!input.bodyInFrame) {
    return POSE_MOVE_INTO_FRAME;
  }

  return null;
}
