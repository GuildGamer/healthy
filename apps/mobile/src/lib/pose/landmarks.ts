/** MediaPipe / MoveNet-compatible body landmark indices used for push-ups. */
export const PoseLandmarkIndex = {
  nose: 0,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
} as const;

export type PosePoint = {
  x: number;
  y: number;
  /** 0–1 visibility / confidence when the model provides it. */
  score: number;
};

export type PoseFrame = {
  /** Milliseconds since an arbitrary session epoch. */
  timestampMs: number;
  points: Partial<Record<keyof typeof PoseLandmarkIndex, PosePoint>>;
};

export function averagePoint(
  left: PosePoint | undefined,
  right: PosePoint | undefined,
): PosePoint | null {
  if (left && right) {
    return {
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      score: Math.min(left.score, right.score),
    };
  }

  return left ?? right ?? null;
}
