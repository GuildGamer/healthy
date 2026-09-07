import { describe, expect, it } from 'vitest';
import {
  countInWords,
  displayChallengeTitle,
  formatPushupChallengeTitle,
} from './challenge-title';

describe('countInWords', () => {
  it('names the counts a member can set on push-ups', () => {
    expect(countInWords(1)).toBe('one');
    expect(countInWords(12)).toBe('twelve');
    expect(countInWords(20)).toBe('twenty');
    expect(countInWords(21)).toBe('twenty-one');
    expect(countInWords(100)).toBe('one hundred');
  });
});

describe('formatPushupChallengeTitle', () => {
  it('uses a singular noun for one rep', () => {
    expect(formatPushupChallengeTitle(1)).toBe('Do one push-up');
  });

  it('follows the configured count', () => {
    expect(formatPushupChallengeTitle(19)).toBe('Do nineteen push-ups');
  });
});

describe('displayChallengeTitle', () => {
  it('rewrites a push-up catalog title from the live target', () => {
    expect(
      displayChallengeTitle({
        title: 'Do twenty push-ups',
        metric: 'pushups',
        count: 12,
      }),
    ).toBe('Do twelve push-ups');
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
