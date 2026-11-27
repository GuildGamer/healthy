import { describe, expect, it } from 'vitest';
import {
  GYM_PHOTO_FREE_RETENTION_DAYS,
  GYM_PHOTO_MEMBER_RETENTION_DAYS,
} from './constants/gym-photo.js';
import { computeGymPhotoExpiry, gymPhotoObjectKey } from './gym-photo-expiry.js';

describe('computeGymPhotoExpiry', () => {
  const completedAt = new Date('2026-11-23T12:00:00.000Z');

  it('keeps member photos for 30 days', () => {
    const expires = computeGymPhotoExpiry({ completedAt, membershipActive: true });
    expect(expires.toISOString()).toBe(
      new Date(
        completedAt.getTime() + GYM_PHOTO_MEMBER_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    );
  });

  it('keeps free photos for 1 day', () => {
    const expires = computeGymPhotoExpiry({ completedAt, membershipActive: false });
    expect(expires.toISOString()).toBe(
      new Date(
        completedAt.getTime() + GYM_PHOTO_FREE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    );
  });
});

describe('gymPhotoObjectKey', () => {
  it('scopes the key to the owner and occurrence', () => {
    expect(gymPhotoObjectKey('u1', 'uc1')).toBe('gym-photos/u1/uc1.jpg');
  });
});
