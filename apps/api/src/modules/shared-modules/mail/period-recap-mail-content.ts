import type { PeriodReportPeriod } from '@product/contract';
import { brandedMail, type MailParts } from './mail-layout.js';

export function periodRecapMail(input: {
  period: PeriodReportPeriod;
  periodLabel: string;
  activeDays: number;
  highlightLine: string | null;
  openUrl: string;
}): MailParts {
  const title =
    input.period === 'week'
      ? 'Your week on Beatset'
      : input.period === 'month'
        ? 'Your month on Beatset'
        : 'Your year on Beatset';

  const days =
    input.activeDays === 1 ? '1 day active' : `${input.activeDays} days active`;

  const bodyLines = [
    `${input.periodLabel}: ${days}.`,
    ...(input.highlightLine ? [input.highlightLine] : []),
    'Open Beatset to see the full report and share a card.',
  ];

  return brandedMail({
    subject: title,
    eyebrow: input.periodLabel,
    headline: days,
    bodyLines,
    cta: { label: 'Open in Beatset', url: input.openUrl },
  });
}
