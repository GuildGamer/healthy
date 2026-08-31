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

  it('accepts an on-device push-up count that meets the target', () => {
    expect(
      requireDeviceActivityFor(
        {
          kind: 'device_session',
          metric: 'pushups',
          target: { durationMinutes: null, distanceMeters: null, count: 20 },
        },
        {
          source: 'in_app_pose',
          metric: 'pushups',
          count: 20,
          durationSeconds: 45,
        },
      ),
    ).toMatchObject({ source: 'in_app_pose', count: 20 });
  });

  it('rejects a manual confirm for push-ups', () => {
    expect(() =>
      requireDeviceActivityFor(
        {
          kind: 'device_session',
          metric: 'pushups',
          target: { durationMinutes: null, distanceMeters: null, count: 20 },
        },
        { source: 'manual', metric: 'pushups', count: 20 },
      ),
    ).toThrow(ORPCError);
  });

  it('rejects a short push-up set', () => {
    expect(() =>
      requireDeviceActivityFor(
        {
          kind: 'device_session',
          metric: 'pushups',
          target: { durationMinutes: null, distanceMeters: null, count: 20 },
        },
        {
          source: 'in_app_pose',
          metric: 'pushups',
          count: 12,
        },
      ),
    ).toThrow(ORPCError);
  });
});
