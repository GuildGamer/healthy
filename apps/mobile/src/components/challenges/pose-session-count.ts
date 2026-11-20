/**
 * Once Stop freezes a count, review and proof keep that number even if the
 * camera stays mounted and more frames arrive while the clip finalizes.
 */
export function poseDisplayCount(frozenCount: number | null, liveCount: number): number {
  return frozenCount ?? liveCount;
}

export function poseMeetsTarget(options: {
  count: number;
  target: number;
  isUnscored: boolean;
}): boolean {
  if (options.isUnscored) {
    return options.count > 0;
  }

  return options.target > 0 && options.count >= options.target;
}
