import type { ChallengeTarget } from '@product/contract/challenge-capture';
import {
  walkProgressRatio,
  walkReadout,
  walkSecondaryStat,
  walkShortfall,
} from './walk-session-progress';

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

describe('walkReadout', () => {
  it('pairs elapsed time with the duration goal', () => {
    expect(
      walkReadout({ elapsedSeconds: 134, distanceMeters: 180 }, tenMinuteWalk),
    ).toBe('02:14 / 10:00');
  });

  it('pairs covered distance with the distance goal', () => {
    expect(
      walkReadout(
        { elapsedSeconds: 134, distanceMeters: 180 },
        twoKilometreWalk,
      ),
    ).toBe('0.18 km / 2.00 km');
  });

  it('shows both readouts when a challenge sets both goals', () => {
    expect(
      walkReadout(
        { elapsedSeconds: 134, distanceMeters: 180 },
        timedAndMeasuredWalk,
      ),
    ).toBe('02:14 / 10:00  ·  0.18 km / 2.00 km');
  });

  it('falls back to bare elapsed time when nothing is targeted', () => {
    expect(
      walkReadout({ elapsedSeconds: 134, distanceMeters: 180 }, noTarget),
    ).toBe('02:14');
  });
});

describe('walkProgressRatio', () => {
  it('tracks progress toward the duration goal', () => {
    expect(
      walkProgressRatio(
        { elapsedSeconds: 300, distanceMeters: 0 },
        tenMinuteWalk,
      ),
    ).toBe(0.5);
  });

  it('reports the worst-off goal when a challenge sets both', () => {
    expect(
      walkProgressRatio(
        { elapsedSeconds: 600, distanceMeters: 500 },
        timedAndMeasuredWalk,
      ),
    ).toBe(0.25);
  });

  it('clamps an overshoot to a full bar', () => {
    expect(
      walkProgressRatio(
        { elapsedSeconds: 900, distanceMeters: 0 },
        tenMinuteWalk,
      ),
    ).toBe(1);
  });

  it('has no bar to draw when nothing is targeted', () => {
    expect(
      walkProgressRatio({ elapsedSeconds: 134, distanceMeters: 180 }, noTarget),
    ).toBeNull();
  });
});

describe('walkSecondaryStat', () => {
  it('shows covered distance when the goal is a duration', () => {
    expect(
      walkSecondaryStat(
        { elapsedSeconds: 134, distanceMeters: 180 },
        tenMinuteWalk,
      ),
    ).toBe('0.18 km');
  });

  it('shows elapsed time when the goal is a distance', () => {
    expect(
      walkSecondaryStat(
        { elapsedSeconds: 134, distanceMeters: 180 },
        twoKilometreWalk,
      ),
    ).toBe('02:14');
  });

  it('stays empty when the goal already reports both', () => {
    expect(
      walkSecondaryStat(
        { elapsedSeconds: 134, distanceMeters: 180 },
        timedAndMeasuredWalk,
      ),
    ).toBeNull();
  });

  it('shows distance alongside the bare clock of an untargeted walk', () => {
    expect(
      walkSecondaryStat({ elapsedSeconds: 134, distanceMeters: 180 }, noTarget),
    ).toBe('0.18 km');
  });
});

describe('walkShortfall', () => {
  it('names the time still owed', () => {
    expect(
      walkShortfall({ elapsedSeconds: 134, distanceMeters: 0 }, tenMinuteWalk),
    ).toBe('07:46 more to finish');
  });

  it('names every unmet goal', () => {
    expect(
      walkShortfall(
        { elapsedSeconds: 134, distanceMeters: 180 },
        timedAndMeasuredWalk,
      ),
    ).toBe('07:46 more and 1.82 km more to finish');
  });

  it('stays quiet once a short walk clears an untargeted challenge', () => {
    expect(
      walkShortfall({ elapsedSeconds: 12, distanceMeters: 3 }, noTarget),
    ).toBeNull();
  });

  it('stays quiet once the goal is met', () => {
    expect(
      walkShortfall({ elapsedSeconds: 600, distanceMeters: 0 }, tenMinuteWalk),
    ).toBeNull();
  });
});