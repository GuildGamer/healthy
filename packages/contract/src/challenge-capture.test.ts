import { describe, expect, it } from 'vitest';
import {
  activityMeetsTarget,
  defaultCaptureKindFor,
  isDeviceCapture,
} from './challenge-capture';

describe('activityMeetsTarget', () => {
  it('accepts a walk that reaches the duration target', () => {
    expect(
      activityMeetsTarget(
        {
          source: 'in_app_gps',
          metric: 'walk',
          durationSeconds: 600,
        },
        { durationMinutes: 10, distanceMeters: null, count: null },
      ),
    ).toBe(true);
  });

  it('rejects a walk that is short of the duration target', () => {
    expect(
      activityMeetsTarget(
        {
          source: 'healthkit',
          metric: 'walk',
          durationSeconds: 540,
        },
        { durationMinutes: 10, distanceMeters: null, count: null },
      ),
    ).toBe(false);
  });

  it('accepts a step count at or above the target', () => {
    expect(
      activityMeetsTarget(
        { source: 'pedometer', metric: 'steps', count: 5_000 },
        { durationMinutes: null, distanceMeters: null, count: 5_000 },
      ),
    ).toBe(true);
  });

  it('lets a manual fallback skip the numeric target', () => {
    expect(
      activityMeetsTarget(
        { source: 'manual', metric: 'walk' },
        { durationMinutes: 10, distanceMeters: null, count: null },
      ),
    ).toBe(true);
  });
});

describe('defaultCaptureKindFor', () => {
  it('maps existing completion kinds onto capture kinds', () => {
    expect(defaultCaptureKindFor('check_in')).toBe('self_report');
    expect(defaultCaptureKindFor('vitals_bp')).toBe('structured_log');
    expect(defaultCaptureKindFor('evidence_photo')).toBe('photo');
  });
});

describe('isDeviceCapture', () => {
  it('is true only for device sample and session', () => {
    expect(isDeviceCapture('device_session')).toBe(true);
    expect(isDeviceCapture('device_sample')).toBe(true);
    expect(isDeviceCapture('self_report')).toBe(false);
  });
});
