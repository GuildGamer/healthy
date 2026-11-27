import { userFacingPoseError } from './user-facing-pose-error';

describe('userFacingPoseError', () => {
  it('hides raw native error text', () => {
    const message = userFacingPoseError(
      'Cannot get hybrid property — `this` does not have a NativeState!',
    );

    expect(message).not.toContain('NativeState');
    expect(message).toContain('native error');
  });

  it('passes through short actionable messages', () => {
    expect(userFacingPoseError('Camera permission denied')).toBe('Camera permission denied');
  });

  it('truncates long native messages instead of a generic pause line', () => {
    const long = 'A'.repeat(140);
    expect(userFacingPoseError(long)).toBe(`${'A'.repeat(100)}…`);
  });
});
