import { DECK_KIND_GLYPH, type DeckCardKind } from '@/components/deck';
import type { SharePoster, SharePosterFact, SharePosterKind } from './types/share-poster';

const DECK_KINDS = Object.keys(DECK_KIND_GLYPH) as DeckCardKind[];

function isSharePosterKind(value: string | undefined): value is SharePosterKind {
  return value === 'streak' || DECK_KINDS.some((kind) => kind === value);
}

/** Route params for the share screen; all strings, as a URL carries them. */
export function sharePosterParams(poster: SharePoster): Record<string, string> {
  return {
    kind: poster.kind,
    label: poster.label,
    value: poster.value,
    unit: poster.unit,
    ...(poster.when ? { when: poster.when } : {}),
    ...(poster.corner ? { corner: poster.corner } : {}),
    ...(poster.facts && poster.facts.length > 0
      ? { facts: encodeShareFacts(poster.facts) }
      : {}),
  };
}

/** Optional brand footer line for progress shares (e.g. "2 days on"). */
export function shareRunLineParams(runLine: string | null | undefined): Record<string, string> {
  if (!runLine) {
    return {};
  }
  return { runLine };
}

/** Reads the poster back from the route, or null when a link arrives without one. */
export function parseSharePoster(
  params: Partial<Record<keyof SharePoster | 'facts', string>>,
): SharePoster | null {
  const { kind, label, value, unit } = params;
  if (!isSharePosterKind(kind) || !label || !value || !unit) {
    return null;
  }

  const when = keptWhen(params.when);
  const facts = parseShareFacts(
    typeof params.facts === 'string' ? params.facts : undefined,
  );
  return {
    kind,
    label,
    value,
    unit,
    ...(when ? { when } : {}),
    ...(params.corner ? { corner: params.corner } : {}),
    ...(facts ? { facts } : {}),
  };
}

function encodeShareFacts(facts: SharePosterFact[]): string {
  return JSON.stringify(facts.map((fact) => ({ label: fact.label, value: fact.value })));
}

function parseShareFacts(raw: string | undefined): SharePosterFact[] | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return undefined;
    }
    const facts: SharePosterFact[] = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as SharePosterFact).label !== 'string' ||
        typeof (item as SharePosterFact).value !== 'string'
      ) {
        return undefined;
      }
      facts.push({
        label: (item as SharePosterFact).label,
        value: (item as SharePosterFact).value,
      });
    }
    return facts;
  } catch {
    return undefined;
  }
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
