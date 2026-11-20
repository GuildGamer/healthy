import type { ColorScheme } from '@product/brand';
import {
  walkCardAppearance,
  type WalkCardCopy,
} from '@/lib/walk-session-card';

/** Lock-screen copy for a steps challenge session. */
export function stepsCardCopy(state: {
  count: number;
  targetCount: number | null;
  scheme: ColorScheme;
}): WalkCardCopy {
  const count = Math.max(0, Math.floor(state.count));
  const target =
    typeof state.targetCount === 'number' && state.targetCount > 0
      ? Math.floor(state.targetCount)
      : null;
  const appearance = walkCardAppearance(state.scheme);
  const progress = target !== null ? Math.min(count / target, 1) : null;

  return {
    title: count.toLocaleString('en-GB'),
    body: target !== null ? `of ${target.toLocaleString('en-GB')} steps` : 'steps today',
    progress,
    appearance,
  };
}
