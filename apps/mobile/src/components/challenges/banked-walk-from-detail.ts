import type { TodayChallenge } from '@product/client';
import type { WalkRecording } from './useWalkRecorder';

const SECONDS_PER_MINUTE = 60;

/**
 * Turns Today's best measured session for this walk into a recording the
 * session screen can restore. Duration targets use minutes; distance-only
 * targets use metres. Null when nothing was measured yet.
 */
export function bankedWalkFromBestMeasured(
  occurrence: Pick<TodayChallenge, 'id' | 'capture'>,
  bestMeasuredInPeriod: number | null | undefined,
  now: Date = new Date(),
): WalkRecording | null {
  if (bestMeasuredInPeriod == null || bestMeasuredInPeriod <= 0) {
    return null;
  }

  const { target } = occurrence.capture;
  const endedAt = now.toISOString();
  // Stable across reopenings so further partials upsert the same practice row.
  const startedAt = `banked:${occurrence.id}`;

  if (target.durationMinutes !== null) {
    return {
      durationSeconds: bestMeasuredInPeriod * SECONDS_PER_MINUTE,
      distanceMeters: 0,
      startedAt,
      endedAt,
    };
  }

  if (target.distanceMeters !== null) {
    return {
      durationSeconds: 0,
      distanceMeters: bestMeasuredInPeriod,
      startedAt,
      endedAt,
    };
  }

  return null;
}
