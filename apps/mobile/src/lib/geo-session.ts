export type GeoPoint = {
  latitude: number;
  longitude: number;
  recordedAt: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(from: GeoPoint, to: GeoPoint): number {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pathDistanceMeters(points: readonly GeoPoint[]): number {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) {
      continue;
    }
    total += haversineMeters(previous, current);
  }

  return Math.round(total);
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1_000) {
    return `${meters} m`;
  }

  return `${(meters / 1_000).toFixed(2)} km`;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
