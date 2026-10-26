import type { MatchBoard } from '@product/client';
import { Platform } from 'react-native';
import {
  createPrefillFrom,
  createPrefillParams,
  rerunCreateInput,
  rerunLengthFor,
} from './group-rerun';

const DAY_MS = 86_400_000;
const start = new Date('2026-10-15T09:00:00.000Z');

function finished(days: number, overrides: Partial<MatchBoard> = {}): MatchBoard {
  return {
    id: 'm1',
    token: 'token_1',
    inviteUrl: 'https://gethealthyapp.com/match/token_1',
    metric: 'walk',
    scoringMode: 'cumulative_total',
    dailyScope: 'any_challenge',
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + days * DAY_MS).toISOString(),
    status: 'completed',
    participantCount: 3,
    participantCap: 8,
    yourScore: 0,
    yourBestCount: 0,
    winnerUserId: null,
    standings: [],
    canSaveCrew: true,
    ...overrides,
  };
}

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

describe('rerunLengthFor', () => {
  it('brings a preset back as itself', () => {
    expect(rerunLengthFor(finished(7))).toEqual({ kind: 'preset', window: 'week' });
    expect(rerunLengthFor(finished(30))).toEqual({ kind: 'preset', window: 'month' });
  });

  it('brings a part-day contest back as Today, and an odd length as days', () => {
    expect(rerunLengthFor(finished(0.4))).toEqual({ kind: 'preset', window: 'today' });
    expect(rerunLengthFor(finished(12))).toEqual({ kind: 'custom', days: 12 });
  });
});

describe('rerunCreateInput', () => {
  it('keeps the rules, seats the crew, and continues the chain', () => {
    expect(rerunCreateInput(finished(7), 'crew-1')).toEqual({
      window: 'week',
      metric: 'walk',
      scoringMode: 'cumulative_total',
      dailyScope: 'any_challenge',
      crewId: 'crew-1',
      parentMatchId: 'm1',
    });
  });
});

describe('createPrefillFrom', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    setPlatformOs(originalOs);
  });

  it('opens fresh on a 7-day push-up total', () => {
    setPlatformOs('ios');
    expect(createPrefillFrom({})).toMatchObject({
      metric: 'pushups',
      scoringMode: 'cumulative_total',
      length: { kind: 'preset', window: 'week' },
      crewId: null,
    });
  });

  it('opens fresh on walking on Android, where camera exercises are unavailable', () => {
    setPlatformOs('android');
    expect(createPrefillFrom({})).toMatchObject({
      metric: 'walk',
      scoringMode: 'cumulative_total',
      length: { kind: 'preset', window: 'week' },
    });
  });

  it('round-trips what Change something hands over', () => {
    const board = finished(12, { scoringMode: 'days_completed', metric: 'pushups' });

    expect(createPrefillFrom(createPrefillParams(board, 'crew-1'))).toEqual({
      metric: 'pushups',
      scoringMode: 'days_completed',
      dailyScope: 'any_challenge',
      length: { kind: 'custom', days: 12 },
      crewId: 'crew-1',
      parentMatchId: 'm1',
      title: null,
      participantUserIds: [],
    });
  });

  it('never opens on a pair the API rejects', () => {
    expect(
      createPrefillFrom({ metric: 'walk', scoringMode: 'best_single', dailyScope: 'any_challenge' })
        .scoringMode,
    ).toBe('cumulative_total');
  });
});
