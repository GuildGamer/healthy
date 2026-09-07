import {
  minSwingForBody,
  PushupRepMachine,
} from './pushup-rep-machine';

function triangleWave(timeMs: number, cycleMs: number, top: number, bottom: number): number {
  const phase = (timeMs % cycleMs) / cycleMs;
  const downness = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return top + (bottom - top) * downness;
}

describe('minSwingForBody', () => {
  it('scales with how large the body is in the frame', () => {
    expect(minSwingForBody(0.3)).toBeCloseTo(0.024, 3);
    expect(minSwingForBody(0.05)).toBe(0.016);
    expect(minSwingForBody(0.9)).toBe(0.055);
  });
});

describe('PushupRepMachine', () => {
  const minSwing = 0.04;

  it('counts a full cycle and learns swing from it', () => {
    const machine = new PushupRepMachine({ minRepIntervalMs: 200 });

    for (let time = 0; time <= 1_000; time += 40) {
      machine.advance(time, triangleWave(time, 1_000, 0.28, 0.4), minSwing);
    }

    const snapshot = machine.snapshot();
    expect(snapshot.count).toBe(1);
    expect(snapshot.typicalSwing).toBeGreaterThan(0.08);
  });

  it('counts a normal second rep after an extra-deep first dip', () => {
    const machine = new PushupRepMachine({ minRepIntervalMs: 200 });

    for (let time = 0; time <= 1_000; time += 40) {
      machine.advance(time, triangleWave(time, 1_000, 0.28, 0.5), minSwing);
    }

    expect(machine.snapshot().count).toBe(1);

    for (let time = 1_040; time <= 3_000; time += 40) {
      machine.advance(time, triangleWave(time, 1_000, 0.28, 0.4), minSwing);
    }

    expect(machine.snapshot().count).toBeGreaterThanOrEqual(2);
  });

  it('rejects later half-reps once the personal swing is known', () => {
    const machine = new PushupRepMachine({ minRepIntervalMs: 200 });

    for (let time = 0; time <= 2_000; time += 40) {
      machine.advance(time, triangleWave(time, 1_000, 0.28, 0.4), minSwing);
    }

    const afterFull = machine.snapshot().count;
    expect(afterFull).toBeGreaterThanOrEqual(2);

    for (let time = 2_040; time <= 4_000; time += 40) {
      machine.advance(time, triangleWave(time, 1_000, 0.28, 0.32), minSwing);
    }

    expect(machine.snapshot().count).toBe(afterFull);
  });

  it('does not count a twitch smaller than minSwing', () => {
    const machine = new PushupRepMachine({ minRepIntervalMs: 200 });

    for (let time = 0; time <= 2_000; time += 40) {
      machine.advance(time, triangleWave(time, 800, 0.3, 0.325), minSwing);
    }

    expect(machine.snapshot().count).toBe(0);
    expect(machine.snapshot().calibrated).toBe(false);
  });

  it('clears an in-progress cycle without counting', () => {
    const machine = new PushupRepMachine({ minRepIntervalMs: 200 });

    for (let time = 0; time <= 400; time += 40) {
      machine.advance(time, triangleWave(time, 1_000, 0.28, 0.4), minSwing);
    }

    expect(machine.snapshot().phase).toBe('down');
    machine.resetTracking();
    expect(machine.snapshot().phase).toBe('up');
    expect(machine.snapshot().count).toBe(0);
  });
});
