import { nextGoalLadderOffer } from './goal-ladder';

describe('nextGoalLadderOffer', () => {
  it('offers 8 after streak 3 at goal 5', () => {
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: 5, streakDays: 3 }),
    ).toEqual({ nextTarget: 8 });
  });

  it('offers 10 after streak 7 at goal 8', () => {
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: 8, streakDays: 7 }),
    ).toEqual({ nextTarget: 10 });
  });

  it('stays quiet off the exact streak gates', () => {
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: 5, streakDays: 4 }),
    ).toBeNull();
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: 8, streakDays: 3 }),
    ).toBeNull();
  });

  it('ignores custom goals and non-push-up metrics', () => {
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: 20, streakDays: 3 }),
    ).toBeNull();
    expect(
      nextGoalLadderOffer({ metric: 'walk', currentTarget: 5, streakDays: 3 }),
    ).toBeNull();
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: 10, streakDays: 7 }),
    ).toBeNull();
  });

  it('requires a current target', () => {
    expect(
      nextGoalLadderOffer({ metric: 'pushups', currentTarget: null, streakDays: 3 }),
    ).toBeNull();
  });
});
