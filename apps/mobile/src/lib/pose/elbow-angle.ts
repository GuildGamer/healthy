import type { PosePoint } from './landmarks';

/** Interior angle at `vertex` in degrees (0–180). */
export function jointAngleDegrees(
  proximal: PosePoint,
  vertex: PosePoint,
  distal: PosePoint,
): number {
  const proximalVector = {
    x: proximal.x - vertex.x,
    y: proximal.y - vertex.y,
  };
  const distalVector = {
    x: distal.x - vertex.x,
    y: distal.y - vertex.y,
  };

  const proximalLength = Math.hypot(proximalVector.x, proximalVector.y);
  const distalLength = Math.hypot(distalVector.x, distalVector.y);

  if (proximalLength < 1e-6 || distalLength < 1e-6) {
    return 180;
  }

  const cosine =
    (proximalVector.x * distalVector.x + proximalVector.y * distalVector.y) /
    (proximalLength * distalLength);

  const clamped = Math.min(1, Math.max(-1, cosine));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/**
 * Maps elbow extension → flexion into a 0..1 “downness” signal.
 * ~165° arms extended (up) → 0; ~75° deep bend (down) → 1.
 */
export function elbowDownness(angleDegrees: number): number {
  const extendedDegrees = 165;
  const flexedDegrees = 75;
  const span = extendedDegrees - flexedDegrees;
  const raw = (extendedDegrees - angleDegrees) / span;
  return Math.min(1, Math.max(0, raw));
}
