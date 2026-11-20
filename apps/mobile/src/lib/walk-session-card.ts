import { type ColorScheme, palettes } from '@product/brand';
import { formatDistance, formatDuration } from '@/lib/geo-session';

/** What the lock-screen walk card shows while a recording is live. */
export type WalkCardState = {
  elapsedSeconds: number;
  distanceMeters: number;
  paused: boolean;
  /** Active app appearance — Light / Dark / Auto-resolved. */
  scheme: ColorScheme;
  /** 0–1 toward the walk goal when there is one. */
  progressRatio?: number | null;
};

/**
 * Matches the in-app walk hero: duration is the lead numeral, distance and
 * status sit underneath. Brand tokens follow the active colour scheme.
 */
export type WalkCardCopy = {
  title: string;
  body: string;
  progress: number | null;
  appearance: WalkCardAppearance;
};

export type WalkCardAppearance = {
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  progressViewTint: string;
  /** Label on the Pause / Resume control (`onAccent`). */
  buttonLabelColor: string;
  padding: number;
};

/** Lock-screen chrome for the given appearance scheme. */
export function walkCardAppearance(scheme: ColorScheme): WalkCardAppearance {
  const colors = palettes[scheme];
  return {
    backgroundColor: colors.surfaceRaised,
    titleColor: colors.text,
    subtitleColor: colors.muted,
    progressViewTint: colors.accent,
    buttonLabelColor: colors.onAccent,
    padding: 20,
  };
}

/**
 * Lock-screen copy for the current walk. Duration leads, the way `WalkHero`
 * does on the session screen.
 */
export function walkCardCopy(state: WalkCardState): WalkCardCopy {
  const duration = formatDuration(Math.max(0, Math.floor(state.elapsedSeconds)));
  const distance = formatDistance(Math.max(0, state.distanceMeters));
  const progress =
    typeof state.progressRatio === 'number' && Number.isFinite(state.progressRatio)
      ? Math.min(Math.max(state.progressRatio, 0), 1)
      : null;
  const appearance = walkCardAppearance(state.scheme);

  if (state.paused) {
    return {
      title: duration,
      body: `Paused · ${distance}`,
      progress,
      appearance,
    };
  }

  return {
    title: duration,
    body: distance,
    progress,
    appearance,
  };
}

export function walkCardAppearanceChanged(
  previous: WalkCardAppearance,
  next: WalkCardAppearance,
): boolean {
  return (
    previous.backgroundColor !== next.backgroundColor ||
    previous.titleColor !== next.titleColor ||
    previous.subtitleColor !== next.subtitleColor ||
    previous.progressViewTint !== next.progressViewTint ||
    previous.buttonLabelColor !== next.buttonLabelColor
  );
}

export function walkCardChanged(
  previous: WalkCardCopy | null,
  next: WalkCardCopy,
): boolean {
  if (!previous) {
    return true;
  }

  return (
    previous.title !== next.title ||
    previous.body !== next.body ||
    previous.progress !== next.progress ||
    walkCardAppearanceChanged(previous.appearance, next.appearance)
  );
}
