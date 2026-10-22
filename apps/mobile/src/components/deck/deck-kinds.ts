import type { ChallengeCompletionKind, DeviceMetric, HealthCategory } from '@product/client';
import type { GlyphName } from '@/components/icons';
import type { DeckCardKind } from './types';

/** Measured activities read as what you do, whatever condition they serve. */
export const DECK_KIND_BY_METRIC: Partial<Record<DeviceMetric, DeckCardKind>> = {
  pushups: 'strength',
  walk: 'walk',
  run: 'walk',
  cycle: 'walk',
  steps: 'walk',
};

export const DECK_KIND_BY_COMPLETION: Partial<Record<ChallengeCompletionKind, DeckCardKind>> = {
  vitals_bp: 'bloodPressure',
  water: 'water',
  evidence_photo: 'gym',
  check_in: 'mobility',
};

/** For the logs that have no kind of their own, such as glucose or peak flow. */
export const DECK_KIND_BY_CATEGORY: Record<HealthCategory, DeckCardKind> = {
  hypertension: 'bloodPressure',
  diabetes: 'water',
  asthma: 'mobility',
  general: 'walk',
};

export const DECK_KIND_GLYPH: Record<DeckCardKind, GlyphName> = {
  bloodPressure: 'bloodPressure',
  walk: 'walk',
  water: 'water',
  strength: 'strength',
  gym: 'gym',
  mobility: 'mobility',
};
