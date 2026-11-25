import {
  GYM_PHOTO_SHARE_ASPECT,
  GYM_PHOTO_SHARE_HEIGHT,
  GYM_PHOTO_SHARE_WIDTH,
} from '@/components/challenges/GymPhotoShareCard';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';

export type SetSharePage = 'video' | 'photo' | 'poster';

const VIDEO_ASPECT = 9 / 16;
const POSTER_ASPECT = SHARE_POSTER_WIDTH / SHARE_POSTER_HEIGHT;

export function aspectForSharePage(page: SetSharePage): number {
  if (page === 'photo') {
    return GYM_PHOTO_SHARE_ASPECT;
  }
  if (page === 'poster') {
    return POSTER_ASPECT;
  }
  return VIDEO_ASPECT;
}

export function designSizeForSharePage(page: SetSharePage): {
  width: number;
  height: number;
} {
  if (page === 'photo') {
    return { width: GYM_PHOTO_SHARE_WIDTH, height: GYM_PHOTO_SHARE_HEIGHT };
  }
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

/** Fit each page to the slot using that page's own aspect — never the active page's. */
export function sizeForSharePage(
  page: SetSharePage,
  pageWidth: number,
  slotHeight: number,
): { width: number; height: number } {
  return fitPortraitMedia(pageWidth, slotHeight, aspectForSharePage(page));
}
