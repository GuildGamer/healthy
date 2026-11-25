import {
  GYM_PHOTO_SHARE_HEIGHT,
  GYM_PHOTO_SHARE_WIDTH,
} from '@/components/challenges/GymPhotoShareCard';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import {
  fitPortraitMedia,
  sizeForSharePage,
} from './set-share-layout';

describe('set-share-layout', () => {
  it('fits a portrait card inside the slot without transform math', () => {
    const photo = sizeForSharePage('photo', 360, 520);
    expect(photo.width).toBe(360);
    expect(photo.height).toBe(360 / (GYM_PHOTO_SHARE_WIDTH / GYM_PHOTO_SHARE_HEIGHT));
    expect(photo.width / photo.height).toBeCloseTo(3 / 4);

    const poster = sizeForSharePage('poster', 360, 520);
    expect(poster.width).toBe(360);
    expect(poster.height).toBe(
      360 / (SHARE_POSTER_WIDTH / SHARE_POSTER_HEIGHT),
    );
  });

  it('shrinks when the slot is short', () => {
    const fitted = fitPortraitMedia(400, 200, 3 / 4);
    expect(fitted.height).toBe(200);
    expect(fitted.width).toBe(150);
  });

  it('returns zero when the slot has not laid out yet', () => {
    expect(sizeForSharePage('poster', 320, 0)).toEqual({ width: 0, height: 0 });
    expect(fitPortraitMedia(0, 400, 0.8)).toEqual({ width: 0, height: 0 });
  });

  it('keeps poster and photo on their own aspects in the same slot', () => {
    const slot = { width: 320, height: 480 };
    const photo = sizeForSharePage('photo', slot.width, slot.height);
    const poster = sizeForSharePage('poster', slot.width, slot.height);
    expect(photo.height).not.toBe(poster.height);
    expect(photo.width / photo.height).toBeCloseTo(3 / 4);
    expect(poster.width / poster.height).toBeCloseTo(
      SHARE_POSTER_WIDTH / SHARE_POSTER_HEIGHT,
    );
  });
});
