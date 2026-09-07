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
