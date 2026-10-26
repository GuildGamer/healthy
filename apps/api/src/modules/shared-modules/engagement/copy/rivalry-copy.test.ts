import { describe, expect, it } from 'vitest';
import type { ReminderRivalry } from '../types/reminder-rivalry.js';
import { rivalryCopy } from './rivalry-copy.js';

function rivalry(overrides: Partial<ReminderRivalry> = {}): ReminderRivalry {
  return {
    matchId: 'm1',
    situation: 'group_rival_moved',
    contestTitle: 'Push-up Sunday',
    scoringMode: 'cumulative_total',
    metric: 'pushups',
    rivalName: 'Ada',
    rivalScore: 26,
    yourScore: 20,
    timeLeft: '1 day left',
    ...overrides,
  };
}

describe('rivalryCopy', () => {
  it('puts the clock and the contest in the title when time is running out', () => {
    expect(rivalryCopy(rivalry({ situation: 'group_closing', timeLeft: '5 hours left' }))).toEqual({
      title: '5 hours left in Push-up Sunday',
      body: "You're 6 behind Ada.",
    });
  });

  it('counts the gap in days for a streak contest', () => {
    expect(
      rivalryCopy(
        rivalry({
          situation: 'group_closing',
          scoringMode: 'days_completed',
          rivalScore: 5,
          yourScore: 4,
        }),
      ).body,
    ).toBe("You're 1 day behind Ada.");
  });

  it('says next one takes it when trailing only on the tie-break', () => {
    expect(
      rivalryCopy(rivalry({ situation: 'group_closing', rivalScore: 20, yourScore: 20 })).body,
    ).toBe('Level with Ada. Next one takes it.');
  });

  it('names who showed up today in a streak contest', () => {
    expect(rivalryCopy(rivalry({ situation: 'group_streak_gap' }))).toEqual({
      title: 'Ada showed up today',
      body: "You haven't yet · 1 day left",
    });
  });

  it('carries both scores when a rival ahead scored today', () => {
    expect(rivalryCopy(rivalry())).toEqual({
      title: 'Ada scored today',
      body: '26 to your 20 · 1 day left',
    });
  });

  it('asks for the action that keeps a close lead, in the contest’s terms', () => {
    const defend = rivalry({ situation: 'group_defend', rivalScore: 17, yourScore: 20 });
    expect(rivalryCopy(defend)).toEqual({
      title: "Ada's 3 behind you",
      body: 'One set keeps it that way. 1 day left.',
    });
    expect(rivalryCopy({ ...defend, metric: 'walk' }).body).toBe(
      'A walk keeps it that way. 1 day left.',
    );
    expect(rivalryCopy({ ...defend, scoringMode: 'days_completed' }).body).toBe(
      'Show up today to stay ahead. 1 day left.',
    );
  });

  it('never uses health or log wording', () => {
    for (const situation of [
      'group_closing',
      'group_streak_gap',
      'group_rival_moved',
      'group_defend',
    ] as const) {
      const copy = rivalryCopy(rivalry({ situation }));
      const text = `${copy.title} ${copy.body}`.toLowerCase();
      expect(text).not.toMatch(/\blog\b|health|reading/);
    }
  });
});
