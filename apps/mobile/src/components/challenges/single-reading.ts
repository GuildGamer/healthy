import type { ChallengeCompletionKind, ChallengeDraft, TodayChallenge } from '@product/client';
import { CARBS_RULES, GLUCOSE_RULES, PEAK_FLOW_RULES } from './constants/reading-rules';
import { isInRange, readingValue } from './reading-entry';
import type { ReadingRules } from './types/reading-entry';
import type { SingleReadingKind, SingleReadingState } from './types/single-reading';
import type { CompletionPayload } from './useCompleteChallenge';

export const SINGLE_READING_RULES: Record<SingleReadingKind, ReadingRules> = {
  glucose: GLUCOSE_RULES,
  peak_flow: PEAK_FLOW_RULES,
  carbs: CARBS_RULES,
};

export function isSingleReadingKind(kind: ChallengeCompletionKind): kind is SingleReadingKind {
  return kind === 'glucose' || kind === 'peak_flow' || kind === 'carbs';
}

function draftNumber(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function initialSingleReading(draft: TodayChallenge['draft']): SingleReadingState {
  const empty: SingleReadingState = { value: '', context: null, note: '', isWritingNote: false };

  if (draft?.kind === 'glucose') {
    return {
      ...empty,
      value: draftNumber(draft.fields.mmolL),
      context: draft.fields.context ?? null,
    };
  }

  if (draft?.kind === 'peak_flow') {
    return { ...empty, value: draftNumber(draft.fields.bestLitresPerMinute) };
  }

  if (draft?.kind === 'carbs') {
    const note = draft.fields.note ?? '';
    return { ...empty, value: draftNumber(draft.fields.grams), note, isWritingNote: note !== '' };
  }

  return empty;
}

export function canSaveSingleReading(kind: SingleReadingKind, state: SingleReadingState): boolean {
  if (kind === 'carbs' && state.isWritingNote) {
    return state.note.trim().length > 0;
  }

  if (kind === 'glucose' && state.context === null) {
    return false;
  }

  return isInRange(state.value, SINGLE_READING_RULES[kind]);
}

/** The proof to finish with, or null while the sheet cannot save yet. */
export function singleReadingPayload(
  kind: SingleReadingKind,
  state: SingleReadingState,
): CompletionPayload | null {
  if (!canSaveSingleReading(kind, state)) {
    return null;
  }

  const value = readingValue(state.value);

  if (kind === 'carbs') {
    return state.isWritingNote
      ? { carbs: { note: state.note.trim() } }
      : { carbs: { grams: value ?? undefined } };
  }

  if (value === null) {
    return null;
  }

  if (kind === 'glucose') {
    return state.context ? { glucose: { mmolL: value, context: state.context } } : null;
  }

  return { peakFlow: { bestLitresPerMinute: value } };
}

export function singleReadingDraft(
  kind: SingleReadingKind,
  state: SingleReadingState,
): ChallengeDraft {
  const value = readingValue(state.value) ?? undefined;

  if (kind === 'glucose') {
    return { kind, fields: { mmolL: value, context: state.context ?? undefined } };
  }

  if (kind === 'peak_flow') {
    return { kind, fields: { bestLitresPerMinute: value } };
  }

  return { kind, fields: { grams: value, note: state.note.trim() || undefined } };
}
