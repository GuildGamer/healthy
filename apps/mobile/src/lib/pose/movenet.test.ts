import { mapMoveNetOutput, MOVENET_KEYPOINT } from './movenet';

describe('mapMoveNetOutput', () => {
  it('maps y,x,score triples into named landmarks', () => {
    const flat = new Array(17 * 3).fill(0);
    const set = (index: number, y: number, x: number, score: number) => {
      flat[index * 3] = y;
      flat[index * 3 + 1] = x;
      flat[index * 3 + 2] = score;
    };

    set(MOVENET_KEYPOINT.leftShoulder, 0.3, 0.4, 0.9);
    set(MOVENET_KEYPOINT.rightElbow, 0.5, 0.6, 0.8);

    const frame = mapMoveNetOutput(flat, 1_000);

    expect(frame.timestampMs).toBe(1_000);
    expect(frame.points.leftShoulder).toEqual({ x: 0.4, y: 0.3, score: 0.9 });
    expect(frame.points.rightElbow).toEqual({ x: 0.6, y: 0.5, score: 0.8 });
    expect(frame.points.nose).toEqual({ x: 0, y: 0, score: 0 });
  });

  it('uprights landscape-left keypoints for the portrait preview', () => {
    const flat = new Array(17 * 3).fill(0);
    // Nose at left-center of the buffer → after 270° CW maps near bottom-center.
    flat[MOVENET_KEYPOINT.nose * 3] = 0.5;
    flat[MOVENET_KEYPOINT.nose * 3 + 1] = 0.2;
    flat[MOVENET_KEYPOINT.nose * 3 + 2] = 0.95;

    const frame = mapMoveNetOutput(flat, 0, 'landscape-left');

    expect(frame.points.nose).toEqual({ x: 0.5, y: 0.8, score: 0.95 });
  });

  it('keeps pre-rotated keypoints and attaches buffer metadata', () => {
    const flat = new Array(17 * 3).fill(0);
    flat[MOVENET_KEYPOINT.nose * 3] = 0.25;
    flat[MOVENET_KEYPOINT.nose * 3 + 1] = 0.4;
    flat[MOVENET_KEYPOINT.nose * 3 + 2] = 0.9;

    const frame = mapMoveNetOutput(flat, 12, {
      orientation: 'landscape-left',
      preRotated: true,
      bufferWidth: 1920,
      bufferHeight: 1080,
    });

    expect(frame.points.nose).toEqual({ x: 0.4, y: 0.25, score: 0.9 });
    expect(frame.bufferWidth).toBe(1920);
    expect(frame.bufferHeight).toBe(1080);
    expect(frame.orientation).toBe('landscape-left');
  });
});
