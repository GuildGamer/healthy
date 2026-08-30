import { ORPCError } from '@orpc/server';
import { describe, expect, it } from 'vitest';
import { requireDeviceActivityFor } from './device-activity.js';

const walkCapture = {
  kind: 'device_session' as const,
  metric: 'walk' as const,
  target: { durationMinutes: 10, distanceMeters: null, count: null },
};

describe('requireDeviceActivityFor', () => {
  it('allows a manual confirm without a device payload', () => {
    expect(requireDeviceActivityFor(walkCapture, undefined)).toBeNull();
  });

  it('accepts a GPS walk that meets the duration', () => {
    expect(
      requireDeviceActivityFor(walkCapture, {
        source: 'in_app_gps',
        metric: 'walk',
        durationSeconds: 720,
        distanceMeters: 800,
      }),
    ).toMatchObject({ source: 'in_app_gps', durationSeconds: 720 });
  });

  it('rejects a walk that is too short', () => {
    expect(() =>
      requireDeviceActivityFor(walkCapture, {
        source: 'healthkit',
        metric: 'walk',
        durationSeconds: 120,
      }),
    ).toThrow(ORPCError);
  });

  it('rejects a device payload on a self-report challenge', () => {
    expect(() =>
      requireDeviceActivityFor(
        {
          kind: 'self_report',
          metric: null,
          target: { durationMinutes: null, distanceMeters: null, count: null },
        },
        { source: 'manual', metric: 'walk' },
      ),
    ).toThrow(ORPCError);
  });
});
