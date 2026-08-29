import { completionRoute } from './completion-route';

describe('completionRoute', () => {
  it('opens the log screen only for an in-progress blood-pressure challenge', () => {
    expect(
      completionRoute({
        challengeId: 'c-bp',
        status: 'in_progress',
        completionKind: 'vitals_bp',
      }),
    ).toBe('/challenge/c-bp/log');
  });

  it('leaves Start and check-in Finish on the card', () => {
    expect(
      completionRoute({
        challengeId: 'c-bp',
        status: 'pending',
        completionKind: 'vitals_bp',
      }),
    ).toBeNull();
    expect(
      completionRoute({
        challengeId: 'c-walk',
        status: 'in_progress',
        completionKind: 'check_in',
      }),
    ).toBeNull();
  });
});
