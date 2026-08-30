import { completionRoute } from './completion-route';

describe('completionRoute', () => {
  it('opens the log screen for a blood-pressure challenge that is still open', () => {
    expect(
      completionRoute({
        challengeId: 'c-bp',
        status: 'pending',
        completionKind: 'vitals_bp',
      }),
    ).toBe('/challenge/c-bp/log');
  });

  it('opens the evidence screen for a gym challenge', () => {
    expect(
      completionRoute({
        challengeId: 'c-gym',
        status: 'in_progress',
        completionKind: 'evidence_photo',
      }),
    ).toBe('/challenge/c-gym/evidence');
  });

  it('opens the confirm screen for a check-in', () => {
    expect(
      completionRoute({
        challengeId: 'c-walk',
        status: 'pending',
        completionKind: 'check_in',
      }),
    ).toBe('/challenge/c-walk/confirm');
  });

  it('opens the session screen for a walk or step challenge', () => {
    expect(
      completionRoute({
        challengeId: 'c-walk',
        status: 'pending',
        completionKind: 'check_in',
        capture: {
          kind: 'device_session',
        },
      }),
    ).toBe('/challenge/c-walk/session');
    expect(
      completionRoute({
        challengeId: 'c-steps',
        status: 'in_progress',
        completionKind: 'check_in',
        capture: {
          kind: 'device_sample',
        },
      }),
    ).toBe('/challenge/c-steps/session');
  });

  it('opens the photo check when a surprise window is open', () => {
    expect(
      completionRoute({
        challengeId: 'c-walk',
        status: 'awaiting_evidence',
        completionKind: 'check_in',
      }),
    ).toBe('/challenge/c-walk/verify');
  });
});
