import type { ChallengeFieldProgress, UserChallengeStatus } from '@product/client';

export type ChallengeProgress =
  | { kind: 'idle' }
  | { kind: 'done' }
  | { kind: 'step'; step: number; total: number };

export function challengeProgress(
  status: UserChallengeStatus,
  progress: ChallengeFieldProgress | null | undefined,
): ChallengeProgress {
  if (status === 'completed') {
    return { kind: 'done' };
  }

  if (!progress || progress.filled === 0) {
    return { kind: 'idle' };
  }

  return { kind: 'step', step: progress.filled, total: progress.required };
}
