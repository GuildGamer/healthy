import type { PoseFrame, PosePoint } from './landmarks';
import {
  clearStanceRejectSample,
  getLastStanceRejectSample,
  recordStanceRejectSample,
  serializeStanceRejectSample,
} from './stance-reject-sample';

function point(x: number, y: number, score = 0.9): PosePoint {
  return { x, y, score };
}

function sampleFrame(): PoseFrame {
  return {
    timestampMs: 10,
    points: {
      leftShoulder: point(0.4, 0.3),
      rightShoulder: point(0.6, 0.3),
      leftHip: point(0.42, 0.7),
      rightHip: point(0.58, 0.7),
    },
  };
}

describe('stance-reject-sample', () => {
  beforeEach(() => {
    clearStanceRejectSample();
  });

  it('records a compact replayable landmark dump', () => {
    const sample = recordStanceRejectSample({
      metric: 'pushups',
      reason: 'standing',
      frame: sampleFrame(),
      nowMs: 1_000,
    });

    expect(getLastStanceRejectSample()).toEqual(sample);
    expect(sample.points.leftShoulder).toEqual({ x: 0.4, y: 0.3, score: 0.9 });
    expect(JSON.parse(serializeStanceRejectSample(sample)).reason).toBe('standing');
  });
});
