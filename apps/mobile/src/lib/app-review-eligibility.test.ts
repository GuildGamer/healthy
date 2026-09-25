import {
  APP_REVIEW_COOLDOWN_DAYS,
  evaluateAppReviewEligibility,
  type AppReviewEligibilityInput,
} from './app-review-eligibility';
import type { AppReviewState } from './app-review-store';

const NOW = new Date('2026-09-20T12:00:00.000Z');

function base(
  overrides: Partial<AppReviewEligibilityInput> = {},
): AppReviewEligibilityInput {
  return {
    now: NOW,
    dayKey: '2026-09-20',
    winLocked: true,
    completedCountToday: 3,
    currentStreakDays: 3,
    wasPenalized: false,
    membershipCtaShownThisSession: false,
    promptAttemptedThisSession: false,
    state: null,
    ...overrides,
  };
}

function state(overrides: Partial<AppReviewState> = {}): AppReviewState {
  return {
    lastPromptedAt: '2026-01-01T00:00:00.000Z',
    lastPromptDayKey: null,
    lastPromptedStreakMilestone: null,
    ...overrides,
  };
}

describe('evaluateAppReviewEligibility', () => {
  it('allows a daily win lock with enough usage', () => {
    expect(evaluateAppReviewEligibility(base())).toEqual({
      eligible: true,
      reason: 'win_locked',
      streakMilestone: null,
    });
  });

  it('allows a streak milestone when the win is not locked', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          winLocked: false,
          completedCountToday: 1,
          currentStreakDays: 7,
        }),
      ),
    ).toEqual({
      eligible: true,
      reason: 'streak_milestone',
      streakMilestone: 7,
    });
  });

  it('prefers win lock over streak when both apply', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          winLocked: true,
          currentStreakDays: 14,
        }),
      ),
    ).toEqual({
      eligible: true,
      reason: 'win_locked',
      streakMilestone: null,
    });
  });

  it('blocks the first check-in before minimum usage', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          winLocked: false,
          completedCountToday: 1,
          currentStreakDays: 1,
        }),
      ),
    ).toEqual({ eligible: false, reason: 'minimum_usage' });
  });

  // The free tier locks its win at two challenges, so a third completion is a
  // bar the people who reach the win most often can never clear.
  it('accepts a locked win as enough of a day on its own', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          winLocked: true,
          completedCountToday: 2,
          currentStreakDays: 1,
        }),
      ),
    ).toEqual({
      eligible: true,
      reason: 'win_locked',
      streakMilestone: null,
    });
  });

  it('allows a three-day streak with a single completion today', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          completedCountToday: 1,
          currentStreakDays: 3,
          winLocked: false,
        }),
      ),
    ).toEqual({
      eligible: true,
      reason: 'streak_milestone',
      streakMilestone: 3,
    });
  });

  it('blocks a photo-check penalty path', () => {
    expect(
      evaluateAppReviewEligibility(base({ wasPenalized: true })),
    ).toEqual({ eligible: false, reason: 'penalty' });
  });

  it('blocks the same session as a membership CTA', () => {
    expect(
      evaluateAppReviewEligibility(
        base({ membershipCtaShownThisSession: true }),
      ),
    ).toEqual({ eligible: false, reason: 'membership_cta_same_session' });
  });

  it('blocks a second attempt in the same session', () => {
    expect(
      evaluateAppReviewEligibility(
        base({ promptAttemptedThisSession: true }),
      ),
    ).toEqual({ eligible: false, reason: 'already_attempted_this_session' });
  });

  it('blocks when there is no win lock and no streak milestone', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          winLocked: false,
          currentStreakDays: 5,
        }),
      ),
    ).toEqual({ eligible: false, reason: 'no_trigger' });
  });

  it(`blocks within the ${APP_REVIEW_COOLDOWN_DAYS}-day cooldown`, () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          state: state({
            lastPromptedAt: '2026-08-01T00:00:00.000Z',
          }),
        }),
      ),
    ).toEqual({ eligible: false, reason: 'cooldown' });
  });

  it('allows after the cooldown has elapsed', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          state: state({
            lastPromptedAt: '2026-05-01T00:00:00.000Z',
          }),
        }),
      ),
    ).toEqual({
      eligible: true,
      reason: 'win_locked',
      streakMilestone: null,
    });
  });

  it('blocks a second prompt for the same day key', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          state: state({
            lastPromptedAt: '2026-05-01T00:00:00.000Z',
            lastPromptDayKey: '2026-09-20',
          }),
        }),
      ),
    ).toEqual({ eligible: false, reason: 'already_prompted_day_key' });
  });

  it('blocks a second prompt for the same streak milestone', () => {
    expect(
      evaluateAppReviewEligibility(
        base({
          winLocked: false,
          currentStreakDays: 7,
          state: state({
            lastPromptedAt: '2026-05-01T00:00:00.000Z',
            lastPromptedStreakMilestone: 7,
          }),
        }),
      ),
    ).toEqual({
      eligible: false,
      reason: 'already_prompted_streak_milestone',
    });
  });
});
