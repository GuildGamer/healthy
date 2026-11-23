import type { PeriodReportPeriod } from '@product/contract';
import { brandedMail, type MailParts } from './mail-layout.js';

export type RecapMailTone = 'quiet' | 'warm' | 'hot' | 'fire';

type RecapCopy = {
  headline: string;
  body: string;
};

/** Approximate days in the period window for tone buckets. */
export function periodCapacity(period: PeriodReportPeriod): number {
  if (period === 'week') {
    return 7;
  }
  if (period === 'month') {
    return 30;
  }
  return 365;
}

/**
 * Quiet = nothing logged. Warm / hot / fire follow week fractions
 * (1–3 / 4–5 / 6–7) scaled to the period length.
 */
export function recapMailTone(
  activeDays: number,
  period: PeriodReportPeriod,
): RecapMailTone {
  if (activeDays <= 0) {
    return 'quiet';
  }

  const capacity = periodCapacity(period);
  const ratio = activeDays / capacity;
  if (ratio >= 6 / 7) {
    return 'fire';
  }
  if (ratio >= 4 / 7) {
    return 'hot';
  }
  return 'warm';
}

const PERIOD_WORD: Record<PeriodReportPeriod, string> = {
  week: 'week',
  month: 'month',
  year: 'year',
};

const COPY: Record<RecapMailTone, (periodWord: string) => readonly RecapCopy[]> =
  {
    quiet: (periodWord) => [
      {
        headline: `Quiet ${periodWord}`,
        body: `Nothing on the board yet. One set is enough to change that.`,
      },
      {
        headline: `${capitalize(periodWord)} went quiet`,
        body: `No days logged. Open the app when you’re ready to put one up.`,
      },
    ],
    warm: (periodWord) => [
      {
        headline: `A few days in`,
        body: `You showed up this ${periodWord}. Next one’s there if you want to climb.`,
      },
      {
        headline: `You’re on the board`,
        body: `Some days locked in this ${periodWord}. Keep going when you’re back in.`,
      },
    ],
    hot: (periodWord) => [
      {
        headline: `Most days covered`,
        body: `You were around a lot this ${periodWord}. Keep that energy when you open the app.`,
      },
      {
        headline: `Solid ${periodWord}`,
        body: `You hit most days. That’s a real presence on the board.`,
      },
    ],
    fire: (periodWord) => [
      {
        headline: `Almost every day`,
        body: `This ${periodWord} was yours. Drop the card in the chat before anyone asks who won.`,
      },
      {
        headline: `You ran the table`,
        body: `Barely missed a day. Share it while the crew still remembers.`,
      },
    ],
  };

function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value[0]!.toUpperCase() + value.slice(1);
}

/** Stable pick so the same period label keeps the same line. */
export function pickRecapCopy(
  tone: RecapMailTone,
  period: PeriodReportPeriod,
  seed: string,
): RecapCopy {
  const options = COPY[tone](PERIOD_WORD[period]);
  const index = hashSeed(seed) % options.length;
  return options[index]!;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** One inbox emoji for active tones; quiet stays plain. */
const SUBJECT_EMOJI: Record<RecapMailTone, string | null> = {
  quiet: null,
  warm: '👊',
  hot: '🔥',
  fire: '🏆',
};

function periodTitle(period: PeriodReportPeriod, tone: RecapMailTone): string {
  const base =
    period === 'week'
      ? 'Your week on Beatset'
      : period === 'month'
        ? 'Your month on Beatset'
        : 'Your year on Beatset';
  const emoji = SUBJECT_EMOJI[tone];
  return emoji ? `${base} ${emoji}` : base;
}

/**
 * Numbers live on the share card (when embedded). Body is tone-only copy.
 * `highlightLine` is kept for callers / future card alt text and is not
 * repeated in the email body.
 *
 * Quiet weeks send people to the day deck (`homeUrl`); active periods open
 * the report (`reportUrl`).
 */
export function periodRecapMail(input: {
  period: PeriodReportPeriod;
  periodLabel: string;
  activeDays: number;
  highlightLine: string | null;
  reportUrl: string;
  homeUrl: string;
}): MailParts {
  const tone = recapMailTone(input.activeDays, input.period);
  const copy = pickRecapCopy(
    tone,
    input.period,
    `${input.periodLabel}:${input.activeDays}`,
  );
  const quiet = tone === 'quiet';

  return brandedMail({
    subject: periodTitle(input.period, tone),
    eyebrow: input.periodLabel,
    headline: copy.headline,
    bodyLines: [copy.body],
    preheader: copy.body,
    /** Streak fill as the Clinic rail until per-user fill is wired. */
    accentRail: quiet ? '#1A2540' : '#4F3416',
    cta: {
      label: quiet ? 'Do a set' : 'Open in Beatset',
      url: quiet ? input.homeUrl : input.reportUrl,
    },
  });
}
