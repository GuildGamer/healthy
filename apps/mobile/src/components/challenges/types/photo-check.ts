import type { CapturedSelfie } from '@/lib/capture-selfie';

/** Where a surprise photo check is, from asking to its outcome. */
export type PhotoCheckPhase =
  | { kind: 'asking' }
  | { kind: 'checking'; photo: CapturedSelfie }
  | { kind: 'rejected' }
  | { kind: 'expired' };

export type PhotoCheckClock = {
  secondsLeft: number;
  /** 0 to 1, for the ring round the shutter. */
  fraction: number;
};
