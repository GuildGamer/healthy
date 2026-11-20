import { describe, expect, it } from 'vitest';
import { selectSituation } from './select-situation.js';
import type { ReminderContext } from './types.js';

function context(overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    userId: 'u1',
    dayKey: '2026-08-29',
    localMinute: 10 * 60,
    nudgeKind: 'habit_slot',
    firstName: 'Ada',
    streakDays: 0,
    openCount: 1,
    doneCount: 0,
    missedYesterday: false,
    firstWeek: false,
    lead: {
      challengeId: 'c1',
      slug: 'twenty-push-ups',
      title: 'Do 5 push-ups',
      deviceMetric: 'pushups',
      completionKind: 'check_in',
      targetCount: 5,
      measuredCount: null,
      status: 'pending',
    },
    benefitBody: null,
    rivalry: null,
    ...overrides,
  };
}

describe('selectSituation', () => {
  it('prioritises awaiting_evidence for in-progress nudges', () => {
    expect(
      selectSituation(
        context({
          nudgeKind: 'in_progress_nudge',
          lead: {
            challengeId: 'c1',
            slug: 'gym-session',
            title: 'Gym',
            deviceMetric: null,
            completionKind: 'evidence_photo',
            targetCount: null,
            measuredCount: null,
            status: 'awaiting_evidence',
          },
        }),
      ),
    ).toBe('awaiting_evidence');
  });

  it('splits in-progress by measured progress', () => {
    expect(
      selectSituation(
        context({
          nudgeKind: 'in_progress_nudge',
          lead: {
            challengeId: 'c1',
            slug: 'twenty-push-ups',
            title: 'Do 20 push-ups',
            deviceMetric: 'pushups',
            completionKind: 'check_in',
            targetCount: 20,
            measuredCount: 12,
            status: 'in_progress',
          },
        }),
      ),
    ).toBe('in_progress_partial');

    expect(
      selectSituation(
        context({
          nudgeKind: 'in_progress_nudge',
          lead: {
            challengeId: 'c1',
            slug: 'twenty-push-ups',
            title: 'Do 20 push-ups',
            deviceMetric: 'pushups',
            completionKind: 'check_in',
            targetCount: 20,
            measuredCount: 0,
            status: 'in_progress',
          },
        }),
      ),
    ).toBe('in_progress_none');
  });

  it('prefers missed yesterday and first week over time-of-day', () => {
    expect(
      selectSituation(context({ missedYesterday: true, firstWeek: true })),
    ).toBe('missed_yesterday');
    expect(selectSituation(context({ firstWeek: true }))).toBe('first_week');
  });

  it('picks morning, midday, and evening habit situations', () => {
    expect(selectSituation(context({ localMinute: 8 * 60 }))).toBe(
      'morning_nothing_done',
    );
    expect(
      selectSituation(
        context({ localMinute: 14 * 60, doneCount: 2, openCount: 1 }),
      ),
    ).toBe('midday_almost_done');
    expect(
      selectSituation(
        context({ localMinute: 19 * 60, streakDays: 12, openCount: 1 }),
      ),
    ).toBe('evening_streak');
    expect(
      selectSituation(
        context({ localMinute: 19 * 60, streakDays: 0, openCount: 1 }),
      ),
    ).toBe('evening_open');
  });

  it('lets a live group outrank every solo situation in daily reminders', () => {
    const rivalry = {
      matchId: 'm1',
      situation: 'group_closing' as const,
      contestTitle: 'Push-up Sunday',
      scoringMode: 'cumulative_total' as const,
      metric: 'pushups' as const,
      rivalName: 'Tunde',
      rivalScore: 26,
      yourScore: 20,
      timeLeft: '5 hours left',
    };

    expect(selectSituation(context({ rivalry, missedYesterday: true }))).toBe('group_closing');
    expect(
      selectSituation(context({ rivalry, nudgeKind: 'clock_reminder' })),
    ).toBe('group_closing');
    expect(
      selectSituation(
        context({
          rivalry,
          nudgeKind: 'in_progress_nudge',
          lead: {
            challengeId: 'c1',
            slug: 'twenty-push-ups',
            title: 'Do 5 push-ups',
            deviceMetric: 'pushups',
            completionKind: 'check_in',
            targetCount: 5,
            measuredCount: null,
            status: 'in_progress',
          },
        }),
      ),
    ).toBe('in_progress_none');
  });

  it('falls back to open_default', () => {
    expect(
      selectSituation(
        context({
          nudgeKind: 'clock_reminder',
          localMinute: 14 * 60,
          doneCount: 0,
        }),
      ),
    ).toBe('open_default');
  });
});
