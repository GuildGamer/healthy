import type { ChallengeHistoryLog, ProgressDoneItem } from '@product/client';
import { formatClockTime } from '@/lib/clock-time';
import { posterShareText } from './share-poster';
import { posterForDoneItem, posterForHistoryEntry } from './completion-poster';

const completedAt = '2026-10-20T09:15:00.000Z';

const mark: Pick<ProgressDoneItem, 'category' | 'completionKind' | 'capture'> = {
  category: 'general',
  completionKind: 'check_in',
  capture: {
    kind: 'self_report',
    metric: null,
    target: { durationMinutes: null, distanceMeters: null, count: null },
  },
};

function done(overrides: Partial<ProgressDoneItem>): ProgressDoneItem {
  return {
    ...mark,
    challengeId: 'c',
    userChallengeId: 'uc',
    title: 'Morning walk',
    completedAt,
    points: 150,
    share: null,
    proofClip: null,
    ...overrides,
  };
}

describe('posterForDoneItem', () => {
  it('puts reps, minutes, glasses, and a gym check-in on the card', () => {
    expect(
      posterForDoneItem(
        done({
          title: 'Do 20 push-ups',
          capture: {
            ...mark.capture,
            kind: 'device_session',
            metric: 'pushups',
            target: { ...mark.capture.target, count: 20 },
          },
          share: { kind: 'reps', count: 22 },
        }),
      ),
    ).toMatchObject({ kind: 'strength', label: 'Do 20 push-ups', value: '22', unit: 'push-ups' });

    expect(
      posterForDoneItem(
        done({
          capture: { ...mark.capture, kind: 'device_session', metric: 'walk' },
          share: { kind: 'minutes', minutes: 20 },
        }),
      ),
    ).toMatchObject({ kind: 'walk', value: '20', unit: 'minutes walked', when: completedAt });

    expect(
      posterForDoneItem(
        done({
          title: 'Log your water',
          completionKind: 'water',
          share: { kind: 'glasses', count: 6 },
        }),
      ),
    ).toMatchObject({ kind: 'water', value: '6', unit: 'glasses' });

    const gym = posterForDoneItem(
      done({
        title: 'Gym session',
        completionKind: 'evidence_photo',
        share: { kind: 'gym' },
      }),
    );
    expect(gym).toMatchObject({
      kind: 'gym',
      label: 'Gym session',
      value: formatClockTime(new Date(completedAt)),
      unit: 'at the gym',
    });
  });

  it('opens a reading as Logged, with the day and the challenge name only', () => {
    const poster = posterForDoneItem(
      done({
        title: 'Check your blood pressure',
        category: 'hypertension',
        completionKind: 'vitals_bp',
        share: null,
      }),
    );

    expect(poster).toMatchObject({
      kind: 'bloodPressure',
      label: 'Check your blood pressure',
      value: 'Logged',
      unit: '20 Oct',
      when: completedAt,
    });
    expect(posterShareText(poster)).toBe('Logged · Check your blood pressure · 20 Oct');
    expect(JSON.stringify(poster)).not.toMatch(/128|82|mmol|Sam/);
  });
});

describe('posterForHistoryEntry', () => {
  const walk = {
    title: 'Morning walk',
    category: 'general' as const,
    completionKind: 'check_in' as const,
    capture: {
      kind: 'device_session' as const,
      metric: 'walk' as const,
      target: { durationMinutes: 10, distanceMeters: null, count: null },
    },
  };

  it('uses the stored walk and leaves the distance off the card', () => {
    const poster = posterForHistoryEntry(
      {
        completedAt,
        log: {
          kind: 'device',
          metric: 'walk',
          durationSeconds: 1200,
          distanceMeters: 1600,
          count: null,
        },
      },
      walk,
    );

    expect(poster).toMatchObject({ value: '20', unit: 'minutes walked', label: 'Morning walk' });
    expect(JSON.stringify(poster)).not.toContain('1600');
  });

  it('never copies a reading, a note, or another person onto the card', () => {
    const logs: ChallengeHistoryLog[] = [
      { kind: 'vitals_bp', systolic: 128, diastolic: 82, pulse: 70, notes: 'With Sam' },
      { kind: 'glucose', mmolL: 5.4, context: 'fasting' },
      { kind: 'peak_flow', bestLitresPerMinute: 420 },
      { kind: 'carbs', grams: 45, note: 'Rice with Sam' },
    ];

    for (const log of logs) {
      const poster = posterForHistoryEntry(
        { completedAt, log },
        {
          ...walk,
          title: 'Check your blood pressure',
          category: 'hypertension',
          completionKind: 'vitals_bp',
        },
      );
      const text = `${posterShareText(poster)} ${JSON.stringify(poster)}`;
      expect(poster.value).toBe('Logged');
      expect(text).not.toMatch(/128|82|70|5\.4|420|45|Sam|fasting|Rice/);
    }
  });
});
