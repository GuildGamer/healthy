import { PushupCounter } from './pushup-counter';
import {
  syntheticFrontPushupDepth,
  syntheticFrontPushupFrame,
} from './synthetic-front-pushup';
import {
  syntheticPushupDepth,
  syntheticPushupFrame,
} from './synthetic-pushup';
import { elbowDownness, jointAngleDegrees } from './elbow-angle';

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

const SIDE_VIEW_OPTIONS = {
  minRepIntervalMs: 200,
  calibrationFrames: 0,
  visibilityWarmupFrames: 1,
} as const;

function faceCloseUpFrame(timestampMs: number, bob: number) {
  const y = 0.32 + bob * 0.1;
  const point = (x: number, pointY: number) => ({
    x,
    y: pointY,
    score: 0.9,
  });

  return {
    timestampMs,
    points: {
      nose: point(0.5, y - 0.04),
      leftShoulder: point(0.38, y),
      rightShoulder: point(0.62, y),
      leftElbow: point(0.36, y + 0.03),
      rightElbow: point(0.64, y + 0.03),
      leftWrist: point(0.34, y + 0.05),
      rightWrist: point(0.66, y + 0.05),
      leftHip: point(0.42, y + 0.08),
      rightHip: point(0.58, y + 0.08),
    },
  };
}

function standingFromPlankFrame(timestampMs: number, amount: number) {
  const frame = syntheticFrontPushupFrame(timestampMs, 0);
  const rise = amount * 0.14;
  const hipDrop = amount * 0.16;
  const wristLift = amount * 0.12;

  for (const name of [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
  ] as const) {
    const point = frame.points[name];
    if (point) {
      point.y -= rise;
    }
  }

  for (const name of ['leftHip', 'rightHip'] as const) {
    const point = frame.points[name];
    if (point) {
      point.y += hipDrop;
    }
  }

  for (const name of ['leftWrist', 'rightWrist'] as const) {
    const point = frame.points[name];
    if (point) {
      point.y -= wristLift;
    }
  }

  return frame;
}

function extraDeepFrontPushupFrame(
  timestampMs: number,
  depth: number,
  extraDrop: number,
) {
  const frame = syntheticFrontPushupFrame(timestampMs, depth);
  const extra = depth * extraDrop;

  for (const name of [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftHip',
    'rightHip',
  ] as const) {
    const point = frame.points[name];
    if (!point) {
      continue;
    }
    point.y += extra;
  }

  return frame;
}

describe('PushupCounter', () => {
  it('counts a full up-down-up cycle from synthetic landmarks', () => {
    const counter = new PushupCounter(SIDE_VIEW_OPTIONS);

    for (let time = 0; time <= 1_200; time += 40) {
      const depth = syntheticPushupDepth(time, 1_200);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBe(1);
  });

  it('counts multiple reps across cycles', () => {
    const counter = new PushupCounter(SIDE_VIEW_OPTIONS);

    for (let time = 0; time <= 3_600; time += 40) {
      const depth = syntheticPushupDepth(time, 1_200);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBe(3);
  });

  it('counts fast reps without a long hold at the bottom', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      minRepIntervalMs: 200,
      visibilityWarmupFrames: 1,
    });

    for (let time = 0; time <= 2_400; time += 40) {
      const depth = syntheticPushupDepth(time, 600);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
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

  it('counts continuous reps that never fully pause at the top', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 1,
      smoothAlpha: 0.5,
    });

    // Depth only returns to ~0.4 between reps — inside the up band, not lockout.
    for (let time = 0; time <= 3_600; time += 40) {
      const wave = syntheticPushupDepth(time, 700);
      const depth = 0.4 + wave * 0.5;
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('counts reps that return into the up band without full lockout', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 1,
    });

    // Top stays around 0.35–0.4 (not 0); bottom reaches ~0.95.
    for (let time = 0; time <= 3_600; time += 40) {
      const wave = syntheticPushupDepth(time, 900);
      const depth = 0.35 + wave * 0.6;
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('counts very fast continuous side-view cycles', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      minRepIntervalMs: 180,
      visibilityWarmupFrames: 1,
    });

    for (let time = 0; time <= 2_400; time += 40) {
      const depth = syntheticPushupDepth(time, 480);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(3);
  });

  it('debounces reps that arrive too quickly', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      minRepIntervalMs: 800,
    });

    for (let time = 0; time <= 400; time += 20) {
      const depth = syntheticPushupDepth(time, 400);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBe(0);
  });

  it('does not book a rep after signal loss while waiting for the return', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      signalLossResetFrames: 3,
      visibilityWarmupFrames: 2,
    });

    for (let time = 0; time <= 400; time += 40) {
      const depth = syntheticPushupDepth(time, 1_200);
      counter.ingest(syntheticPushupFrame(time, depth));
    }

    for (let time = 440; time <= 520; time += 40) {
      counter.ingest(syntheticPushupFrame(time, 1));
    }

    expect(counter.snapshot().phase).toBe('down');
    expect(counter.snapshot().count).toBe(0);

    for (let frame = 0; frame < 5; frame += 1) {
      counter.ingest({
        timestampMs: 700 + frame * 40,
        points: { nose: { x: 0.5, y: 0.2, score: 0.9 } },
      });
    }

    expect(counter.snapshot().phase).toBe('up');
    expect(counter.snapshot().count).toBe(0);
  });

  it('smooths noisy downness before phase transitions', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      smoothAlpha: 0.5,
      visibilityWarmupFrames: 1,
    });

    const flexed = (time: number) => syntheticPushupFrame(time, 1);
    const extended = (time: number) => syntheticPushupFrame(time, 0);

    for (let time = 0; time <= 120; time += 40) {
      counter.ingest(extended(time));
    }

    for (let time = 160; time <= 520; time += 40) {
      counter.ingest(flexed(time));
    }

    expect(counter.snapshot().phase).toBe('down');

    for (let time = 560; time <= 1_000; time += 40) {
      counter.ingest(extended(time));
    }

    expect(counter.snapshot().count).toBe(1);
  });

  it('supports legacy hold-at-top calibration when configured', () => {
    const counter = new PushupCounter({
      minRepIntervalMs: 200,
      calibrationFrames: 8,
    });

    for (let index = 0; index < 8; index += 1) {
      counter.ingest(syntheticPushupFrame(index * 40, 0));
    }

    expect(counter.snapshot().calibrating).toBe(true);
    expect(counter.snapshot().count).toBe(0);
  });

  it('counts front-facing reps at a natural pace without a setup hold', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 4,
    });

    for (let time = 0; time <= 4_000; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      counter.ingest(syntheticFrontPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('still counts when wrists and elbows flicker off on the way up', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let time = 0; time <= 2_400; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_200);
      const frame = syntheticFrontPushupFrame(time, depth);
      if (depth < 0.45 && time > 600) {
        delete frame.points.leftWrist;
        delete frame.points.rightWrist;
        delete frame.points.leftElbow;
        delete frame.points.rightElbow;
      }
      counter.ingest(frame);
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(1);
  });

  it('counts front-facing reps when elbow angle barely moves', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 4,
    });

    for (let time = 0; time <= 4_000; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      const frame = syntheticFrontPushupFrame(time, depth);
      const shoulderY = frame.points.leftShoulder!.y;
      frame.points.leftElbow = { x: 0.38, y: shoulderY + 0.1, score: 0.92 };
      frame.points.rightElbow = { x: 0.62, y: shoulderY + 0.1, score: 0.92 };
      counter.ingest(frame);
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('counts front-facing reps even when shoulders drift sideways a bit', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let time = 0; time <= 4_000; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      const frame = syntheticFrontPushupFrame(time, depth);
      const drift = Math.sin(time / 400) * 0.03;
      frame.points.leftShoulder!.x += drift;
      frame.points.rightShoulder!.x += drift;
      frame.points.nose!.x += drift;
      counter.ingest(frame);
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('does not count shallow half-reps', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 1,
    });

    for (let time = 0; time <= 4_000; time += 40) {
      const wave = syntheticFrontPushupDepth(time, 900);
      // Only ~20% of a full front-camera dip — should never arm.
      counter.ingest(syntheticFrontPushupFrame(time, wave * 0.2));
    }

    expect(counter.snapshot().count).toBe(0);
  });

  it('does not count when the whole skeleton jumps like a moving phone', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 1,
    });

    for (let index = 0; index < 40; index += 1) {
      const frame = syntheticFrontPushupFrame(index * 40, index % 2);
      const jump = index * 0.12;
      for (const point of Object.values(frame.points)) {
        if (!point) {
          continue;
        }
        point.x += jump;
        point.y += jump * 0.5;
      }
      counter.ingest(frame);
    }

    expect(counter.snapshot().count).toBe(0);
  });

  it('counts after the user is first seen standing, then planks', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let index = 0; index < 20; index += 1) {
      const frame = syntheticFrontPushupFrame(index * 40, 0);
      for (const name of [
        'nose',
        'leftShoulder',
        'rightShoulder',
        'leftElbow',
        'rightElbow',
        'leftHip',
        'rightHip',
      ] as const) {
        const point = frame.points[name];
        if (point) {
          point.y -= 0.14;
        }
      }
      counter.ingest(frame);
    }

    for (let time = 800; time <= 5_800; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      counter.ingest(syntheticFrontPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('counts front-facing reps at live 8fps cadence', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let time = 0; time <= 5_000; time += 125) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      counter.ingest(syntheticFrontPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('keeps counting later front-facing reps after an extra-deep first dip', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let time = 0; time <= 1_000; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      counter.ingest(extraDeepFrontPushupFrame(time, depth, 0.1));
    }

    for (let time = 1_040; time <= 5_040; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_000);
      counter.ingest(syntheticFrontPushupFrame(time, depth));
    }

    expect(counter.snapshot().count).toBeGreaterThanOrEqual(3);
  });

  it('does not count a face close-up while nodding the phone', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 1,
    });

    for (let time = 0; time <= 4_000; time += 80) {
      const bob = (Math.sin(time / 180) + 1) / 2;
      counter.ingest(faceCloseUpFrame(time, bob));
    }

    expect(counter.snapshot().count).toBe(0);
    expect(counter.snapshot().tooClose).toBe(true);
    expect(counter.snapshot().bodyInFrame).toBe(false);
  });

  it('does not count standing up from a plank', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let time = 0; time <= 1_200; time += 40) {
      const depth = syntheticFrontPushupDepth(time, 1_200);
      counter.ingest(syntheticFrontPushupFrame(time, depth));
    }

    const afterReps = counter.snapshot().count;
    expect(afterReps).toBeGreaterThanOrEqual(1);

    for (let index = 0; index <= 20; index += 1) {
      counter.ingest(standingFromPlankFrame(1_400 + index * 40, index / 20));
    }

    expect(counter.snapshot().count).toBe(afterReps);
  });

  it('does not count lateral sway without vertical shoulder drop', () => {
    const counter = new PushupCounter({
      ...SIDE_VIEW_OPTIONS,
      visibilityWarmupFrames: 2,
    });

    for (let index = 0; index < 12; index += 1) {
      counter.ingest(syntheticFrontPushupFrame(index * 40, 0));
    }

    for (let index = 0; index < 40; index += 1) {
      const frame = syntheticFrontPushupFrame(500 + index * 40, 0);
      const shift = (index / 40) * 0.14 - 0.07;
      const left = frame.points.leftShoulder!;
      const right = frame.points.rightShoulder!;
      left.x += shift;
      right.x += shift;
      frame.points.nose = {
        x: 0.5 + shift,
        y: frame.points.nose!.y,
        score: 0.95,
      };
      counter.ingest(frame);
    }

    expect(counter.snapshot().count).toBe(0);
  });
});
