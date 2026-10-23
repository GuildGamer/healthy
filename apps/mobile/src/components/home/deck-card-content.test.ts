import { occurrenceDetail, todayChallenge } from './testing/today-fixtures';
import { deckCardKindFor } from '@/components/deck';
import { deckCardMeasure, deckCardProof, deckCardVerb } from './deck-card-content';

const noTarget = { durationMinutes: null, distanceMeters: null, count: null };
const walk = {
  kind: 'device_session',
  metric: 'walk',
  target: { ...noTarget, durationMinutes: 10 },
} as const;
const pushups = {
  kind: 'device_session',
  metric: 'pushups',
  target: { ...noTarget, count: 20 },
} as const;
const reading = { kind: 'structured_log', metric: null, target: noTarget } as const;
const sleep = { kind: 'structured_log', metric: 'sleep', target: noTarget } as const;
const photo = { kind: 'photo', metric: null, target: noTarget } as const;

describe('deckCardKindFor', () => {
  it('reads measured activities by what you do', () => {
    expect(deckCardKindFor(todayChallenge({ capture: walk, category: 'hypertension' }))).toBe(
      'walk',
    );
    expect(deckCardKindFor(todayChallenge({ capture: pushups }))).toBe('strength');
  });

  it('falls back from the completion kind to the condition', () => {
    expect(deckCardKindFor(todayChallenge({ completionKind: 'vitals_bp', capture: reading }))).toBe(
      'bloodPressure',
    );
    expect(
      deckCardKindFor(todayChallenge({ completionKind: 'evidence_photo', capture: photo })),
    ).toBe('gym');
    expect(
      deckCardKindFor(
        todayChallenge({ completionKind: 'glucose', capture: reading, category: 'diabetes' }),
      ),
    ).toBe('water');
  });
});

describe('deckCardVerb', () => {
  it.each([
    [todayChallenge({ capture: pushups }), 'Start set'],
    [todayChallenge({ capture: walk }), 'Start a walk'],
    [todayChallenge({ completionKind: 'vitals_bp', capture: reading }), 'Log reading'],
    [todayChallenge({ completionKind: 'water', capture: reading }), 'Add a glass'],
    [todayChallenge({ completionKind: 'evidence_photo', capture: photo }), 'Add photo'],
    [todayChallenge({ completionKind: 'check_in' }), 'Mark as done'],
    [todayChallenge({ completionKind: 'check_in', capture: sleep }), 'Log sleep'],
    [todayChallenge({ capture: walk, status: 'in_progress' }), 'Resume'],
    [todayChallenge({ status: 'awaiting_evidence' }), 'Add photo'],
  ])('names the next action', (challenge, verb) => {
    expect(deckCardVerb(challenge)).toBe(verb);
  });
});

describe('deckCardProof', () => {
  it('says how each card is measured', () => {
    expect(deckCardProof(todayChallenge({ capture: pushups })).line).toBe('Counted by your camera');
    expect(deckCardProof(todayChallenge({ capture: walk })).line).toBe('Measured by your phone');
    expect(
      deckCardProof(todayChallenge({ completionKind: 'vitals_bp', capture: reading })).line,
    ).toBe('You enter the reading');
    expect(deckCardProof(todayChallenge({ completionKind: 'check_in', capture: sleep })).line).toBe(
      'You enter your times',
    );
    expect(deckCardProof(todayChallenge({})).line).toBe('You confirm it');
  });
});

describe('deckCardMeasure', () => {
  it('counts towards a target with a numeral', () => {
    expect(deckCardMeasure(todayChallenge({ capture: walk }))).toEqual({
      kind: 'count',
      value: 0,
      total: 10,
      unit: 'min',
      fill: 0,
    });
  });

  it('never gives a reading a number to chase', () => {
    expect(
      deckCardMeasure(todayChallenge({ completionKind: 'vitals_bp', capture: reading })),
    ).toEqual({
      kind: 'status',
      line: 'Not yet today',
      note: null,
    });
    expect(
      deckCardMeasure(
        todayChallenge({
          completionKind: 'vitals_bp',
          capture: reading,
          status: 'in_progress',
          progress: { filled: 1, required: 2 },
        }),
      ),
    ).toEqual({ kind: 'status', line: '1 of 2 entered', note: null });
  });

  it('says when a reading was last logged, never what it was', () => {
    const measure = deckCardMeasure(
      todayChallenge({ id: 'bp', completionKind: 'vitals_bp', capture: reading }),
      {
        detail: occurrenceDetail({ userChallengeId: 'bp', lastCompletedDayKey: '2026-10-19' }),
        todayKey: '2026-10-22',
      },
    );

    expect(measure).toEqual({
      kind: 'status',
      line: 'Not yet today',
      note: 'Last reading Monday',
    });
  });

  it('shows the best measured session so far, capped at the target', () => {
    const measureFor = (bestMeasuredInPeriod: number) =>
      deckCardMeasure(todayChallenge({ id: 'walk', capture: walk }), {
        detail: occurrenceDetail({ userChallengeId: 'walk', bestMeasuredInPeriod }),
        todayKey: '2026-10-22',
      });

    expect(measureFor(4)).toMatchObject({ kind: 'count', value: 4, total: 10, fill: 0.4 });
    expect(measureFor(14)).toMatchObject({ value: 10, fill: 1 });
  });

  it('shows the steps this phone has already counted, even when none are saved', () => {
    const steps = {
      kind: 'device_session',
      metric: 'steps',
      target: { ...noTarget, count: 5_000 },
    } as const;

    expect(
      deckCardMeasure(todayChallenge({ id: 'steps', capture: steps }), {
        detail: occurrenceDetail({ userChallengeId: 'steps', bestMeasuredInPeriod: null }),
        todayKey: '2026-10-22',
        phoneSteps: 1213,
      }),
    ).toMatchObject({ kind: 'count', value: 1213, total: 5000, unit: 'steps', fill: 1213 / 5000 });
  });

  it('keeps a saved step count when it is ahead of the phone', () => {
    const steps = {
      kind: 'device_session',
      metric: 'steps',
      target: { ...noTarget, count: 5_000 },
    } as const;

    expect(
      deckCardMeasure(todayChallenge({ id: 'steps', capture: steps }), {
        detail: occurrenceDetail({ userChallengeId: 'steps', bestMeasuredInPeriod: 2000 }),
        todayKey: '2026-10-22',
        phoneSteps: 1213,
      }),
    ).toMatchObject({ value: 2000 });
  });

  it('shows a photo slot, or a ring for a plain check-in', () => {
    expect(
      deckCardMeasure(todayChallenge({ completionKind: 'evidence_photo', capture: photo })).kind,
    ).toBe('photo');
    expect(deckCardMeasure(todayChallenge({})).kind).toBe('checkRing');
  });
});
