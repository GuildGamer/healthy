import { reminderLabel, suggestedMoment } from './reminder-moments';
import { catalogChallenge, PUSHUPS_TWENTY, WALK_TEN } from './testing/catalog-fixtures';

describe('reminder moments', () => {
  it('names a time by its moment when it is one', () => {
    expect(reminderLabel(750)).toBe('After lunch, 12:30');
    expect(reminderLabel(1085)).toBe('18:05');
  });

  it('suggests the moment that suits the challenge', () => {
    expect(suggestedMoment(catalogChallenge({ challengeId: 'walk', capture: WALK_TEN })).id).toBe(
      'afterLunch',
    );
    expect(
      suggestedMoment(catalogChallenge({ challengeId: 'push', capture: PUSHUPS_TWENTY })).id,
    ).toBe('evening');
    expect(
      suggestedMoment(
        catalogChallenge({ challengeId: 'meds', icon: 'pill', category: 'hypertension' }),
      ).id,
    ).toBe('morning');
    expect(
      suggestedMoment(
        catalogChallenge({
          challengeId: 'bp',
          completionKind: 'vitals_bp',
          category: 'hypertension',
        }),
      ).id,
    ).toBe('morning');
  });
});
