import { DECK_KIND_GLYPH, type DeckCardKind } from '@/components/deck';
import type { SharePoster } from './types/share-poster';

const DECK_KINDS = Object.keys(DECK_KIND_GLYPH) as DeckCardKind[];

function isDeckCardKind(value: string | undefined): value is DeckCardKind {
  return DECK_KINDS.some((kind) => kind === value);
}

/** Route params for the share screen; all strings, as a URL carries them. */
export function sharePosterParams(poster: SharePoster): Record<string, string> {
  return {
    kind: poster.kind,
    label: poster.label,
    value: poster.value,
    unit: poster.unit,
    ...(poster.when ? { when: poster.when } : {}),
  };
}

/** Reads the poster back from the route, or null when a link arrives without one. */
export function parseSharePoster(
  params: Partial<Record<keyof SharePoster, string>>,
): SharePoster | null {
  const { kind, label, value, unit } = params;
  if (!isDeckCardKind(kind) || !label || !value || !unit) {
    return null;
  }

  const when = keptWhen(params.when);
  return { kind, label, value, unit, ...(when ? { when } : {}) };
}

function keptWhen(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) {
    return undefined;
  }

  return value;
}

/** The day a stored finish belongs to, or now when the poster was just earned. */
export function posterWhen(poster: SharePoster): Date {
  if (!poster.when) {
    return new Date();
  }

  const parsed = Date.parse(poster.when);
  return Number.isNaN(parsed) ? new Date() : new Date(parsed);
}

/** A sentence for the share sheet when the image cannot be made. Never a reading. */
export function posterShareText(poster: SharePoster): string {
  if (poster.value === 'Logged' || poster.value === 'Done') {
    return `${poster.value} · ${poster.label} · ${poster.unit}`;
  }

  return `${poster.value} ${poster.unit}`;
}

/** Short results stay huge. A word such as "Logged" has to fit the card. */
export function posterValueMetrics(value: string): {
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
} {
  if (value.length <= 3) {
    return { fontSize: 120, letterSpacing: -6, lineHeight: 120 };
  }

  if (value.length <= 5) {
    return { fontSize: 72, letterSpacing: -2, lineHeight: 76 };
  }

  return { fontSize: 48, letterSpacing: -0.5, lineHeight: 52 };
}

/** "7 days running" under the poster, or nothing before there is a run. */
export function posterRunLine(streakDays: number): string | null {
  if (streakDays <= 0) {
    return null;
  }

  return streakDays === 1 ? '1 day running' : `${streakDays} days running`;
}
