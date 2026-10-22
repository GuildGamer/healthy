import type { ChallengeTarget } from '@product/contract/challenge-capture';
import { walkGoalLabel, walkHero, walkProgressRatio, walkShortfall } from './walk-session-progress';

const noTarget: ChallengeTarget = {
  durationMinutes: null,
  distanceMeters: null,
  count: null,
};

const tenMinuteWalk: ChallengeTarget = { ...noTarget, durationMinutes: 10 };
const twoKilometreWalk: ChallengeTarget = { ...noTarget, distanceMeters: 2_000 };
const timedAndMeasuredWalk: ChallengeTarget = {
  ...noTarget,
  durationMinutes: 10,
  distanceMeters: 2_000,
};

describe('walkProgressRatio', () => {
  it('tracks progress toward the duration goal', () => {
    expect(walkProgressRatio({ elapsedSeconds: 300, distanceMeters: 0 }, tenMinuteWalk)).toBe(0.5);
  });

  it('reports the worst-off goal when a challenge sets both', () => {
    expect(
      walkProgressRatio({ elapsedSeconds: 600, distanceMeters: 500 }, timedAndMeasuredWalk),
    ).toBe(0.25);
  });

  it('clamps an overshoot to a full bar', () => {
    expect(walkProgressRatio({ elapsedSeconds: 900, distanceMeters: 0 }, tenMinuteWalk)).toBe(1);
  });

  it('has no bar to draw when nothing is targeted', () => {
    expect(walkProgressRatio({ elapsedSeconds: 134, distanceMeters: 180 }, noTarget)).toBeNull();
  });
});

describe('walkShortfall', () => {
  it('names the time still owed', () => {
    expect(walkShortfall({ elapsedSeconds: 134, distanceMeters: 0 }, tenMinuteWalk)).toBe(
      '07:46 more to finish',
    );
  });

  it('names every unmet goal', () => {
    expect(walkShortfall({ elapsedSeconds: 134, distanceMeters: 180 }, timedAndMeasuredWalk)).toBe(
      '07:46 more and 1.82 km more to finish',
    );
  });

  it('stays quiet once a short walk clears an untargeted challenge', () => {
    expect(walkShortfall({ elapsedSeconds: 12, distanceMeters: 3 }, noTarget)).toBeNull();
  });

  it('stays quiet once the goal is met', () => {
    expect(walkShortfall({ elapsedSeconds: 600, distanceMeters: 0 }, tenMinuteWalk)).toBeNull();
  });
});

describe('walkHero', () => {
  it('puts the time first, as a watch shows it', () => {
    expect(walkHero({ elapsedSeconds: 252, distanceMeters: 380 }, tenMinuteWalk)).toEqual({
      value: '4:12',
      of: 'of 10:00',
    });
  });

  it('shows distance when only distance counts', () => {
    expect(walkHero({ elapsedSeconds: 252, distanceMeters: 380 }, twoKilometreWalk)).toEqual({
      value: '0.38',
      of: 'of 2.00 km',
    });
  });

  it('names the goal before the walk starts', () => {
    expect(walkGoalLabel(tenMinuteWalk)).toBe('Goal 10 min');
    expect(walkGoalLabel(noTarget)).toBeNull();
  });
});
