import type { MatchMetric } from '@product/contract/match-board';
import type { PoseFrame } from './landmarks';
import type { StanceReason } from './pose-stance';

/**
 * Compact landmark dump when the stance gate rejects a frame.
 * Used to replay real device failures in unit tests instead of guessing thresholds.
 */
export type StanceRejectSample = {
  metric: MatchMetric;
  reason: StanceReason;
  capturedAtMs: number;
  /** Rounded joint map — safe to log / paste into a fixture. */
  points: Record<string, { x: number; y: number; score: number }>;
};

const LOG_INTERVAL_MS = 1500;

let lastSample: StanceRejectSample | null = null;
let lastLogAtMs = 0;

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function stanceDebugEnabled(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return true;
  }
  return process.env.EXPO_PUBLIC_POSE_STANCE_DEBUG === '1';
}

export function clearStanceRejectSample(): void {
  lastSample = null;
  lastLogAtMs = 0;
}

export function getLastStanceRejectSample(): StanceRejectSample | null {
  return lastSample;
}

export function serializeStanceRejectSample(sample: StanceRejectSample): string {
  return JSON.stringify(sample);
}

/**
 * Remember a rejected stance frame and optionally log it for capture from device.
 */
export function recordStanceRejectSample(input: {
  metric: MatchMetric;
  reason: StanceReason;
  frame: PoseFrame;
  nowMs?: number;
}): StanceRejectSample {
  const nowMs = input.nowMs ?? Date.now();
  const points: StanceRejectSample['points'] = {};
  for (const [name, point] of Object.entries(input.frame.points)) {
    if (point == null) {
      continue;
    }
    points[name] = {
      x: roundCoord(point.x),
      y: roundCoord(point.y),
      score: roundCoord(point.score),
    };
  }

  const sample: StanceRejectSample = {
    metric: input.metric,
    reason: input.reason,
    capturedAtMs: nowMs,
    points,
  };
  lastSample = sample;

  if (stanceDebugEnabled() && nowMs - lastLogAtMs >= LOG_INTERVAL_MS) {
    lastLogAtMs = nowMs;
    console.warn('[pose-stance-reject]', serializeStanceRejectSample(sample));
  }

  return sample;
}
