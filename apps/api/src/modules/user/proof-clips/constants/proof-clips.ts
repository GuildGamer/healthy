import {
  PROOF_CLIP_GROUP_RETENTION_DAYS,
  PROOF_CLIP_HARD_RETENTION_DAYS,
  PROOF_CLIP_MAX_BYTES,
  PROOF_CLIP_MAX_DURATION_SECONDS,
  PROOF_CLIP_RESERVE_WINDOW_MINUTES,
  PROOF_CLIP_SIGNED_URL_TTL_SECONDS,
  PROOF_CLIP_SOLO_RETENTION_DAYS,
} from '@product/contract';

export {
  PROOF_CLIP_GROUP_RETENTION_DAYS,
  PROOF_CLIP_HARD_RETENTION_DAYS,
  PROOF_CLIP_MAX_BYTES,
  PROOF_CLIP_MAX_DURATION_SECONDS,
  PROOF_CLIP_RESERVE_WINDOW_MINUTES,
  PROOF_CLIP_SIGNED_URL_TTL_SECONDS,
  PROOF_CLIP_SOLO_RETENTION_DAYS,
};

/** How many verify attempts a signed-in user may make per rolling minute. */
export const PROOF_CLIP_VERIFY_RATE_LIMIT = 20;

/** How many anonymous verify attempts an IP may make per rolling minute. */
export const PROOF_CLIP_PUBLIC_VERIFY_RATE_LIMIT = 10;

/** Reserved rows older than this are deleted by the sweep. */
export const PROOF_CLIP_RESERVE_TTL_HOURS = 24;

/** A finished group's whole-run clip list stops here; each clip signs its own URLs. */
export const PROOF_CLIP_ALL_DAYS_LIMIT = 50;

export const PROOF_CLIP_VIDEO_CONTENT_TYPE = 'video/mp4';
export const PROOF_CLIP_POSTER_CONTENT_TYPE = 'image/jpeg';
