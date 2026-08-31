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
});
