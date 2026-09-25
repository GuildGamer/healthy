import {
  canPracticeAgain,
  practiceRoute,
  practiceTallyCopy,
} from './practice-entry';

const pushups = { kind: 'device_session', metric: 'pushups' } as const;

describe('canPracticeAgain', () => {
  it('opens once the daily push-up challenge is finished', () => {
    expect(canPracticeAgain({ status: 'completed', capture: pushups })).toBe(
      true,
    );
  });

  it('stays shut while the daily challenge is still winnable', () => {
    expect(canPracticeAgain({ status: 'pending', capture: pushups })).toBe(
      false,
    );
    expect(canPracticeAgain({ status: 'in_progress', capture: pushups })).toBe(
      false,
    );
  });

  it('is push-ups only, not every finished challenge', () => {
    expect(
      canPracticeAgain({
        status: 'completed',
        capture: { kind: 'device_session', metric: 'walk' },
      }),
    ).toBe(false);
    expect(canPracticeAgain({ status: 'completed' })).toBe(false);
  });

  it('handles a day with no occurrence at all', () => {
    expect(canPracticeAgain(null)).toBe(false);
    expect(canPracticeAgain(undefined)).toBe(false);
  });
});

describe('practiceRoute', () => {
  it('points at the practice screen for the challenge', () => {
    expect(practiceRoute('c-push')).toBe('/challenge/c-push/practice');
  });
});

describe('practiceTallyCopy', () => {
  it('stays silent on a day with no extra sets', () => {
    expect(practiceTallyCopy(undefined)).toBeNull();
    expect(practiceTallyCopy({ todayCount: 0, todaySessions: 0 })).toBeNull();
  });

  it('reads naturally for one set and for many', () => {
    expect(practiceTallyCopy({ todayCount: 1, todaySessions: 1 })).toBe(
      '1 rep in 1 extra set today',
    );
    expect(practiceTallyCopy({ todayCount: 24, todaySessions: 2 })).toBe(
      '24 reps in 2 extra sets today',
    );
  });
});
