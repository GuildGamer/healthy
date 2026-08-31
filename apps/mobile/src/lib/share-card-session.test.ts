import {
  clearPendingShareCard,
  peekPendingShareCard,
  setPendingShareCard,
} from './share-card-session';

afterEach(() => {
  clearPendingShareCard();
});

describe('share-card-session', () => {
  it('holds a payload until cleared', () => {
    setPendingShareCard({
      photoUri: 'file://gym.jpg',
      title: 'Gym session',
      pointsAwarded: 40,
      currentStreakDays: 12,
    });

    expect(peekPendingShareCard()?.photoUri).toBe('file://gym.jpg');
    clearPendingShareCard();
    expect(peekPendingShareCard()).toBeNull();
  });
});
