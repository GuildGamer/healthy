import {
  isFrameOrientation,
  uprightNormalizedPoint,
} from './frame-orientation';

describe('uprightNormalizedPoint', () => {
  it('leaves portrait points unchanged', () => {
    expect(uprightNormalizedPoint(0.25, 0.4, 'portrait')).toEqual({
      x: 0.25,
      y: 0.4,
    });
  });

  it('rotates landscape-left with Skia’s 270° CW mapping', () => {
    expect(uprightNormalizedPoint(0.2, 0.5, 'landscape-left')).toEqual({
      x: 0.5,
      y: 0.8,
    });
  });

  it('rotates landscape-right with Skia’s 90° CW mapping', () => {
    expect(uprightNormalizedPoint(0.75, 0.5, 'landscape-right')).toEqual({
      x: 0.5,
      y: 0.75,
    });
  });
});

describe('isFrameOrientation', () => {
  it('accepts known Vision Camera orientations only', () => {
    expect(isFrameOrientation('landscape-left')).toBe(true);
    expect(isFrameOrientation('sideways')).toBe(false);
  });
});
