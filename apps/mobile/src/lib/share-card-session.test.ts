import {
  clearPendingSharePhoto,
  pendingSharePhotoFor,
  setPendingSharePhoto,
} from './share-card-session';

afterEach(() => {
  clearPendingSharePhoto();
});

describe('share-card-session', () => {
  it('holds the selfie for its own finish until cleared', () => {
    setPendingSharePhoto({ userChallengeId: 'uc-gym', photoUri: 'file://gym.jpg' });

    expect(pendingSharePhotoFor('uc-gym')).toBe('file://gym.jpg');
    clearPendingSharePhoto();
    expect(pendingSharePhotoFor('uc-gym')).toBeUndefined();
  });

  it('never hands the selfie to a different finish', () => {
    setPendingSharePhoto({ userChallengeId: 'uc-gym', photoUri: 'file://gym.jpg' });

    expect(pendingSharePhotoFor('uc-yesterday')).toBeUndefined();
    expect(pendingSharePhotoFor(undefined)).toBeUndefined();
  });
});
