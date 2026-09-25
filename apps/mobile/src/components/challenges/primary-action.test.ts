import { primaryActionLabel } from './primary-action';

describe('primaryActionLabel', () => {
  it('names the next designed step for each status', () => {
    expect(
      primaryActionLabel({ status: 'pending', completionKind: 'check_in' }),
    ).toBe('Log');
    expect(
      primaryActionLabel({
        status: 'in_progress',
        completionKind: 'check_in',
      }),
    ).toBe('Confirm');
    expect(
      primaryActionLabel({
        status: 'in_progress',
        completionKind: 'vitals_bp',
      }),
    ).toBe('Resume log');
    expect(
      primaryActionLabel({
        status: 'in_progress',
        completionKind: 'evidence_photo',
      }),
    ).toBe('Take selfie');
    expect(
      primaryActionLabel({
        status: 'awaiting_evidence',
        completionKind: 'check_in',
      }),
    ).toBe('Submit photo');
    expect(
      primaryActionLabel({ status: 'completed', completionKind: 'vitals_bp' }),
    ).toBe('Done');
    expect(
      primaryActionLabel({
        status: 'pending',
        completionKind: 'check_in',
        capture: { kind: 'device_session' },
      }),
    ).toBe('Start');
    expect(
      primaryActionLabel({
        status: 'in_progress',
        completionKind: 'check_in',
        capture: { kind: 'device_session' },
      }),
    ).toBe('Resume');
    expect(
      primaryActionLabel({
        status: 'pending',
        completionKind: 'check_in',
        capture: { kind: 'device_session', metric: 'pushups' },
      }),
    ).toBe('Start push-ups');
  });

  it('invites another set on a finished push-up challenge', () => {
    expect(
      primaryActionLabel({
        status: 'completed',
        completionKind: 'check_in',
        capture: { kind: 'device_session', metric: 'pushups' },
      }),
    ).toBe('Push-ups again');
  });

  it('hides the button when today has no occurrence', () => {
    expect(primaryActionLabel(undefined)).toBeNull();
  });
});
