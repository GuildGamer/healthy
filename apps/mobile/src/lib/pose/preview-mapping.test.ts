import {
  mapSquareModelPointToCoverView,
  resizeRotationForOrientation,
  uprightBufferSize,
} from './preview-mapping';

describe('uprightBufferSize', () => {
  it('swaps axes for landscape buffers', () => {
    expect(uprightBufferSize(1920, 1080, 'landscape-left')).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('keeps portrait buffers as-is', () => {
    expect(uprightBufferSize(1080, 1920, 'portrait')).toEqual({
      width: 1080,
      height: 1920,
    });
  });
});

describe('resizeRotationForOrientation', () => {
  it('matches Skia upright counter-rotation', () => {
    expect(resizeRotationForOrientation('landscape-left')).toBe('270deg');
    expect(resizeRotationForOrientation('landscape-right')).toBe('90deg');
    expect(resizeRotationForOrientation('portrait')).toBe('0deg');
  });
});

describe('mapSquareModelPointToCoverView', () => {
  it('places the square center at the view center on a tall cover preview', () => {
    // Upright 1080×1920, square is full width centered vertically.
    // Tall view covers full height and crops sides — square center stays centered.
    const mapped = mapSquareModelPointToCoverView(0.5, 0.5, {
      viewWidth: 390,
      viewHeight: 844,
      bufferWidth: 1080,
      bufferHeight: 1920,
      orientation: 'portrait',
    });

    expect(mapped.x).toBeCloseTo(0.5, 5);
    expect(mapped.y).toBeCloseTo(0.5, 5);
  });

  it('compresses vertical model coords into the cover crop band', () => {
    // Model y=0 is the top of the center square, not the top of the tall frame.
    const top = mapSquareModelPointToCoverView(0.5, 0, {
      viewWidth: 390,
      viewHeight: 844,
      bufferWidth: 1080,
      bufferHeight: 1920,
      orientation: 'portrait',
    });
    const bottom = mapSquareModelPointToCoverView(0.5, 1, {
      viewWidth: 390,
      viewHeight: 844,
      bufferWidth: 1080,
      bufferHeight: 1920,
      orientation: 'portrait',
    });

    expect(top.y).toBeGreaterThan(0.15);
    expect(bottom.y).toBeLessThan(0.85);
    expect(bottom.y - top.y).toBeLessThan(0.7);
  });

  it('uses landscape buffer size after uprighting', () => {
    const mapped = mapSquareModelPointToCoverView(0.5, 0.5, {
      viewWidth: 390,
      viewHeight: 844,
      bufferWidth: 1920,
      bufferHeight: 1080,
      orientation: 'landscape-left',
    });

    expect(mapped.x).toBeCloseTo(0.5, 5);
    expect(mapped.y).toBeCloseTo(0.5, 5);
  });
});
