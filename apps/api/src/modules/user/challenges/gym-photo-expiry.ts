import {
  GYM_PHOTO_FREE_RETENTION_DAYS,
  GYM_PHOTO_MEMBER_RETENTION_DAYS,
} from './constants/gym-photo.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Expiry from membership at the moment the gym photo is stored. */
export function computeGymPhotoExpiry(input: {
  completedAt: Date;
  membershipActive: boolean;
}): Date {
  const days = input.membershipActive
    ? GYM_PHOTO_MEMBER_RETENTION_DAYS
    : GYM_PHOTO_FREE_RETENTION_DAYS;
  return new Date(input.completedAt.getTime() + days * DAY_MS);
}

export function gymPhotoObjectKey(userId: string, userChallengeId: string): string {
  return `gym-photos/${userId}/${userChallengeId}.jpg`;
}
