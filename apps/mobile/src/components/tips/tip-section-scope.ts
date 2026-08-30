import type { HealthCategory } from '@product/client';
import { healthCategoryName } from '@/constants/health-categories';
import type { TipCategoryGroup } from './select-daily-tip';

export type TipSectionScope = 'all' | HealthCategory;

export function labelForTipScope(scope: TipSectionScope): string {
  return scope === 'all' ? 'All tips' : healthCategoryName(scope);
}

export function groupsForScope(
  groups: readonly TipCategoryGroup[],
  scope: TipSectionScope,
): TipCategoryGroup[] {
  if (scope === 'all') {
    return [...groups];
  }

  return groups.filter((group) => group.category === scope);
}

export function resolveTipScope(
  scope: TipSectionScope,
  groups: readonly TipCategoryGroup[],
): TipSectionScope {
  if (scope === 'all') {
    return 'all';
  }

  return groups.some((group) => group.category === scope) ? scope : 'all';
}
