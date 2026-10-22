import type { ChallengeCompletionKind } from '@product/client';
import type { GlyphName } from '@/components/icons';

/** A reading's own mark on its sheet; anything else borrows its card's. */
export const SHEET_GLYPH_BY_COMPLETION: Partial<Record<ChallengeCompletionKind, GlyphName>> = {
  vitals_bp: 'bloodPressure',
  glucose: 'bloodSugar',
  peak_flow: 'breathing',
  water: 'water',
  carbs: 'leaf',
};
