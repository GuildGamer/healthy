import { landmarksToPoseFrame } from './landmarks-to-pose-frame';

describe('landmarksToPoseFrame', () => {
  it('returns null for missing or empty landmarks', () => {
    expect(landmarksToPoseFrame(null)).toBeNull();
    expect(landmarksToPoseFrame(undefined)).toBeNull();
    expect(landmarksToPoseFrame({})).toBeNull();
  });

  it('maps knees and ankles into PoseFrame points', () => {
    const frame = landmarksToPoseFrame(
      {
        nose: { x: 0.5, y: 0.2, score: 0.9 },
        leftKnee: { x: 0.4, y: 0.7, score: 0.8 },
        rightAnkle: { x: 0.6, y: 0.9 },
      },
      42,
    );

    expect(frame).not.toBeNull();
    expect(frame!.timestampMs).toBe(42);
    expect(frame!.points.nose).toEqual({ x: 0.5, y: 0.2, score: 0.9 });
    expect(frame!.points.leftKnee).toEqual({ x: 0.4, y: 0.7, score: 0.8 });
    expect(frame!.points.rightAnkle).toEqual({ x: 0.6, y: 0.9, score: 1 });
  });

  it('skips non-finite coordinates', () => {
    const frame = landmarksToPoseFrame({
      nose: { x: Number.NaN, y: 0.2, score: 1 },
      leftShoulder: { x: 0.4, y: 0.3, score: 1 },
    });

    expect(frame!.points.nose).toBeUndefined();
    expect(frame!.points.leftShoulder).toEqual({ x: 0.4, y: 0.3, score: 1 });
  });
});
