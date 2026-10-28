/** Hard caps kept in the contract so clients and server share one source. */
export const PROOF_CLIP_MAX_DURATION_SECONDS = 180;
/** Ceiling for a 180 s clip at the default 1.5 Mbps bitrate, with encoder headroom. */
export const PROOF_CLIP_MAX_BYTES = 40 * 1024 * 1024;
export const PROOF_CLIP_POSTER_MAX_BYTES = 512_000;
export const PROOF_CLIP_SIGNED_URL_TTL_SECONDS = 15 * 60;
export const PROOF_CLIP_RESERVE_WINDOW_MINUTES = 30;
export const PROOF_CLIP_SOLO_RETENTION_DAYS = 30;
export const PROOF_CLIP_GROUP_RETENTION_DAYS = 30;
export const PROOF_CLIP_HARD_RETENTION_DAYS = 90;

/** Balanced default: clear enough for a set, light enough for a cellular upload. */
export const PROOF_CLIP_DEFAULT_BIT_RATE = 1_500_000;
export const PROOF_CLIP_DEFAULT_FRAME_RATE = 24;
export const PROOF_CLIP_DEFAULT_WIDTH = 720;
export const PROOF_CLIP_DEFAULT_HEIGHT = 1280;

/** Bounds for server env overrides and client validation of a reserve profile. */
export const PROOF_CLIP_BIT_RATE_MIN = 200_000;
export const PROOF_CLIP_BIT_RATE_MAX = 1_500_000;
export const PROOF_CLIP_FRAME_RATE_MIN = 15;
export const PROOF_CLIP_FRAME_RATE_MAX = 30;
export const PROOF_CLIP_WIDTH_MIN = 480;
export const PROOF_CLIP_WIDTH_MAX = 720;
export const PROOF_CLIP_HEIGHT_MIN = 854;
export const PROOF_CLIP_HEIGHT_MAX = 1280;

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
