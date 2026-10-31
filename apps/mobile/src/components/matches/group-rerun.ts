import type { CreateMatchInput, MatchBoard } from '@product/client';
import {
  MATCH_PRESET_DAYS,
  matchDailyScopeSchema,
  matchMetricSchema,
  matchScoringModeSchema,
  matchWindowSchema,
} from '@product/contract/match-board';
import {
  type MatchLengthChoice,
  clampCustomDays,
  legalChoiceFor,
  matchLengthInput,
} from './match-length';
import type { GroupRules } from './group-rule-copy';
import { legalScoringModeFor, MATCH_DEFAULT_METRIC } from './match-metric';

const DAY_MS = 86_400_000;

/** Whole days a finished contest ran, so "the same again" is the same length. */
export function contestDays(board: Pick<MatchBoard, 'startsAt' | 'endsAt'>): number {
  const span = new Date(board.endsAt).getTime() - new Date(board.startsAt).getTime();
  return Math.max(1, Math.round(span / DAY_MS));
}

/**
 * A one-day contest ran to midnight, so it comes back as Today rather than as
 * a 24-hour span; the presets come back as themselves.
 */
export function rerunLengthFor(
  board: Pick<MatchBoard, 'startsAt' | 'endsAt' | 'scoringMode'>,
): MatchLengthChoice {
  const days = contestDays(board);
  const preset = matchWindowSchema.options.find((window) => MATCH_PRESET_DAYS[window] === days);
  const choice: MatchLengthChoice = preset
    ? { kind: 'preset', window: preset }
    : { kind: 'custom', days };

  return legalChoiceFor(choice, board.scoringMode);
}

/**
 * The same rules, length and people, continuing the chain from the finished
 * contest. People come back through a saved crew, so anyone who has left it
 * is not pulled into the next one.
 */
export function rerunCreateInput(board: MatchBoard, crewId: string | null): CreateMatchInput {
  return {
    ...matchLengthInput(rerunLengthFor(board)),
    metric: board.metric,
    scoringMode: board.scoringMode,
    dailyScope: board.dailyScope,
    ...(crewId ? { crewId } : {}),
    parentMatchId: board.id,
  };
}

/** What "Change something" hands the start screen, as route params. */
export type CreatePrefillParams = {
  metric?: string;
  scoringMode?: string;
  dailyScope?: string;
  length?: string;
  crewId?: string;
  parentMatchId?: string;
  title?: string;
  /** Comma-separated user ids from a milestone push or deep link. */
  participantUserIds?: string;
};

export function createPrefillParams(board: MatchBoard, crewId: string | null): CreatePrefillParams {
  const length = rerunLengthFor(board);
  return {
    metric: board.metric,
    scoringMode: board.scoringMode,
    dailyScope: board.dailyScope,
    length: length.kind === 'preset' ? length.window : String(length.days),
    ...(crewId ? { crewId } : {}),
    parentMatchId: board.id,
  };
}

export type CreatePrefill = GroupRules & {
  length: MatchLengthChoice;
  crewId: string | null;
  parentMatchId: string | null;
  title: string | null;
  participantUserIds: string[];
};

function defaultPrefill(): CreatePrefill {
  return {
    scoringMode: 'cumulative_total',
    metric: MATCH_DEFAULT_METRIC,
    dailyScope: 'any_challenge',
    length: { kind: 'preset', window: 'week' },
    crewId: null,
    parentMatchId: null,
    title: null,
    participantUserIds: [],
  };
}

function parseParticipantUserIds(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    ),
  ];
}

function parseLength(raw: string | undefined, rules: GroupRules): MatchLengthChoice {
  const preset = matchWindowSchema.safeParse(raw);
  if (preset.success) {
    return legalChoiceFor({ kind: 'preset', window: preset.data }, rules.scoringMode);
  }

  const days = Number(raw);
  if (!Number.isInteger(days)) {
    return legalChoiceFor(defaultPrefill().length, rules.scoringMode);
  }

  return { kind: 'custom', days: clampCustomDays(days, rules.scoringMode) };
}

/**
 * Where the start screen opens. Opening it fresh starts on a 7-day push-up
 * total (walking on Android); arriving from "Change something" starts on the
 * finished contest. Anything unreadable falls back rather than sending a pair
 * the API rejects.
 */
export function createPrefillFrom(params: CreatePrefillParams): CreatePrefill {
  const metric = matchMetricSchema.safeParse(params.metric);
  if (!metric.success) {
    return defaultPrefill();
  }

  const defaults = defaultPrefill();
  const scoringMode = matchScoringModeSchema.safeParse(params.scoringMode);
  const dailyScope = matchDailyScopeSchema.safeParse(params.dailyScope);

  const rules = {
    metric: metric.data,
    scoringMode: legalScoringModeFor(
      metric.data,
      scoringMode.success ? scoringMode.data : defaults.scoringMode,
    ),
    dailyScope: dailyScope.success ? dailyScope.data : defaults.dailyScope,
  };
  return {
    ...rules,
    length: parseLength(params.length, rules),
    crewId: params.crewId ?? null,
    parentMatchId: params.parentMatchId ?? null,
    title: params.title?.trim() || null,
    participantUserIds: parseParticipantUserIds(params.participantUserIds),
  };
}
