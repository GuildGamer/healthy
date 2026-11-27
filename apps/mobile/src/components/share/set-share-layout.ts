import { spacing } from '@product/brand';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';

/** The clip and the card. A gym selfie is a background of the card, not a page. */
export type SetSharePage = 'video' | 'poster';

const VIDEO_ASPECT = 9 / 16;

/** 4:5 — the one card shape every share uses, colour or selfie. */
export const SHARE_CARD_ASPECT = SHARE_POSTER_WIDTH / SHARE_POSTER_HEIGHT;

/** Space kept either side of every page so cards and clips never touch the screen edge. */
export const SHARE_PAGE_MARGIN = spacing.lg;

/**
 * Height reserved under the cards for the colour row (label, gap, 44pt swatches,
 * and the gap above). The row is always laid out here, so the card never resizes
 * when it fades in. A video page ignores it and keeps the full height.
 */
export const SHARE_SWATCH_BAND_HEIGHT = 92;

/** The colour row is invisible until the card is this far into view, then fades in. */
const SWATCH_FADE_START = 0.5;

export function aspectForSharePage(page: SetSharePage): number {
  return page === 'poster' ? SHARE_CARD_ASPECT : VIDEO_ASPECT;
}

export function designSizeForSharePage(page: SetSharePage): {
  width: number;
  height: number;
} {
  if (page === 'poster') {
    return { width: SHARE_POSTER_WIDTH, height: SHARE_POSTER_HEIGHT };
  }
  return { width: 0, height: 0 };
}

/** Largest box of the given aspect that fits inside the measured media slot. */
export function fitPortraitMedia(
  maxWidth: number,
  maxHeight: number,
  aspect: number,
): { width: number; height: number } {
  if (maxWidth <= 0 || maxHeight <= 0 || aspect <= 0) {
    return { width: 0, height: 0 };
  }
  const heightFromWidth = maxWidth / aspect;
  if (heightFromWidth <= maxHeight) {
    return { width: maxWidth, height: heightFromWidth };
  }
  return { width: maxHeight * aspect, height: maxHeight };
}

/** The card at its largest inside a slot that already has its side margins. */
export function fitShareCard(
  slotWidth: number,
  slotHeight: number,
): { width: number; height: number } {
  return fitPortraitMedia(slotWidth, slotHeight, SHARE_CARD_ASPECT);
}

/**
 * Height a page may use. Cards leave the colour band free; a video keeps the
 * whole slot so it stays as large as it can.
 */
export function stageHeightForSharePage(page: SetSharePage, slotHeight: number): number {
  if (page === 'video') {
    return Math.max(slotHeight, 0);
  }
  return Math.max(slotHeight - SHARE_SWATCH_BAND_HEIGHT, 0);
}

/** Fit each page to the slot using that page's own aspect — never the active page's. */
export function sizeForSharePage(
  page: SetSharePage,
  pageWidth: number,
  slotHeight: number,
): { width: number; height: number } {
  return fitPortraitMedia(
    pageWidth - SHARE_PAGE_MARGIN * 2,
    stageHeightForSharePage(page, slotHeight),
    aspectForSharePage(page),
  );
}

/**
 * Scroll offsets between which the colour row fades from 0 to 1: from halfway
 * through the swipe towards the card, to the card settling in place.
 */
export function swatchFadeRange(posterIndex: number, pageWidth: number): [number, number] {
  const previousPageOffset = (posterIndex - 1) * pageWidth;
  return [previousPageOffset + pageWidth * SWATCH_FADE_START, posterIndex * pageWidth];
}
