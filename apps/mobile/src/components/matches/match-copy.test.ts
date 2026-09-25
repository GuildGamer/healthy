import { matchSetupSummary } from './match-copy';

describe('matchSetupSummary', () => {
  it('names the length, the activity and the rule', () => {
    expect(
      matchSetupSummary(
        { kind: 'days', days: 7 },
        'cumulative_total',
        'walk',
        'any_challenge',
      ),
    ).toBe(
      'A 7-day walking contest. Every minute walked adds up. Most minutes when time runs out wins.',
    );
  });

  // The sentence is the only explanation left on the form, so a streak open to
  // everything must not read as a contest about one activity.
  it('names no activity for an open streak', () => {
    expect(
      matchSetupSummary(
        { kind: 'days', days: 30 },
        'days_completed',
        'pushups',
        'any_challenge',
      ),
    ).toBe(
      'A 30-day streak. One point for each day you finish a challenge. Most days wins.',
    );
  });

  it('names the activity a narrowed streak races', () => {
    expect(
      matchSetupSummary(
        { kind: 'days', days: 7 },
        'days_completed',
        'walk',
        'chosen_activity',
      ),
    ).toBe(
      'A 7-day walking streak. One point for each day you finish a walking challenge. Most days wins.',
    );
  });

  it('spells out the shortest contest rather than counting it', () => {
    expect(
      matchSetupSummary({ kind: 'today' }, 'best_single', 'pushups', 'any_challenge'),
    ).toBe(
      'A one-day push-up contest. Highest single set wins. The lead can change until time runs out.',
    );
  });
});
