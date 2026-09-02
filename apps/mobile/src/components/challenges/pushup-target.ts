export const PUSHUP_TARGET_MIN = 1;
export const PUSHUP_TARGET_MAX = 100;
export const DEFAULT_PUSHUP_TARGET = 20;

export function clampPushupTarget(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PUSHUP_TARGET;
  }

  return Math.min(
    PUSHUP_TARGET_MAX,
    Math.max(PUSHUP_TARGET_MIN, Math.round(value)),
  );
}

export function stepPushupTarget(current: number, delta: number): number {
  return clampPushupTarget(current + delta);
}
