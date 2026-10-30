import { describe, expect, it } from 'vitest';
import {
  matchSettledIdempotencyKey,
  matchSettledPushCopy,
} from './match-settled-notification.js';

describe('matchSettledPushCopy', () => {
  it('congratulates the winner', () => {
    expect(
      matchSettledPushCopy({
        contestTitle: 'Push-up Sunday',
        isWinner: true,
        winnerDisplayName: 'Ada',
      }),
    ).toEqual({
      title: 'You won Push-up Sunday',
      body: 'See the final board.',
    });
  });

  it('names the winner for everyone else', () => {
    expect(
      matchSettledPushCopy({
        contestTitle: 'Push-up Sunday',
        isWinner: false,
        winnerDisplayName: 'Ada',
      }),
    ).toEqual({
      title: 'Push-up Sunday is over',
      body: 'Ada took it. See the final board.',
    });
  });

  it('stays neutral when there is no winner name', () => {
    expect(
      matchSettledPushCopy({
        contestTitle: 'vs Bee',
        isWinner: false,
        winnerDisplayName: null,
      }),
    ).toEqual({
      title: 'vs Bee is over',
      body: 'See the final board.',
    });
  });

  it('never uses an em dash', () => {
    const copy = matchSettledPushCopy({
      contestTitle: 'vs Bee',
      isWinner: false,
      winnerDisplayName: 'Cam',
    });
    expect(`${copy.title} ${copy.body}`).not.toContain('—');
  });
});

describe('matchSettledIdempotencyKey', () => {
  it('is unique per match and recipient', () => {
    expect(matchSettledIdempotencyKey('m1', 'u1')).toBe('match_settled:m1:u1');
  });
});
