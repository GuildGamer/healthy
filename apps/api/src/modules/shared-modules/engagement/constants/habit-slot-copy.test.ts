import { describe, expect, it } from 'vitest';
import {
  HABIT_SLOT_MINUTES,
  habitSlotCopy,
  habitSlotIdempotencyKey,
  isHabitSlotMinute,
} from './habit-slot-copy.js';

describe('habit slot copy', () => {
  it('covers every waking slot', () => {
    expect(HABIT_SLOT_MINUTES).toEqual([480, 660, 840, 1020, 1140, 1260]);
  });

  it('returns the morning CTA', () => {
    expect(habitSlotCopy(480)).toEqual({
      title: "Start today's challenge",
      body: "Today's on you",
    });
  });

  it('rejects a minute that is not a slot', () => {
    expect(isHabitSlotMinute(481)).toBe(false);
    expect(habitSlotCopy(481)).toBeNull();
  });

  it('builds a stable idempotency key', () => {
    expect(habitSlotIdempotencyKey('u1', '2026-10-21', 480)).toBe(
      'habit_slot:u1:2026-10-21:480',
    );
  });
});
