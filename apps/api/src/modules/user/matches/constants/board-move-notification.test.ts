import { describe, expect, it } from 'vitest';
import {
  BOARD_MOVE_ROUTINE_TITLE,
  BOARD_MOVE_URGENT_TITLE,
  boardMoveIdempotencyKey,
  boardMovePushBody,
  boardMovePushTitle,
  boardMoveUrgency,
} from './board-move-notification.js';

describe('boardMoveUrgency', () => {
  it('marks ahead when this event crosses above the recipient', () => {
    expect(boardMoveUrgency(40, 30, 25)).toBe('ahead');
  });

  it('is routine when the actor was already ahead before this event', () => {
    expect(boardMoveUrgency(45, 30, 40)).toBe('routine');
  });

  it('marks a tie when both scores match and are positive', () => {
    expect(boardMoveUrgency(30, 30, 20)).toBe('tied');
  });

  it('treats a zero–zero board as routine, not a tie', () => {
    expect(boardMoveUrgency(0, 0)).toBe('routine');
  });

  it('marks close when the actor trails within the larger of 5 or 10%', () => {
    // 10% of 100 is 10; gap of 8 is close.
    expect(boardMoveUrgency(92, 100)).toBe('close');
    // Floor of 5 points: trailing by 4 on a score of 20 is close.
    expect(boardMoveUrgency(16, 20)).toBe('close');
  });

  it('is routine when the gap is wider than the close margin', () => {
    expect(boardMoveUrgency(50, 100)).toBe('routine');
    expect(boardMoveUrgency(10, 20)).toBe('routine');
  });
});

describe('boardMovePush copy', () => {
  it('uses urgent Stay ahead copy when they passed you', () => {
    expect(boardMovePushTitle('ahead')).toBe(BOARD_MOVE_URGENT_TITLE);
    expect(boardMovePushBody('Bee', 'ahead')).toBe('Bee just passed you.');
  });

  it('uses urgent Stay ahead copy when they matched you', () => {
    expect(boardMovePushTitle('tied')).toBe(BOARD_MOVE_URGENT_TITLE);
    expect(boardMovePushBody('Bee', 'tied')).toBe('Bee matched you.');
  });

  it('uses urgent Stay ahead copy when they are on your heels', () => {
    expect(boardMovePushTitle('close')).toBe(BOARD_MOVE_URGENT_TITLE);
    expect(boardMovePushBody('Bee', 'close')).toBe('Bee is on your heels.');
  });

  it('uses lighter See the board copy for a routine update', () => {
    expect(boardMovePushTitle('routine')).toBe(BOARD_MOVE_ROUTINE_TITLE);
    expect(boardMovePushBody('Bee', 'routine')).toBe('Bee just scored.');
  });

  it('never uses log wording', () => {
    for (const urgency of ['ahead', 'tied', 'close', 'routine'] as const) {
      const text = `${boardMovePushTitle(urgency)} ${boardMovePushBody('Bee', urgency)}`;
      expect(text.toLowerCase()).not.toContain('log');
    }
  });
});

describe('boardMoveIdempotencyKey', () => {
  it('keys one notice per match, attempt, and recipient', () => {
    expect(boardMoveIdempotencyKey('m1', 'a1', 'u2')).toBe('match_board_move:m1:a1:u2');
  });
});
