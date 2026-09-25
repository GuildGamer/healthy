import { describe, expect, it } from 'vitest';
import {
  displayChallengeTitle,
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

  it('leaves other challenges as stored', () => {
    expect(
      displayChallengeTitle({
        title: 'Take your preventer inhaler',
        metric: null,
        count: null,
      }),
    ).toBe('Take your preventer inhaler');
  });
});
