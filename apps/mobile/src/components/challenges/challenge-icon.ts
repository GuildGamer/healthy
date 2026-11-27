import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

/** Matches `DEFAULT_CHALLENGE_ICON` in the contract. Kept local so screens do not load oRPC. */
export const FALLBACK_CHALLENGE_ICON = 'checkbox-marked-circle-outline';

/** Same glyph as the catalog push-up challenge (`arm-flex` in seed). */
export const PUSHUP_ICON_NAME = 'arm-flex';

/** Same glyph as the catalog walk challenge (`walk` in seed). */
export const WALK_ICON_NAME = 'walk';

export type ChallengeIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const glyphMap = MaterialCommunityIcons.glyphMap as Record<string, number>;

export function resolveChallengeIcon(name: string): ChallengeIconName {
  if (name in glyphMap) {
    return name as ChallengeIconName;
  }

  return FALLBACK_CHALLENGE_ICON;
}
