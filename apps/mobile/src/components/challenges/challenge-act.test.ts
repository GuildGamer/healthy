import { todayChallenge } from '@/components/home/testing/today-fixtures';
import { deckCardVerb, resolveChallengeAct } from './challenge-act';
import { PUSHUPS_TWENTY, SELF_REPORT, WALK_TEN } from './testing/catalog-fixtures';

const noTarget = { durationMinutes: null, distanceMeters: null, count: null };
const reading = { kind: 'structured_log' as const, metric: null, target: noTarget };
const photo = { kind: 'photo' as const, metric: null, target: noTarget };
const waterCapture = {
  kind: 'structured_log' as const,
  metric: null,
  target: { ...noTarget, count: 8 },
};

describe('resolveChallengeAct', () => {
  it('adds a glass for open water', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          completionKind: 'water',
          capture: waterCapture,
          status: 'pending',
        }),
      ),
    ).toEqual({ kind: 'addGlass' });
  });

  it('marks a self-report check-in done on the spot', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          completionKind: 'check_in',
          capture: SELF_REPORT,
          status: 'pending',
        }),
      ),
    ).toEqual({ kind: 'markDone' });
  });

  it('opens the pose screen for a camera set', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          challengeId: 'c-push',
          capture: PUSHUPS_TWENTY,
          status: 'pending',
        }),
      ),
    ).toEqual({ kind: 'route', route: '/challenge/c-push/pose' });
  });

  it('opens the walk session', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          challengeId: 'c-walk',
          capture: WALK_TEN,
          status: 'pending',
        }),
      ),
    ).toEqual({ kind: 'route', route: '/challenge/c-walk/session' });
  });

  it('opens the log sheet for a reading', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          challengeId: 'c-bp',
          completionKind: 'vitals_bp',
          capture: reading,
          status: 'pending',
        }),
      ),
    ).toEqual({ kind: 'route', route: '/challenge/c-bp/log' });
  });

  it('opens the evidence screen for a photo challenge', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          challengeId: 'c-gym',
          completionKind: 'evidence_photo',
          capture: photo,
          status: 'pending',
        }),
      ),
    ).toEqual({ kind: 'route', route: '/challenge/c-gym/evidence' });
  });

  it('has no primary act once today’s occurrence is done', () => {
    expect(
      resolveChallengeAct(
        todayChallenge({
          capture: PUSHUPS_TWENTY,
          status: 'completed',
        }),
      ),
    ).toEqual({ kind: 'none' });
  });
});

describe('deckCardVerb', () => {
  it('names the next gesture', () => {
    expect(deckCardVerb(todayChallenge({ capture: PUSHUPS_TWENTY }))).toBe('Start set');
    expect(deckCardVerb(todayChallenge({ capture: WALK_TEN }))).toBe('Start a walk');
    expect(
      deckCardVerb(
        todayChallenge({ completionKind: 'water', capture: waterCapture, status: 'pending' }),
      ),
    ).toBe('Add a glass');
    expect(deckCardVerb(todayChallenge({ capture: SELF_REPORT }))).toBe('Mark as done');
  });
});
