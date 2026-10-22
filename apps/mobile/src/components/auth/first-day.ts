import type { HealthCategory, StarterChallenge } from '@product/client';
import type { GlyphName } from '@/components/icons';
import { healthCategories } from '@/constants/health-categories';

/** A first day reads as a short plan, never a to-do list. */
export const FIRST_DAY_VISIBLE_STEPS = 3;

export interface FirstDayStep {
  challengeId: string;
  title: string;
  description: string;
  category: HealthCategory;
  glyph: GlyphName;
}

export interface FirstDay {
  steps: FirstDayStep[];
  /** Starter challenges beyond the visible steps; they wait in Challenges. */
  hiddenCount: number;
}

const CATEGORY_GLYPHS = new Map(
  healthCategories.map((category) => [category.id, category.glyph] as const),
);

function glyphFor(challenge: StarterChallenge): GlyphName {
  if (challenge.capture.metric === 'walk' || challenge.capture.metric === 'run') {
    return 'walk';
  }

  if (challenge.completionKind === 'water') {
    return 'water';
  }

  return CATEGORY_GLYPHS.get(challenge.category) ?? 'everydayHealth';
}

/**
 * The day an account would start with: starter challenges for each picked
 * condition, plus the ones everyone gets. Picked conditions lead, in the
 * order they were picked.
 */
export function firstDayFor(
  starters: readonly StarterChallenge[],
  picked: readonly HealthCategory[],
): FirstDay {
  if (picked.length === 0) {
    return { steps: [], hiddenCount: 0 };
  }

  const pickedSteps = picked.flatMap((category) =>
    starters.filter((challenge) => challenge.category === category && !challenge.isUniversal),
  );
  const universalSteps = starters.filter((challenge) => challenge.isUniversal);
  const steps = [...pickedSteps, ...universalSteps].map((challenge) => ({
    challengeId: challenge.challengeId,
    title: challenge.title,
    description: challenge.description,
    category: challenge.category,
    glyph: glyphFor(challenge),
  }));

  return {
    steps: steps.slice(0, FIRST_DAY_VISIBLE_STEPS),
    hiddenCount: Math.max(steps.length - FIRST_DAY_VISIBLE_STEPS, 0),
  };
}
