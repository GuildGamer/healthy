import { describe, expect, it } from 'vitest';
import {
  displayChallengeTitle,
  formatPoseChallengeTitle,
  formatPushupChallengeTitle,
} from './challenge-title';

describe('formatPushupChallengeTitle', () => {
  it('uses a singular noun for one rep', () => {
    expect(formatPushupChallengeTitle(1)).toBe('Do 1 push-up');
  });

  it('follows the configured count', () => {
    expect(formatPushupChallengeTitle(19)).toBe('Do 19 push-ups');
  });

  it('reads the same at the top of the range', () => {
    expect(formatPushupChallengeTitle(100)).toBe('Do 100 push-ups');
  });
});

describe('formatPoseChallengeTitle', () => {
  it('names each countable pose metric', () => {
    expect(formatPoseChallengeTitle('squats', 50)).toBe('Do 50 squats');
    expect(formatPoseChallengeTitle('squats', 1)).toBe('Do 1 squat');
    expect(formatPoseChallengeTitle('burpees', 10)).toBe('Do 10 burpees');
    expect(formatPoseChallengeTitle('sit_ups', 1)).toBe('Do 1 sit-up');
  });
});

describe('displayChallengeTitle', () => {
  it('rewrites a push-up catalog title from the live target', () => {
    expect(
      displayChallengeTitle({
        title: 'Do 20 push-ups',
        metric: 'pushups',
        count: 12,
      }),
    ).toBe('Do 12 push-ups');
  });

  it('rewrites squat and other rep pose titles from the live target', () => {
    expect(
      displayChallengeTitle({
        title: 'Do 20 squats',
        metric: 'squats',
        count: 50,
      }),
    ).toBe('Do 50 squats');
    expect(
      displayChallengeTitle({
        title: 'Do 10 lunges',
        metric: 'lunges',
        count: 20,
      }),
    ).toBe('Do 20 lunges');
  });

  it('leaves hold metrics and non-pose challenges as stored', () => {
    expect(
      displayChallengeTitle({
        title: 'Hold a plank',
        metric: 'plank',
        count: 60,
      }),
    ).toBe('Hold a plank');
    expect(
      displayChallengeTitle({
        title: 'Take your preventer inhaler',
        metric: null,
        count: null,
      }),
    ).toBe('Take your preventer inhaler');
  });
});
