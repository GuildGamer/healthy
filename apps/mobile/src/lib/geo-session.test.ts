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
    expect(formatDistance(250)).toBe('0.25 km');
    expect(formatDistance(1_250)).toBe('1.25 km');
  });

  // The walker watches one number for the whole walk. Swapping its unit under
  // it reads as a readout that cannot make up its mind.
  it('keeps the unit fixed from the first stride to the last', () => {
    expect(formatDistance(0)).toBe('0.00 km');
    expect(formatDistance(0.8)).toBe('0.00 km');
    expect(formatDistance(123.4)).toBe('0.12 km');
    expect(formatDistance(9_999)).toBe('10.00 km');
  });

  it('keeps sub-metre detail in the total so short walks still register', () => {
    const points = [
      { latitude: 51.5074, longitude: -0.1278, recordedAt: 0 },
      { latitude: 51.50741, longitude: -0.1278, recordedAt: 1 },
    ];

    const metres = pathDistanceMeters(points);

    expect(metres).toBeGreaterThan(0);
    expect(metres).toBeLessThan(2);
    expect(Number.isInteger(metres)).toBe(false);
  });
});
