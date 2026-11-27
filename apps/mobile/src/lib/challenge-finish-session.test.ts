import type { TodayChallenge } from '@product/client';
import {
  CHALLENGE_FINISH_MAX_AGE_MS,
  announceChallengeFinish,
  subscribeToChallengeFinish,
  takeChallengeFinish,
} from './challenge-finish-session';

const challenge = { id: 'uc1', challengeId: 'c1', title: 'Stretch' } as TodayChallenge;

describe('challenge finish handoff', () => {
  afterEach(() => {
    takeChallengeFinish();
  });

  it('hands a finish over once', () => {
    announceChallengeFinish({
      challenge,
      outcome: { kind: 'checkedIn' },
      pointsAwarded: 100,
      penaltyApplied: 0,
      currentStreakDays: 0,
    });

    expect(takeChallengeFinish()?.pointsAwarded).toBe(100);
    expect(takeChallengeFinish()).toBeNull();
  });

  it('drops a finish nobody came back for in time', () => {
    announceChallengeFinish({
      challenge,
      outcome: { kind: 'checkedIn' },
      pointsAwarded: 100,
      penaltyApplied: 0,
      currentStreakDays: 0,
    });

    expect(takeChallengeFinish(Date.now() + CHALLENGE_FINISH_MAX_AGE_MS + 1)).toBeNull();
  });

  it('tells a listening screen as soon as something finishes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToChallengeFinish(listener);

    announceChallengeFinish({
      challenge,
      outcome: { kind: 'photo' },
      pointsAwarded: 0,
      penaltyApplied: 0,
      currentStreakDays: 0,
    });
    unsubscribe();
    announceChallengeFinish({
      challenge,
      outcome: { kind: 'photo' },
      pointsAwarded: 0,
      penaltyApplied: 0,
      currentStreakDays: 0,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
