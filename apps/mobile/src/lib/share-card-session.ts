/** In-memory handoff from a gym selfie submit → the share card for that same finish. */

export type PendingSharePhoto = {
  /** The occurrence the selfie finished; a share for any other finish never shows it. */
  userChallengeId: string;
  photoUri: string;
};

let pending: PendingSharePhoto | null = null;

export function setPendingSharePhoto(photo: PendingSharePhoto): void {
  pending = photo;
}

/** The selfie for this finish, or undefined when the share is for anything else. */
export function pendingSharePhotoFor(userChallengeId: string | undefined): string | undefined {
  if (!pending || !userChallengeId || pending.userChallengeId !== userChallengeId) {
    return undefined;
  }

  return pending.photoUri;
}

export function clearPendingSharePhoto(): void {
  pending = null;
}
