import type { TodayChallenge } from '@product/client';
import {
  formatHistoryWhen,
  historyEvidenceCopy,
  historyLogCopy,
  mergeTodayIntoHistory,
} from './challenge-history';

describe('formatHistoryWhen', () => {
  it('formats the completion day', () => {
    expect(formatHistoryWhen('2026-08-30T12:00:00.000Z')).toBe('30 Aug');
  });
});

describe('historyLogCopy', () => {
  it('describes each stored log kind', () => {
    expect(historyLogCopy(null)).toBe('Completed');
    expect(historyLogCopy({ kind: 'check_in' })).toBe('Checked in');
    expect(historyLogCopy({ kind: 'evidence_photo' })).toBe('Gym selfie');
    expect(
      historyLogCopy({
        kind: 'vitals_bp',
        systolic: 128,
        diastolic: 82,
        pulse: 70,
        notes: null,
      }),
    ).toBe('128/82 · 70 bpm');
    expect(
      historyLogCopy({
        kind: 'glucose',
        mmolL: 5.4,
        context: 'fasting',
      }),
    ).toBe('5.4 mmol/L · Fasting');
    expect(
      historyLogCopy({ kind: 'peak_flow', bestLitresPerMinute: 420 }),
    ).toBe('420 L/min');
    expect(historyLogCopy({ kind: 'water', amount: 3, unit: 'glasses' })).toBe(
      '3 glasses',
    );
    expect(historyLogCopy({ kind: 'carbs', grams: 45, note: null })).toBe('45 g');
    expect(historyLogCopy({ kind: 'carbs', grams: null, note: 'Rice' })).toBe(
      'Rice',
    );
    expect(
      historyLogCopy({
        kind: 'device',
        metric: 'walk',
        durationSeconds: 1200,
        distanceMeters: 1600,
        count: null,
      }),
    ).toBe('20 min walk');
  });
});

describe('mergeTodayIntoHistory', () => {
  const occurrence = {
    id: 'uc-today',
    periodKey: '2026-08-30',
    status: 'completed',
    rewardPoints: 20,
    completionKind: 'check_in',
  } as TodayChallenge;

  it('adds today’s completed occurrence when the API list omitted it', () => {
    const merged = mergeTodayIntoHistory([], occurrence);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: 'uc-today',
      pointsDelta: 20,
      log: { kind: 'check_in' },
    });
  });

  it('does not duplicate a row the API already returned', () => {
    const existing = {
      id: 'uc-today',
      periodKey: '2026-08-30',
      completedAt: '2026-08-30T09:00:00.000Z',
      outcome: 'rewarded' as const,
      pointsDelta: 20,
      log: { kind: 'check_in' as const },
      evidence: null,
    };

    expect(mergeTodayIntoHistory([existing], occurrence)).toEqual([existing]);
  });

  it('leaves an unfinished occurrence off the list', () => {
    expect(
      mergeTodayIntoHistory([], { ...occurrence, status: 'pending' }),
    ).toEqual([]);
  });
});

describe('historyEvidenceCopy', () => {
  it('names the photo-check outcome', () => {
    expect(historyEvidenceCopy('submitted')).toBe('Photo sent');
    expect(historyEvidenceCopy('skipped')).toBe('Photo skipped');
    expect(historyEvidenceCopy('expired')).toBe('Photo timed out');
    expect(historyEvidenceCopy(null)).toBeNull();
  });
});
