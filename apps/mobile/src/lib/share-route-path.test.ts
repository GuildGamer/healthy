import { downsampleRoutePoints, fitRouteToViewBox, type ShareRoutePoint } from './share-route-path';

function point(latitude: number, longitude: number): ShareRoutePoint {
  return { latitude, longitude };
}

describe('downsampleRoutePoints', () => {
  it('returns a copy when under the cap', () => {
    const points = [point(51.5, -0.12), point(51.51, -0.11)];
    const result = downsampleRoutePoints(points, 100);

    expect(result).toEqual(points);
    expect(result).not.toBe(points);
  });

  it('returns empty for an empty route', () => {
    expect(downsampleRoutePoints([])).toEqual([]);
  });

  it('keeps the ends of a long polyline', () => {
    const points = Array.from({ length: 200 }, (_, index) => point(51 + index * 0.001, -0.1));
    const result = downsampleRoutePoints(points, 10);

    expect(result).toHaveLength(10);
    expect(result[0]).toEqual(points[0]);
    expect(result[result.length - 1]).toEqual(points[points.length - 1]);
  });
});

describe('fitRouteToViewBox', () => {
  it('returns null for fewer than two points', () => {
    expect(fitRouteToViewBox([], 300, 375, 40)).toBeNull();
    expect(fitRouteToViewBox([point(51.5, -0.12)], 300, 375, 40)).toBeNull();
  });

  it('returns null when both points are the same place', () => {
    expect(
      fitRouteToViewBox([point(51.5, -0.12), point(51.5, -0.12)], 300, 375, 40),
    ).toBeNull();
  });

  it('fits a simple line inside the padded viewBox', () => {
    const fitted = fitRouteToViewBox(
      [point(51.5, -0.13), point(51.52, -0.11)],
      300,
      375,
      40,
    );

    expect(fitted).not.toBeNull();
    expect(fitted!.pathD.startsWith('M')).toBe(true);
    expect(fitted!.pathD.includes(' L')).toBe(true);
    expect(fitted!.start.x).toBeGreaterThanOrEqual(40);
    expect(fitted!.start.y).toBeGreaterThanOrEqual(40);
    expect(fitted!.end.x).toBeLessThanOrEqual(300 - 40);
    expect(fitted!.end.y).toBeLessThanOrEqual(375 - 40);
  });

  it('fits a loop without leaving the viewBox', () => {
    const fitted = fitRouteToViewBox(
      [
        point(51.5, -0.12),
        point(51.51, -0.11),
        point(51.5, -0.1),
        point(51.49, -0.11),
        point(51.5, -0.12),
      ],
      300,
      375,
      36,
    );

    expect(fitted).not.toBeNull();
    expect(fitted!.start.x).toBeCloseTo(fitted!.end.x, 1);
    expect(fitted!.start.y).toBeCloseTo(fitted!.end.y, 1);
  });
});
