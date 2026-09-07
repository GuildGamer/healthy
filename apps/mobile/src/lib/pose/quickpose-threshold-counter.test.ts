import { QuickPoseThresholdCounter } from './quickpose-threshold-counter';

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
});
