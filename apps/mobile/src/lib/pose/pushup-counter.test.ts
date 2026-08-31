import { elbowDownness, jointAngleDegrees } from './elbow-angle';
import { PushupCounter } from './pushup-counter';
import {
  syntheticPushupDepth,
  syntheticPushupFrame,
} from './synthetic-pushup';

describe('jointAngleDegrees', () => {
  it('returns ~180 for a straight arm', () => {
    const angle = jointAngleDegrees(
      { x: 0, y: 0, score: 1 },
      { x: 1, y: 0, score: 1 },
      { x: 2, y: 0, score: 1 },
    );
    expect(angle).toBeGreaterThan(179);
  });

  it('returns ~90 for a right angle', () => {
    const angle = jointAngleDegrees(
      { x: 0, y: 0, score: 1 },
      { x: 0, y: 1, score: 1 },
      { x: 1, y: 1, score: 1 },
    );
    expect(angle).toBeGreaterThan(89);
    expect(angle).toBeLessThan(91);
  });
});

describe('elbowDownness', () => {
  it('is near 0 when extended and near 1 when flexed', () => {
    expect(elbowDownness(165)).toBeCloseTo(0, 1);
    expect(elbowDownness(75)).toBeCloseTo(1, 1);
  });
});

describe('PushupCounter', () => {
  it('counts a full up-down-up cycle from synthetic landmarks', () => {
    const counter = new PushupCounter({ minRepDurationMs: 200 });

    for (let time = 0; time <= 1_200; time += 40) {
      const depth = syntheticPushupDepth(time, 1_200);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBe(1);
  });

  it('counts multiple reps across cycles', () => {
    const counter = new PushupCounter({ minRepDurationMs: 200 });

    for (let time = 0; time <= 3_600; time += 40) {
      const depth = syntheticPushupDepth(time, 1_200);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBe(3);
  });

  it('ignores frames without visible arms', () => {
    const counter = new PushupCounter();
    const snapshot = counter.ingest({
      timestampMs: 0,
      points: {
        nose: { x: 0.5, y: 0.2, score: 0.9 },
      },
    });

    expect(snapshot.bodyInFrame).toBe(false);
    expect(snapshot.count).toBe(0);
  });

  it('rejects bounce reps that are too fast', () => {
    const counter = new PushupCounter({ minRepDurationMs: 800 });

    for (let time = 0; time <= 400; time += 20) {
      const depth = syntheticPushupDepth(time, 400);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBe(0);
  });
});
