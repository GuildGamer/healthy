import { describe, expect, it } from 'vitest';
import {
  boardMoveIdempotencyKey,
  boardMovePushCopy,
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

describe('boardMovePushCopy', () => {
  const base = {
    actorDisplayName: 'Bee',
    actorScore: 42,
    recipientScore: 40,
    timeLeft: '1 day left',
  };

  it('names the rival in the title when they passed you', () => {
    expect(boardMovePushCopy({ ...base, urgency: 'ahead' })).toEqual({
      title: 'Bee passed you',
      body: '42 to your 40 · 1 day left',
    });
  });

  it('says both scores are level when they caught you', () => {
    expect(
      boardMovePushCopy({ ...base, urgency: 'tied', actorScore: 40 }),
    ).toEqual({
      title: 'Bee caught you',
      body: 'Both on 40 · 1 day left',
    });
  });

  it('warns that they are closing in when close behind', () => {
    expect(
      boardMovePushCopy({ ...base, urgency: 'close', actorScore: 36 }),
    ).toEqual({
      title: "Bee's closing in",
      body: '36 to your 40 · 1 day left',
    });
  });

  it('keeps a routine move plain', () => {
    expect(
      boardMovePushCopy({ ...base, urgency: 'routine', actorScore: 12 }),
    ).toEqual({
      title: 'Bee scored',
      body: '12 to your 40 · 1 day left',
    });
  });

  it('drops the score line when the actor has nothing on the board', () => {
    expect(
      boardMovePushCopy({ ...base, urgency: 'routine', actorScore: 0 }).body,
    ).toBe('1 day left');
  });

  it('never uses log wording', () => {
    for (const urgency of ['ahead', 'tied', 'close', 'routine'] as const) {
      const copy = boardMovePushCopy({ ...base, urgency });
      expect(`${copy.title} ${copy.body}`.toLowerCase()).not.toContain('log');
    }
  });
});

describe('boardMoveIdempotencyKey', () => {
  it('keys one notice per match, attempt, and recipient', () => {
    expect(boardMoveIdempotencyKey('m1', 'a1', 'u2')).toBe('match_board_move:m1:a1:u2');
  });
});
