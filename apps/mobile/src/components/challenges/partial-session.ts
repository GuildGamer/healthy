import type { RecordPracticeSessionInput, TodayChallenge } from '@product/client';
import type { WalkRecording } from './useWalkRecorder';

type Occurrence = Pick<TodayChallenge, 'id' | 'capture'>;

/** The id a walk keeps across pauses and resumes, and on its final submit. */
export function walkSessionId(occurrence: Pick<TodayChallenge, 'id'>, startedAt: string): string {
  return `in-app-gps:${occurrence.id}:${startedAt}`;
}

/** The id a camera-counted set keeps, whether it is saved short or submitted. */
export function setSessionId(occurrence: Pick<TodayChallenge, 'id'>, startedAt: string): string {
  return `in-app-pose:${occurrence.id}:${startedAt}`;
}

/** A recorded walk that stopped short, as progress; null when there is nothing measured to keep. */
export function partialWalkSession(
  occurrence: Occurrence,
  walk: WalkRecording,
): RecordPracticeSessionInput | null {
  if (occurrence.capture.metric !== 'walk' || walk.durationSeconds <= 0) {
    return null;
  }

  return {
    metric: 'walk',
    source: 'in_app_gps',
    durationSeconds: walk.durationSeconds,
    distanceMeters: walk.distanceMeters,
    startedAt: walk.startedAt,
    endedAt: walk.endedAt,
    externalId: walkSessionId(occurrence, walk.startedAt),
  };
}

/** A set that stopped short of the goal, as progress; null when no rep was counted. */
export function partialSetSession(
  occurrence: Pick<TodayChallenge, 'id'>,
  set: { count: number; durationSeconds: number; startedAt: string; endedAt: string },
): RecordPracticeSessionInput | null {
  if (set.count <= 0) {
    return null;
  }

  return {
    metric: 'pushups',
    source: 'in_app_pose',
    count: set.count,
    durationSeconds: set.durationSeconds,
    startedAt: set.startedAt,
    endedAt: set.endedAt,
    externalId: setSessionId(occurrence, set.startedAt),
  };
}
