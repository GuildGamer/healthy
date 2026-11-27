import type { CatalogChallenge, ChallengeFrequency, HealthCategory } from '@product/client';
import { compareChallengeCatalogOrder } from '@product/contract/challenge-sort';
import { healthCategories } from '@/constants/health-categories';
import { pickFirstRunSuggestions } from '@/lib/first-run-suggestions';
import type { CatalogFilter, CatalogSection } from './types/routine';

/** Two to add next: from the conditions you chose, never locked, never already yours. */
export function pickCatalogSuggestions(
  catalog: readonly CatalogChallenge[],
  categories: readonly HealthCategory[],
): CatalogChallenge[] {
  return pickFirstRunSuggestions(catalog, categories);
}

/** Your conditions first, then the rest, each only when the catalogue has something in it. */
export function catalogCategoryOrder(
  catalog: readonly CatalogChallenge[],
  categories: readonly HealthCategory[],
): HealthCategory[] {
  const present = healthCategories
    .map((option) => option.id)
    .filter((category) => catalog.some((challenge) => challenge.category === category));

  return [
    ...present.filter((category) => categories.includes(category)),
    ...present.filter((category) => !categories.includes(category)),
  ];
}

/**
 * Everything you could add, by category. Unfiltered, the suggestions above it
 * are left out so nothing shows twice; filtered, they fold away, so they are in.
 */
export function catalogSections(
  catalog: readonly CatalogChallenge[],
  filter: CatalogFilter,
  order: readonly HealthCategory[],
  suggested: readonly CatalogChallenge[],
): CatalogSection[] {
  const suggestedIds = new Set(suggested.map((challenge) => challenge.challengeId));
  const addable = catalog
    .filter((challenge) => !challenge.isEnrolled)
    .filter((challenge) => filter !== 'all' || !suggestedIds.has(challenge.challengeId))
    .sort(compareChallengeCatalogOrder);

  return order
    .filter((category) => filter === 'all' || category === filter)
    .map((category) => ({
      category,
      challenges: addable.filter((challenge) => challenge.category === category),
    }))
    .filter((section) => section.challenges.length > 0);
}

/** Free members see members-only challenges like any other, with a small tag. */
export function isMembersOnly(
  challenge: Pick<CatalogChallenge, 'isLocked' | 'isEnrolled'>,
): boolean {
  return challenge.isLocked && !challenge.isEnrolled;
}

const PERIOD_WORD: Record<ChallengeFrequency, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

const ADDED_TO: Record<ChallengeFrequency, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

/** "+150 a day": what a challenge is worth each time it comes round. */
export function rewardCornerLabel(points: number, frequency: ChallengeFrequency): string {
  return `+${points} a ${PERIOD_WORD[frequency]}`;
}

/** Where a new challenge went: every rhythm is dealt onto Today straight away. */
export function addedToastMessage(frequency: ChallengeFrequency): string {
  return `Added to ${ADDED_TO[frequency]}`;
}

/** "Counted by camera · daily", the quiet line under a catalogue row. */
export function catalogRowMeta(proofLine: string, frequency: ChallengeFrequency): string {
  return `${proofLine} · ${frequency}`;
}

/** What else membership brings, so the ask names what you would get. */
export function membershipBoxBody(otherCount: number): string {
  const others = otherCount === 1 ? '1 other challenge' : `${otherCount} other challenges`;
  return `Along with ${others}, more reminders, and finishing every challenge for the day’s win.`;
}

/** How many other challenges membership opens, for the box on a locked preview. */
export function otherMembersOnlyCount(
  catalog: readonly CatalogChallenge[],
  challengeId: string,
): number {
  return catalog.filter(
    (challenge) => challenge.requiresMembership && challenge.challengeId !== challengeId,
  ).length;
}
