/**
 * Social export sizing. In-app cards stay small for layout; `captureRef` scales
 * the off-screen twin up to this width so Instagram / WhatsApp get a sharp PNG.
 */
export const SHARE_EXPORT_WIDTH_PX = 1080;

/** 9:16 Stories frame in design units (scaled to {@link SHARE_EXPORT_WIDTH_PX}). */
export const SHARE_STORIES_FRAME_WIDTH = 270;
export const SHARE_STORIES_FRAME_HEIGHT = 480;

/**
 * Meta Stories safe zone (ads guide): keep type/logos out of these bands so
 * profile chrome and the reply bar do not cover them.
 */
export const SHARE_STORIES_SAFE_TOP = 0.14;
export const SHARE_STORIES_SAFE_BOTTOM = 0.35;
export const SHARE_STORIES_SAFE_SIDE = 0.06;

export const SHARE_CAPTURE_OPTIONS = {
  format: 'png' as const,
  quality: 1,
  result: 'tmpfile' as const,
  width: SHARE_EXPORT_WIDTH_PX,
};
