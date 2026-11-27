import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
} from '@/components/challenges/SharePosterCard';
import {
  fitPortraitMedia,
  fitShareCard,
  SHARE_PAGE_MARGIN,
  SHARE_SWATCH_BAND_HEIGHT,
  sizeForSharePage,
  stageHeightForSharePage,
  swatchFadeRange,
} from './set-share-layout';

const POSTER_ASPECT = SHARE_POSTER_WIDTH / SHARE_POSTER_HEIGHT;

describe('set-share-layout', () => {
  it('keeps a side margin so a card never touches the screen edge', () => {
    const poster = sizeForSharePage('poster', 390, 800);

    expect(poster.width).toBe(390 - SHARE_PAGE_MARGIN * 2);
    expect(poster.width / poster.height).toBeCloseTo(POSTER_ASPECT);
  });

  it('gives cards the slot minus the colour band, and the video the whole slot', () => {
    expect(stageHeightForSharePage('poster', 640)).toBe(640 - SHARE_SWATCH_BAND_HEIGHT);
    expect(stageHeightForSharePage('video', 640)).toBe(640);
  });

  it('lets a tall video use the band space a card leaves free', () => {
    const slotHeight = 640;
    const video = sizeForSharePage('video', 390, slotHeight);
    const poster = sizeForSharePage('poster', 390, slotHeight);

    expect(video.width / video.height).toBeCloseTo(9 / 16);
    expect(video.height).toBeGreaterThan(slotHeight - SHARE_SWATCH_BAND_HEIGHT);
    expect(video.height).toBeLessThanOrEqual(slotHeight);
    expect(poster.height).toBeLessThanOrEqual(slotHeight - SHARE_SWATCH_BAND_HEIGHT);
  });

  it('shrinks a card to the stage when the slot is short', () => {
    const poster = sizeForSharePage('poster', 390, 400);

    expect(poster.height).toBe(400 - SHARE_SWATCH_BAND_HEIGHT);
    expect(poster.width / poster.height).toBeCloseTo(POSTER_ASPECT);
  });

  it('fits the 4:5 card into a slot that already has its margins', () => {
    expect(fitShareCard(342, 900)).toEqual({ width: 342, height: 342 / POSTER_ASPECT });
    expect(fitShareCard(342, 300)).toEqual({ width: 300 * POSTER_ASPECT, height: 300 });
    expect(fitShareCard(0, 300)).toEqual({ width: 0, height: 0 });
  });

  it('fits a box by width or by height, whichever binds', () => {
    expect(fitPortraitMedia(400, 200, 3 / 4)).toEqual({ width: 150, height: 200 });
    expect(fitPortraitMedia(300, 800, 3 / 4)).toEqual({ width: 300, height: 400 });
  });

  it('returns zero before the slot has laid out', () => {
    expect(sizeForSharePage('poster', 320, 0)).toEqual({ width: 0, height: 0 });
    expect(sizeForSharePage('poster', 0, 600)).toEqual({ width: 0, height: 0 });
    expect(fitPortraitMedia(0, 400, 0.8)).toEqual({ width: 0, height: 0 });
    expect(stageHeightForSharePage('poster', 40)).toBe(0);
  });

  it('fades the colour row in over the second half of the swipe to the card', () => {
    const pageWidth = 400;

    expect(swatchFadeRange(1, pageWidth)).toEqual([pageWidth * 0.5, pageWidth]);
    expect(swatchFadeRange(2, pageWidth)).toEqual([pageWidth * 1.5, pageWidth * 2]);
  });
});
