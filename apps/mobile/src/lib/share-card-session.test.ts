import {
  clearPendingSharePhoto,
  clearPendingShareRoute,
  pendingSharePhotoFor,
  pendingShareRouteFor,
  setPendingSharePhoto,
  setPendingShareRoute,
} from './share-card-session';

afterEach(() => {
  clearPendingSharePhoto();
  clearPendingShareRoute();
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

  it('holds a downsampled route for its own finish until cleared', () => {
    setPendingShareRoute({
      userChallengeId: 'uc-walk',
      points: [
        { latitude: 51.5, longitude: -0.12 },
        { latitude: 51.51, longitude: -0.11 },
        { latitude: 51.52, longitude: -0.1 },
      ],
    });

    expect(pendingShareRouteFor('uc-walk')).toHaveLength(3);
    clearPendingShareRoute();
    expect(pendingShareRouteFor('uc-walk')).toBeUndefined();
  });

  it('never hands the route to a different finish', () => {
    setPendingShareRoute({
      userChallengeId: 'uc-walk',
      points: [
        { latitude: 51.5, longitude: -0.12 },
        { latitude: 51.51, longitude: -0.11 },
      ],
    });

    expect(pendingShareRouteFor('uc-other')).toBeUndefined();
    expect(pendingShareRouteFor(undefined)).toBeUndefined();
  });

  it('ignores a route with fewer than two points', () => {
    setPendingShareRoute({
      userChallengeId: 'uc-walk',
      points: [{ latitude: 51.5, longitude: -0.12 }],
    });

    expect(pendingShareRouteFor('uc-walk')).toBeUndefined();
  });
});
