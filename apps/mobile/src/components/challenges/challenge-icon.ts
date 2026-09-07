import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { HealthCategory } from '@product/client';
import type { ComponentProps } from 'react';

/** Matches `DEFAULT_CHALLENGE_ICON` in the contract. Kept local so screens do not load oRPC. */
export const FALLBACK_CHALLENGE_ICON = 'checkbox-marked-circle-outline';

/** Same glyph as the catalog push-up challenge (`arm-flex` in seed). */
export const PUSHUP_ICON_NAME = 'arm-flex';

export type ChallengeIconName = ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

export const categoryIconTint: Record<
  HealthCategory,
  { tint: string; iconColor: string }
> = {
  hypertension: { tint: '#3A1F24', iconColor: '#F87171' },
  diabetes: { tint: '#1E2A3A', iconColor: '#60A5FA' },
  asthma: { tint: '#1F2E24', iconColor: '#4ADE80' },
  general: { tint: '#1F2E24', iconColor: '#4ADE80' },
};

const glyphMap = MaterialCommunityIcons.glyphMap as Record<string, number>;

export function resolveChallengeIcon(name: string): ChallengeIconName {
  if (name in glyphMap) {
    return name as ChallengeIconName;
  }

  return FALLBACK_CHALLENGE_ICON;
}
