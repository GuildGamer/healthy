import {
  challengeGoal,
  clampGoal,
  goalLabel,
  goalPatch,
  goalProgressLabel,
} from './challenge-goal';
import {
  catalogChallenge,
  PUSHUPS_TWENTY,
  SELF_REPORT,
  WALK_TEN,
} from './testing/catalog-fixtures';

describe('challengeGoal', () => {
  it('lets a walker change their minutes, from five to two hours', () => {
    const walk = challengeGoal(catalogChallenge({ challengeId: 'walk', capture: WALK_TEN }));

    expect(walk).toMatchObject({ amount: 10, field: 'targetDurationMinutes' });
    expect(walk && goalLabel(walk)).toBe('10 minutes');
    expect(walk?.editor).toMatchObject({
      title: 'Your walk goal',
      range: { min: 5, max: 120, quickPicks: [10, 15, 20, 30] },
    });
  });

  it('lets push-ups change their count', () => {
    const pushups = challengeGoal(
      catalogChallenge({ challengeId: 'push', capture: PUSHUPS_TWENTY }),
    );

    expect(pushups).toMatchObject({ amount: 20, field: 'targetCount' });
    expect(pushups && goalLabel(pushups)).toBe('20 push-ups');
    expect(pushups?.editor?.range).toMatchObject({ min: 1, max: 100 });
  });

  it('has no goal for a tap or for water, whose glasses are set elsewhere', () => {
    expect(
      challengeGoal(catalogChallenge({ challengeId: 'meds', capture: SELF_REPORT })),
    ).toBeNull();
    expect(
      challengeGoal(
        catalogChallenge({
          challengeId: 'water',
          completionKind: 'water',
          capture: { ...SELF_REPORT, target: { ...SELF_REPORT.target, count: 8 } },
        }),
      ),
    ).toBeNull();
  });

  it('never shows more measured than the goal, and keeps a goal in range', () => {
    const walk = challengeGoal(catalogChallenge({ challengeId: 'walk', capture: WALK_TEN }));

    expect(walk && goalProgressLabel(14, walk)).toBe('10 of 10 min');
    expect(walk?.editor && clampGoal(2, walk.editor.range)).toBe(5);
    expect(walk?.editor && clampGoal(250, walk.editor.range)).toBe(120);
  });

  it('saves into the field that goal lives in', () => {
    expect(goalPatch('targetCount', 30)).toEqual({ targetCount: 30 });
    expect(goalPatch('targetDurationMinutes', 25)).toEqual({ targetDurationMinutes: 25 });
  });
});
