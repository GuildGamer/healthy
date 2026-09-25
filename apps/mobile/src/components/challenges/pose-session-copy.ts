/** Framing tips shown above the camera before counting starts. */
export const POSE_SETUP_INSTRUCTION =
  'Prop your phone so your whole body is in the frame: head to feet, both arms visible. Stay square to the camera, then start your first push-up. Counting begins automatically, or tap Start.';

/** Short HUD line during setup. Keep the camera overlay readable. */
export const POSE_SETUP_HUD_READY =
  'Ready. Whole body in frame, then start moving.';
export const POSE_TRACKING = 'Tracking';

export const POSE_MOVE_CLOSER =
  'Step back so your whole body fits in the frame.';

export const POSE_TOO_CLOSE =
  'Too close. Step back so your head, arms, and legs all fit in the frame.';

export const POSE_TRACKING_WEAK =
  'Tracking weak. Keep your whole body in frame and move straight up and down.';

export const POSE_MOVE_INTO_FRAME =
  'Move into frame. Head, torso, arms, and legs should all be visible.';

export const POSE_TARGET_BADGE = 'Target hit';

export const PRACTICE_SESSION_TITLE = 'Push-ups';

/** Sets the expectation before the user submits an unscored set. */
export const POSE_PRACTICE_HINT = 'Saved to your activity · no points, no streak';

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
export function poseTargetBadge(input: {
  count: number;
  target: number;
}): string | null {
  if (input.target <= 0 || input.count < input.target) {
    return null;
  }

  const extra = input.count - input.target;

  return extra === 0 ? POSE_TARGET_BADGE : `${POSE_TARGET_BADGE} · +${extra}`;
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
