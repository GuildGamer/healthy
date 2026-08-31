import { describe, expect, it } from '@jest/globals';
import {
  formatDistance,
  formatDuration,
  haversineMeters,
  pathDistanceMeters,
} from './geo-session';

describe('geo-session', () => {
  it('measures a short city block in metres', () => {
    const metres = haversineMeters(
      { latitude: 51.5074, longitude: -0.1278, recordedAt: 0 },
      { latitude: 51.5084, longitude: -0.1278, recordedAt: 1 },
    );

    expect(metres).toBeGreaterThan(100);
    expect(metres).toBeLessThan(130);
  });

  it('sums a path and formats clock time', () => {
    const points = [
      { latitude: 51.5074, longitude: -0.1278, recordedAt: 0 },
      { latitude: 51.5084, longitude: -0.1278, recordedAt: 1 },
      { latitude: 51.5084, longitude: -0.1268, recordedAt: 2 },
    ];

    expect(pathDistanceMeters(points)).toBeGreaterThan(150);
    expect(formatDuration(75)).toBe('01:15');
    expect(formatDistance(250)).toBe('250 m');
    expect(formatDistance(1_250)).toBe('1.25 km');
  });
});
