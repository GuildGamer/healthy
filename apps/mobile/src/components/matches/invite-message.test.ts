import { inviteShareMessage } from './invite-message';

describe('inviteShareMessage', () => {
  const now = new Date('2026-10-25T12:00:00.000Z');

  it('includes the score and a competitive challenge', () => {
    expect(
      inviteShareMessage(
        {
          hostScore: 40,
          metric: 'pushups',
          scoringMode: 'best_single',
          endsAt: '2026-10-26T23:59:59.000Z',
        },
        now,
      ),
    ).toBe(
      'I did 40 push-ups. Think you can beat me? Most push-ups in one go wins by tonight.',
    );
  });

  it('handles a contest with no score yet', () => {
    expect(
      inviteShareMessage(
        {
          hostScore: null,
          metric: 'pushups',
          scoringMode: 'cumulative_total',
        },
        now,
      ),
    ).toBe(
      'I just started a push-up contest. Think you can beat me? Most push-ups wins.',
    );
  });

  it('names walking contests in minutes', () => {
    expect(
      inviteShareMessage(
        {
          hostScore: 30,
          metric: 'walk',
          scoringMode: 'cumulative_total',
        },
        now,
      ),
    ).toBe(
      'I did 30 minutes. Think you can beat me? Most minutes walked wins.',
    );
  });
});
