import type { QuickPoseLandmarks } from 'quickpose-camera';
import { PoseLandmarkIndex, type PoseFrame, type PosePoint } from './landmarks';

const JOINT_KEYS = [
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const satisfies ReadonlyArray<keyof typeof PoseLandmarkIndex>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Maps the native QuickPose landmark dict into the shared PoseFrame shape.
 * Returns null when nothing usable arrived — callers gate counting with
 * `resolveCountingStance`, which fails open without landmarks.
 */
export function landmarksToPoseFrame(
  landmarks: QuickPoseLandmarks | null | undefined,
  timestampMs = 0,
): PoseFrame | null {
  if (landmarks == null) {
    return null;
  }

  const points: PoseFrame['points'] = {};
  let count = 0;

  for (const key of JOINT_KEYS) {
    const raw = landmarks[key];
    if (raw == null) {
      continue;
    }
    if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
      continue;
    }
    const score = isFiniteNumber(raw.score) ? raw.score : 1;
    const point: PosePoint = { x: raw.x, y: raw.y, score };
    points[key] = point;
    count += 1;
  }

  if (count === 0) {
    return null;
  }

  return { timestampMs, points };
}
