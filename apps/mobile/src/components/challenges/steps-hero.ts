/** The figure in front of "of 5,000 steps today". No count yet still reads as zero. */
export function stepsHeroValue(count: number | null): string {
  return (count ?? 0).toLocaleString('en-GB');
}
