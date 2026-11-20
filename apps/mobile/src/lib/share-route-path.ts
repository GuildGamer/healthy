/** A lat/lng pair for a share-card route silhouette (no timestamps). */
export type ShareRoutePoint = {
  latitude: number;
  longitude: number;
};

export type FittedShareRoute = {
  /** SVG path `d` in the given viewBox. */
  pathD: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  viewBoxWidth: number;
  viewBoxHeight: number;
};

const DEFAULT_MAX_POINTS = 100;

/**
 * Evenly keeps at most `maxPoints` samples so a long GPS stream still fits an
 * in-memory handoff and a sharp SVG export.
 */
export function downsampleRoutePoints(
  points: readonly ShareRoutePoint[],
  maxPoints: number = DEFAULT_MAX_POINTS,
): ShareRoutePoint[] {
  if (points.length <= maxPoints) {
    return points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
  }

  if (maxPoints < 2) {
    const only = points[0];
    return only ? [{ latitude: only.latitude, longitude: only.longitude }] : [];
  }

  const lastIndex = points.length - 1;
  const selected: ShareRoutePoint[] = [];
  for (let slot = 0; slot < maxPoints; slot += 1) {
    const index = Math.round((slot * lastIndex) / (maxPoints - 1));
    const point = points[index];
    if (!point) {
      continue;
    }
    selected.push({ latitude: point.latitude, longitude: point.longitude });
  }

  return selected;
}

/**
 * Fits lat/lng into an SVG viewBox with padding. Returns null when there are
 * fewer than two distinct points.
 */
export function fitRouteToViewBox(
  points: readonly ShareRoutePoint[],
  viewBoxWidth: number,
  viewBoxHeight: number,
  padding: number,
): FittedShareRoute | null {
  if (points.length < 2 || viewBoxWidth <= 0 || viewBoxHeight <= 0) {
    return null;
  }

  let minLat = points[0]!.latitude;
  let maxLat = minLat;
  let minLng = points[0]!.longitude;
  let maxLng = minLng;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  const innerWidth = Math.max(viewBoxWidth - padding * 2, 1);
  const innerHeight = Math.max(viewBoxHeight - padding * 2, 1);
  const scale = Math.min(innerWidth / lngSpan, innerHeight / latSpan);
  const usedWidth = lngSpan * scale;
  const usedHeight = latSpan * scale;
  const offsetX = padding + (innerWidth - usedWidth) / 2;
  const offsetY = padding + (innerHeight - usedHeight) / 2;

  const projected = points.map((point) => ({
    x: offsetX + (point.longitude - minLng) * scale,
    y: offsetY + (maxLat - point.latitude) * scale,
  }));

  const start = projected[0];
  const end = projected[projected.length - 1];
  if (!start || !end) {
    return null;
  }

  if (start.x === end.x && start.y === end.y && projected.length === 2) {
    return null;
  }

  const pathD = projected
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return {
    pathD,
    start,
    end,
    viewBoxWidth,
    viewBoxHeight,
  };
}
