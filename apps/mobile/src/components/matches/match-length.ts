import {
  MATCH_LENGTH_MAX_DAYS,
  MATCH_MIN_DAYS_BY_SCORING_MODE,
  MATCH_WINDOWS_BY_SCORING_MODE,
  isWindowAllowedForScoringMode,
  resolveMatchLength,
  type MatchLength,
  type MatchScoringMode,
  type MatchWindow,
} from '@product/contract/match-board';

/** What the host has selected in the "How long" row. */
export type MatchLengthChoice =
  | { kind: 'preset'; window: MatchWindow }
  | { kind: 'custom'; days: number };

/**
 * Where the custom field opens: double the longest preset, so the control
 * arrives already saying "longer than the shortcuts" rather than restating one.
 */
export const MATCH_CUSTOM_DAYS_DEFAULT = 60;

export function customDaysFloor(scoringMode: MatchScoringMode): number {
  return MATCH_MIN_DAYS_BY_SCORING_MODE[scoringMode];
}

export function clampCustomDays(
  days: number,
  scoringMode: MatchScoringMode,
): number {
  if (!Number.isFinite(days)) {
    return MATCH_CUSTOM_DAYS_DEFAULT;
  }

  return Math.min(
    MATCH_LENGTH_MAX_DAYS,
    Math.max(customDaysFloor(scoringMode), Math.round(days)),
  );
}

/**
 * A mode can outlaw the length already chosen — consistency has no one-day
 * option — so the choice moves to the nearest legal one rather than being sent
 * for the API to reject.
 */
export function legalChoiceFor(
  choice: MatchLengthChoice,
  scoringMode: MatchScoringMode,
): MatchLengthChoice {
  if (choice.kind === 'custom') {
    return { kind: 'custom', days: clampCustomDays(choice.days, scoringMode) };
  }

  if (isWindowAllowedForScoringMode(scoringMode, choice.window)) {
    return choice;
  }

  const fallback = MATCH_WINDOWS_BY_SCORING_MODE[scoringMode][0];
  return fallback ? { kind: 'preset', window: fallback } : choice;
}

/**
 * The half of the create payload that says how long. A preset and a day count
 * are alternatives in the contract, so exactly one field goes over the wire.
 */
export function matchLengthInput(
  choice: MatchLengthChoice,
): { window: MatchWindow } | { durationDays: number } {
  if (choice.kind === 'custom') {
    return { durationDays: choice.days };
  }

  return { window: choice.window };
}

/** The same choice as the contract models it, for copy that counts days. */
export function matchChosenLength(choice: MatchLengthChoice): MatchLength {
  return resolveMatchLength(matchLengthInput(choice));
}
