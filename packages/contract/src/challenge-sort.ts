/** Default catalog rank — marketing heroes use lower numbers. */
export const DEFAULT_CHALLENGE_SORT_ORDER = 100;

export type ChallengeSortable = {
  sortOrder: number;
  title: string;
};

/** Lower sortOrder first. */
export function compareChallengeSortOrder(
  left: Pick<ChallengeSortable, 'sortOrder'>,
  right: Pick<ChallengeSortable, 'sortOrder'>,
): number {
  return left.sortOrder - right.sortOrder;
}

/** Lower sortOrder first, then title. */
export function compareChallengeCatalogOrder(
  left: ChallengeSortable,
  right: ChallengeSortable,
): number {
  const sortCompare = compareChallengeSortOrder(left, right);
  if (sortCompare !== 0) {
    return sortCompare;
  }

  return left.title.localeCompare(right.title);
}
