import { describe, expect, it } from 'vitest';
import { moreOpenSuffix, pickLeadChallenge } from './pick-lead-challenge.js';

describe('pickLeadChallenge', () => {
  it('returns null when nothing is open', () => {
    expect(pickLeadChallenge([])).toBeNull();
  });

  it('prefers the challenge completed most in this local hour', () => {
    expect(
      pickLeadChallenge([
        {
          challengeId: 'hard',
          captureKind: 'device_session',
          rewardPoints: 50,
          completionsInLocalHour: 1,
        },
        {
          challengeId: 'easy',
          captureKind: 'self_report',
          rewardPoints: 10,
          completionsInLocalHour: 5,
        },
      ]),
    ).toBe('easy');
  });

  it('falls back to lowest effort then lower points', () => {
    expect(
      pickLeadChallenge([
        {
          challengeId: 'pose',
          captureKind: 'device_session',
          rewardPoints: 150,
          completionsInLocalHour: 0,
        },
        {
          challengeId: 'log',
          captureKind: 'structured_log',
          rewardPoints: 100,
          completionsInLocalHour: 0,
        },
        {
          challengeId: 'check',
          captureKind: 'self_report',
          rewardPoints: 50,
          completionsInLocalHour: 0,
        },
      ]),
    ).toBe('check');
  });

  it('breaks ties with a stable challenge id', () => {
    expect(
      pickLeadChallenge([
        {
          challengeId: 'b',
          captureKind: 'self_report',
          rewardPoints: 50,
          completionsInLocalHour: 0,
        },
        {
          challengeId: 'a',
          captureKind: 'self_report',
          rewardPoints: 50,
          completionsInLocalHour: 0,
        },
      ]),
    ).toBe('a');
  });
});

describe('moreOpenSuffix', () => {
  it('is empty for a single open challenge', () => {
    expect(moreOpenSuffix(1)).toBe('');
    expect(moreOpenSuffix(0)).toBe('');
  });

  it('counts the extras', () => {
    expect(moreOpenSuffix(3)).toBe(' (+2 more)');
  });
});
