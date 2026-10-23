/** In-memory handoff from a gym selfie or walk route → the share card for that finish. */

import {
  downsampleRoutePoints,
  type ShareRoutePoint,
} from './share-route-path';

export type PendingSharePhoto = {
  /** The occurrence the selfie finished; a share for any other finish never shows it. */
  userChallengeId: string;
  photoUri: string;
};

export type PendingShareRoute = {
  /** The occurrence the walk finished; a share for any other finish never shows it. */
  userChallengeId: string;
  points: ShareRoutePoint[];
};

let pendingPhoto: PendingSharePhoto | null = null;
let pendingRoute: PendingShareRoute | null = null;

export function setPendingSharePhoto(photo: PendingSharePhoto): void {
  pendingPhoto = photo;
}

/** The selfie for this finish, or undefined when the share is for anything else. */
export function pendingSharePhotoFor(userChallengeId: string | undefined): string | undefined {
  if (!pendingPhoto || !userChallengeId || pendingPhoto.userChallengeId !== userChallengeId) {
    return undefined;
  }

  return pendingPhoto.photoUri;
}

export function clearPendingSharePhoto(): void {
  pendingPhoto = null;
}

/** Stashes a downsampled GPS path for the walk that just finished. */
export function setPendingShareRoute(input: {
  userChallengeId: string;
  points: readonly ShareRoutePoint[];
}): void {
  const points = downsampleRoutePoints(input.points);
  if (points.length < 2) {
    pendingRoute = null;
    return;
  }

  pendingRoute = { userChallengeId: input.userChallengeId, points };
}

/** The route for this finish, or undefined when the share is for anything else. */
export function pendingShareRouteFor(
  userChallengeId: string | undefined,
): ShareRoutePoint[] | undefined {
  if (!pendingRoute || !userChallengeId || pendingRoute.userChallengeId !== userChallengeId) {
    return undefined;
  }

  return pendingRoute.points;
}

export function clearPendingShareRoute(): void {
  pendingRoute = null;
}
