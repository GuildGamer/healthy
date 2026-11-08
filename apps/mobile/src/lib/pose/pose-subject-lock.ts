import { averagePoint, type PoseFrame, type PosePoint } from './landmarks';
import { CAMERA_MOTION_SHIFT, shoulderMidpoint } from './pushup-form';

/** Landmark confidence floor for the subject anchor. */
export const SUBJECT_LOCK_MIN_SCORE = 0.2;
/** Soft-follow the athlete within this jump (same band as camera-motion noise). */
export const SUBJECT_LOCK_SOFT_UPDATE_MAX = CAMERA_MOTION_SHIFT;
/** Larger jump → treat as a different person; stop feeding the counter. */
export const SUBJECT_LOCK_JUMP_UNLOCK = 0.2;
/** Shoulder/hip Y change that counts as real subject motion. */
export const SUBJECT_MOTION_Y_EPSILON = 0.012;
/** How long recent motion stays “fresh” for arming a half-rep. */
export const SUBJECT_MOTION_RECENT_MS = 400;

/** Shown when landmarks flipped away from the locked athlete. */
export const SUBJECT_LOCK_COACH_PROMPT = 'Stay in frame.';

export type SubjectLockState = {
  hasAnchor: boolean;
  anchorX: number;
  anchorY: number;
  lastY: number;
  lastMotionAtMs: number;
  /** Motion observed while the current half-rep is armed (exit may pause at top). */
  motionSinceArm: boolean;
};

export type SubjectLockTick = {
  state: SubjectLockState;
  isLocked: boolean;
  subjectMovedRecently: boolean;
  /** Whether this frame may drive the threshold counter. */
  mayFeedCounter: boolean;
};

export function createSubjectLock(): SubjectLockState {
  return {
    hasAnchor: false,
    anchorX: 0,
    anchorY: 0,
    lastY: 0,
    lastMotionAtMs: 0,
    motionSinceArm: false,
  };
}

export function resetSubjectLock(): SubjectLockState {
  return createSubjectLock();
}

function pointUsable(point: PosePoint | undefined, minScore: number): point is PosePoint {
  return point != null && point.score >= minScore;
}

function hipMidpoint(frame: PoseFrame, minScore: number): PosePoint | null {
  return averagePoint(
    pointUsable(frame.points.leftHip, minScore) ? frame.points.leftHip : undefined,
    pointUsable(frame.points.rightHip, minScore) ? frame.points.rightHip : undefined,
  );
}

/** Prefer shoulders; hips if the upper body is cropped. */
export function subjectAnchorFromFrame(frame: PoseFrame): PosePoint | null {
  return (
    shoulderMidpoint(frame, SUBJECT_LOCK_MIN_SCORE) ?? hipMidpoint(frame, SUBJECT_LOCK_MIN_SCORE)
  );
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

/**
 * Tracks one athlete across frames. Background motion that steals the SDK’s
 * single skeleton looks like a teleport and is ignored for counting.
 */
export function tickSubjectLock(
  state: SubjectLockState,
  frame: PoseFrame | null,
  options: { finishingRep: boolean; nowMs: number },
): SubjectLockTick {
  const { finishingRep, nowMs } = options;

  if (frame == null) {
    // No landmarks — fail open so stale binaries still count on measure alone.
    return {
      state,
      isLocked: true,
      subjectMovedRecently: true,
      mayFeedCounter: true,
    };
  }

  const point = subjectAnchorFromFrame(frame);
  if (point == null) {
    return {
      state: finishingRep ? state : { ...state, motionSinceArm: false },
      isLocked: false,
      subjectMovedRecently: false,
      mayFeedCounter: false,
    };
  }

  let next: SubjectLockState = { ...state };

  if (!next.hasAnchor) {
    next = {
      hasAnchor: true,
      anchorX: point.x,
      anchorY: point.y,
      lastY: point.y,
      lastMotionAtMs: nowMs,
      motionSinceArm: false,
    };
    const subjectMovedRecently = true;
    return {
      state: next,
      isLocked: true,
      subjectMovedRecently,
      mayFeedCounter: !finishingRep ? subjectMovedRecently : true,
    };
  }

  const jump = distance(next.anchorX, next.anchorY, point.x, point.y);
  if (jump > SUBJECT_LOCK_JUMP_UNLOCK) {
    next = createSubjectLock();
    return {
      state: next,
      isLocked: false,
      subjectMovedRecently: false,
      mayFeedCounter: false,
    };
  }

  if (jump <= SUBJECT_LOCK_SOFT_UPDATE_MAX) {
    next.anchorX = point.x;
    next.anchorY = point.y;
  }

  if (!finishingRep) {
    next.motionSinceArm = false;
  }

  const yDelta = Math.abs(point.y - next.lastY);
  const moved = yDelta >= SUBJECT_MOTION_Y_EPSILON;
  if (moved) {
    next.lastMotionAtMs = nowMs;
    if (finishingRep) {
      next.motionSinceArm = true;
    }
  }
  next.lastY = point.y;

  const subjectMovedRecently = nowMs - next.lastMotionAtMs <= SUBJECT_MOTION_RECENT_MS;
  const mayFeedCounter = finishingRep
    ? subjectMovedRecently || next.motionSinceArm
    : subjectMovedRecently;

  return {
    state: next,
    isLocked: true,
    subjectMovedRecently,
    mayFeedCounter,
  };
}
