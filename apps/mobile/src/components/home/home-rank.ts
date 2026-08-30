export function weeklyRankLabel(rank: number | null | undefined): string {
  if (rank == null) {
    return "This week's board";
  }

  return `Rank ${rank} this week`;
}
