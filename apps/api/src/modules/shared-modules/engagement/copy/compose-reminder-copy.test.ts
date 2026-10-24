import { describe, expect, it } from 'vitest';
import {
  composeReminderCopy,
  pickCopyVersion,
  shouldAppendBenefit,
  truncateBenefitLine,
} from './compose-reminder-copy.js';
import type { ReminderContext } from './types.js';

function context(overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    userId: 'u1',
    dayKey: '2026-08-29',
    localMinute: 8 * 60,
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
    ...overrides,
  };
}

describe('composeReminderCopy', () => {
  it('composes morning nothing-done copy with a starter step', () => {
    const composed = composeReminderCopy(context());
    expect(composed.situation).toBe('morning_nothing_done');
    expect(composed.templateKey).toBe('cadence.morning_nothing_done');
    expect(composed.body).toMatch(/5 push-ups/);
    expect(['v1a', 'v1b']).toContain(composed.copyVersion);
  });

  it('never puts the name in variant b titles', () => {
    // Find a userId that hashes to v1b for this situation
    let userId = 'u-name-test';
    for (let index = 0; index < 50; index += 1) {
      const candidate = `u${index}`;
      if (
        pickCopyVersion(candidate, '2026-08-29', 'morning_nothing_done') ===
        'v1b'
      ) {
        userId = candidate;
        break;
      }
    }

    const composed = composeReminderCopy(
      context({ userId, firstName: 'Ada' }),
    );
    expect(composed.copyVersion).toBe('v1b');
    expect(composed.title).not.toMatch(/Ada/);
  });

  it('puts the name in variant a titles when available', () => {
    let userId = 'u-name-a';
    for (let index = 0; index < 50; index += 1) {
      const candidate = `ua${index}`;
      if (
        pickCopyVersion(candidate, '2026-08-29', 'morning_nothing_done') ===
        'v1a'
      ) {
        userId = candidate;
        break;
      }
    }

    const composed = composeReminderCopy(
      context({ userId, firstName: 'Ada' }),
    );
    expect(composed.copyVersion).toBe('v1a');
    expect(composed.title).toMatch(/Ada/);
  });

  it('covers awaiting evidence without guilt', () => {
    const composed = composeReminderCopy(
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
    );
    expect(composed.situation).toBe('awaiting_evidence');
    expect(composed.body).toMatch(/photo/i);
    expect(composed.body.toLowerCase()).not.toMatch(/missed/);
  });

  it('covers partial and empty in-progress', () => {
    const partial = composeReminderCopy(
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
    );
    expect(partial.situation).toBe('in_progress_partial');
    expect(partial.body).toMatch(/8 more/);

    const none = composeReminderCopy(
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
    );
    expect(none.situation).toBe('in_progress_none');
    expect(none.title).toMatch(/left off/i);
  });

  it('covers missed yesterday and first week', () => {
    expect(
      composeReminderCopy(context({ missedYesterday: true })).situation,
    ).toBe('missed_yesterday');
    expect(composeReminderCopy(context({ firstWeek: true })).situation).toBe(
      'first_week',
    );
    expect(
      composeReminderCopy(context({ missedYesterday: true })).body.toLowerCase(),
    ).not.toMatch(/missed yesterday/);
  });

  it('covers midday, evening streak, and evening open', () => {
    expect(
      composeReminderCopy(
        context({ localMinute: 14 * 60, doneCount: 2, openCount: 1 }),
      ).situation,
    ).toBe('midday_almost_done');

    const streak = composeReminderCopy(
      context({ localMinute: 19 * 60, streakDays: 12, openCount: 1 }),
    );
    expect(streak.situation).toBe('evening_streak');
    expect(streak.title).toMatch(/12 days/);

    expect(
      composeReminderCopy(
        context({ localMinute: 19 * 60, streakDays: 0 }),
      ).situation,
    ).toBe('evening_open');
  });

  it('appends a benefit line about 1 in 4 days and marks templateKey', () => {
    const benefit =
      'Muscle-strengthening on two or more days a week is part of what adults need for health.';
    let withBenefit: ReturnType<typeof composeReminderCopy> | null = null;
    let withoutBenefit: ReturnType<typeof composeReminderCopy> | null = null;

    for (let index = 0; index < 40; index += 1) {
      const userId = `benefit-user-${index}`;
      const dayKey = '2026-08-29';
      const composed = composeReminderCopy(
        context({ userId, dayKey, benefitBody: benefit }),
      );
      if (shouldAppendBenefit(userId, dayKey)) {
        withBenefit = composed;
      } else {
        withoutBenefit = composed;
      }
      if (withBenefit && withoutBenefit) {
        break;
      }
    }

    expect(withBenefit).not.toBeNull();
    expect(withoutBenefit).not.toBeNull();
    expect(withBenefit!.templateKey).toBe('cadence.morning_nothing_done.benefit');
    expect(withBenefit!.body).toContain(truncateBenefitLine(benefit));
    expect(withoutBenefit!.templateKey).toBe('cadence.morning_nothing_done');
    expect(withoutBenefit!.body).not.toContain('Muscle-strengthening');
  });

  it('truncates long benefit lines', () => {
    const long =
      'A very long explanation of why this activity matters for health that exceeds the push notification budget we want.';
    expect(truncateBenefitLine(long, 80).endsWith('…')).toBe(true);
    expect(truncateBenefitLine(long, 80).length).toBeLessThanOrEqual(80);
  });
});
