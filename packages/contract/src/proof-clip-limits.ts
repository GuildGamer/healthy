/**
 * Validation bounds for proof-clip encoder settings returned from the API.
 */
export const PROOF_CLIP_ENCODING_BIT_RATE_MIN = 1;
/** ~200 Mbps — far above typical phone encodes; caps unreasonable typos. */
export const PROOF_CLIP_ENCODING_BIT_RATE_MAX = 200_000_000;

export const PROOF_CLIP_ENCODING_FRAME_RATE_MIN = 1;
export const PROOF_CLIP_ENCODING_FRAME_RATE_MAX = 120;

/** Even dimensions; min keeps tiny matrices out; max is 4K portrait. */
export const PROOF_CLIP_ENCODING_WIDTH_MIN = 256;
export const PROOF_CLIP_ENCODING_WIDTH_MAX = 2160;
export const PROOF_CLIP_ENCODING_HEIGHT_MIN = 256;
export const PROOF_CLIP_ENCODING_HEIGHT_MAX = 3840;

/**
 * Hard caps for upload size and duration. Defaults are generous so production
 * can tighten via server env without shipping a new app build.
 */
export const PROOF_CLIP_MAX_DURATION_SECONDS = 3_600;
/** Default matches ~8 Mbps for 10 minutes with headroom (mainstream-style). */
export const PROOF_CLIP_MAX_BYTES = 512 * 1024 * 1024;

export const PROOF_CLIP_POSTER_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_CLIP_SIGNED_URL_TTL_SECONDS = 15 * 60;
export const PROOF_CLIP_RESERVE_WINDOW_MINUTES = 30;
export const PROOF_CLIP_SOLO_RETENTION_DAYS = 30;
export const PROOF_CLIP_GROUP_RETENTION_DAYS = 30;
export const PROOF_CLIP_HARD_RETENTION_DAYS = 90;

/**
 * Default encoder profile when the server omits `encoding` (older API) or the
 * device is offline — 1080×1920 at 30 fps, ~8 Mbps, suitable for social-style
 * vertical video.
 */
export const PROOF_CLIP_DEFAULT_BIT_RATE = 8_000_000;
export const PROOF_CLIP_DEFAULT_FRAME_RATE = 30;
export const PROOF_CLIP_DEFAULT_WIDTH = 1080;
export const PROOF_CLIP_DEFAULT_HEIGHT = 1920;

export type ProofClipEncodingLimits = {
  bitRate: number;
  frameRate: number;
  width: number;
  height: number;
};

export const PROOF_CLIP_DEFAULT_ENCODING: ProofClipEncodingLimits = {
  bitRate: PROOF_CLIP_DEFAULT_BIT_RATE,
  frameRate: PROOF_CLIP_DEFAULT_FRAME_RATE,
  width: PROOF_CLIP_DEFAULT_WIDTH,
  height: PROOF_CLIP_DEFAULT_HEIGHT,
};
