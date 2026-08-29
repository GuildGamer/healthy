import { primaryActionLabel } from './primary-action';

describe('primaryActionLabel', () => {
  it('names the next designed step for each status', () => {
    expect(
      primaryActionLabel({ status: 'pending', completionKind: 'check_in' }),
    ).toBe('Start now');
    expect(
      primaryActionLabel({
        status: 'in_progress',
        completionKind: 'check_in',
      }),
    ).toBe('Finish');
    expect(
      primaryActionLabel({
        status: 'in_progress',
        completionKind: 'vitals_bp',
      }),
    ).toBe('Log reading');
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
  });

  it('hides the button when today has no occurrence', () => {
    expect(primaryActionLabel(undefined)).toBeNull();
  });
});
