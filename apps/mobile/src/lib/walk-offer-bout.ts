import { haversineMeters, type GeoPoint } from '@/lib/geo-session';

/**
 * Same stride floor the active walk recorder uses: past table jitter, inside
 * two real steps. Kept here so the offer monitor and the session agree.
 */
export const WALK_OFFER_DISPLACEMENT_METERS = 10;

/**
 * Running total of seconds the person was covering ground. Fixes that barely
 * move (GPS noise while standing) do not grow the bout.
 */
export type WalkOfferBout = {
  movingSeconds: number;
  lastFix: GeoPoint | null;
};

export function emptyWalkOfferBout(): WalkOfferBout {
  return { movingSeconds: 0, lastFix: null };
}

/**
 * Fold one location fix into the bout. Returns a new bout object.
 *
 * Short hops keep the anchor so a slow walk can cross the floor. Only a hop
 * that covers enough ground from that anchor adds elapsed time.
 */
export function accumulateWalkOfferFix(bout: WalkOfferBout, fix: GeoPoint): WalkOfferBout {
  if (!bout.lastFix) {
    return { movingSeconds: bout.movingSeconds, lastFix: fix };
  }

  if (fix.recordedAt <= bout.lastFix.recordedAt) {
    return bout;
  }

  const meters = haversineMeters(bout.lastFix, fix);
  if (meters < WALK_OFFER_DISPLACEMENT_METERS) {
    return bout;
  }

  const elapsedSeconds = Math.max(0, (fix.recordedAt - bout.lastFix.recordedAt) / 1000);
  return {
    movingSeconds: bout.movingSeconds + elapsedSeconds,
    lastFix: fix,
  };
}

/** Prefer the bout that has covered more ground (or a newer fix when tied). */
export function preferFurtherWalkOfferBout(a: WalkOfferBout, b: WalkOfferBout): WalkOfferBout {
  if (b.movingSeconds > a.movingSeconds) {
    return b;
  }

  if (a.movingSeconds > b.movingSeconds) {
    return a;
  }

  const aAt = a.lastFix?.recordedAt ?? 0;
  const bAt = b.lastFix?.recordedAt ?? 0;
  return bAt >= aAt ? b : a;
}
