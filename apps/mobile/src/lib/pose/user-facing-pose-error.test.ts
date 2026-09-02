import { userFacingPoseError } from './user-facing-pose-error';

describe('userFacingPoseError', () => {
  it('hides Nitro/TFLite native error text', () => {
    const message = userFacingPoseError(
      'Cannot get hybrid property `HybridTfliteModelSpec.outputs` - `this` does not have a NativeState!',
    );

    expect(message).not.toContain('HybridTflite');
    expect(message).toContain('native error');
  });

  it('passes through short actionable messages', () => {
    expect(userFacingPoseError('Camera permission denied')).toBe(
      'Camera permission denied',
    );
  });

  it('maps Thunder tensor size errors without exposing byte counts', () => {
    expect(
      userFacingPoseError('MoveNet input must be 196608 bytes, got 100'),
    ).toBe('Camera frame could not be prepared for pose detection.');
  });

  it('truncates long native messages instead of a generic pause line', () => {
    const long = 'A'.repeat(140);
    expect(userFacingPoseError(long)).toBe(`${'A'.repeat(100)}…`);
  });
});
