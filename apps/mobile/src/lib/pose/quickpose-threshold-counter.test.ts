import {
  QUICKPOSE_DEAD_ZONE_ABANDON_MS,
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

  it('lets push-ups complete when lock-out only reaches the push-up exit', () => {
    const counter = new QuickPoseThresholdCounter({
      enterThreshold: QUICKPOSE_PUSHUP_ENTER_THRESHOLD,
      exitThreshold: QUICKPOSE_PUSHUP_EXIT_THRESHOLD,
    });

    counter.count(0.85);
    // Global exit is 0.3; push-up exit 0.45 lets a compressed lock-out at 0.42 finish.
    expect(counter.count(0.42).count).toBe(1);
    expect(counter.state.type).toBe('poseComplete');
  });

  it('abandons a half-rep stuck in the dead zone so the next cycle can count', () => {
    const counter = new QuickPoseThresholdCounter({
      enterThreshold: QUICKPOSE_PUSHUP_ENTER_THRESHOLD,
      exitThreshold: QUICKPOSE_PUSHUP_EXIT_THRESHOLD,
      deadZoneAbandonMs: QUICKPOSE_DEAD_ZONE_ABANDON_MS,
    });
    const t0 = 1_000;

    expect(counter.count(0.85, t0).type).toBe('poseEntered');
    expect(counter.count(0.45, t0 + 100).type).toBe('poseEntered');
    expect(counter.count(0.45, t0 + QUICKPOSE_DEAD_ZONE_ABANDON_MS).type).toBe('poseEntered');
    expect(counter.count(0.45, t0 + QUICKPOSE_DEAD_ZONE_ABANDON_MS + 100).type).toBe(
      'poseComplete',
    );
    expect(counter.state.count).toBe(0);

    expect(counter.count(0.85, t0 + QUICKPOSE_DEAD_ZONE_ABANDON_MS + 200).type).toBe(
      'poseEntered',
    );
    expect(counter.count(0.2, t0 + QUICKPOSE_DEAD_ZONE_ABANDON_MS + 400).count).toBe(1);
  });

  it('does not abandon while still deep past the enter threshold', () => {
    const counter = new QuickPoseThresholdCounter({
      enterThreshold: QUICKPOSE_PUSHUP_ENTER_THRESHOLD,
      exitThreshold: QUICKPOSE_PUSHUP_EXIT_THRESHOLD,
      deadZoneAbandonMs: QUICKPOSE_DEAD_ZONE_ABANDON_MS,
    });
    const t0 = 1_000;

    counter.count(0.85, t0);
    expect(counter.count(0.9, t0 + QUICKPOSE_DEAD_ZONE_ABANDON_MS + 500).type).toBe(
      'poseEntered',
    );
    expect(counter.count(0.2, t0 + QUICKPOSE_DEAD_ZONE_ABANDON_MS + 600).count).toBe(1);
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
