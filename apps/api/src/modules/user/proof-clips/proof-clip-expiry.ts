import {
  PROOF_CLIP_GROUP_RETENTION_DAYS,
  PROOF_CLIP_HARD_RETENTION_DAYS,
  PROOF_CLIP_SOLO_RETENTION_DAYS,
} from './constants/proof-clips.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Solo clips: 30 days after the last share or view (or recordedAt if neither).
 * Group clips: 30 days after the contest ends.
 * Both are capped at 90 days after recording.
 */
export function computeProofClipExpiry(input: {
  recordedAt: Date;
  matchEndsAt: Date | null;
  sharedAt: Date | null;
  lastViewedAt: Date | null;
}): Date {
  const hardCap = new Date(
    input.recordedAt.getTime() + PROOF_CLIP_HARD_RETENTION_DAYS * DAY_MS,
  );

  let soft: Date;
  if (input.matchEndsAt) {
    soft = new Date(
      input.matchEndsAt.getTime() + PROOF_CLIP_GROUP_RETENTION_DAYS * DAY_MS,
    );
  } else {
    const activity =
      input.lastViewedAt ?? input.sharedAt ?? input.recordedAt;
    soft = new Date(activity.getTime() + PROOF_CLIP_SOLO_RETENTION_DAYS * DAY_MS);
  }

  return soft.getTime() < hardCap.getTime() ? soft : hardCap;
}
