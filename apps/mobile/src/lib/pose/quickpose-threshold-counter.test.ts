import {
  QUICKPOSE_MIN_REP_INTERVAL_MS,
  QUICKPOSE_PUSHUP_ENTER_THRESHOLD,
  QUICKPOSE_PUSHUP_EXIT_THRESHOLD,
  QuickPoseThresholdCounter,
} from './quickpose-threshold-counter';

describe('QuickPoseThresholdCounter', () => {
  it('does not count until the value exits after entering the bottom', () => {
    const counter = new QuickPoseThresholdCounter();

    expect(counter.count(0.2).count).toBe(0);
    expect(counter.count(0.85).type).toBe('poseEntered');
    expect(counter.count(0.85).count).toBe(0);
    expect(counter.count(0.2).type).toBe('poseComplete');
    expect(counter.count(0.2).count).toBe(1);
  });

  it('ignores half-reps that never reach the enter threshold', () => {
    const counter = new QuickPoseThresholdCounter();

    counter.count(0.7);
    counter.count(0.2);

    expect(counter.state.count).toBe(0);
  });

  it('lets push-ups enter at 0.7 while still ignoring a 0.65 dip', () => {
    const counter = new QuickPoseThresholdCounter({
      enterThreshold: QUICKPOSE_PUSHUP_ENTER_THRESHOLD,
      exitThreshold: QUICKPOSE_PUSHUP_EXIT_THRESHOLD,
    });

    counter.count(0.65);
    counter.count(0.2);
    expect(counter.state.count).toBe(0);

    expect(counter.count(0.72).type).toBe('poseEntered');
    expect(counter.count(0.2).count).toBe(1);
  });

  it('completes a push-up when lock-out drops just under 0.35, not at 0.40', () => {
    const counter = new QuickPoseThresholdCounter({
      enterThreshold: QUICKPOSE_PUSHUP_ENTER_THRESHOLD,
      exitThreshold: QUICKPOSE_PUSHUP_EXIT_THRESHOLD,
    });

    expect(counter.count(0.75).type).toBe('poseEntered');
    expect(counter.count(0.4).count).toBe(0);
    expect(counter.state.isEntered).toBe(true);
    expect(counter.count(0.34).type).toBe('poseComplete');
    expect(counter.state.count).toBe(1);
  });

  it('blocks a second complete inside the min interval', () => {
    const counter = new QuickPoseThresholdCounter({
      minIntervalMs: QUICKPOSE_MIN_REP_INTERVAL_MS,
    });
    const t0 = 1_000;

    counter.count(0.9, t0);
    expect(counter.count(0.2, t0 + 10).count).toBe(1);

    counter.count(0.9, t0 + 50);
    expect(counter.count(0.2, t0 + 100).count).toBe(1);
    expect(counter.state.isEntered).toBe(true);

    expect(counter.count(0.2, t0 + QUICKPOSE_MIN_REP_INTERVAL_MS + 20).count).toBe(2);
  });
});
