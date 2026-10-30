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
      ? 'Your week on Healthy'
      : input.period === 'month'
        ? 'Your month on Healthy'
        : 'Your year on Healthy';

  const days =
    input.activeDays === 1 ? '1 day active' : `${input.activeDays} days active`;

  const bodyLines = [
    `${input.periodLabel}: ${days}.`,
    ...(input.highlightLine ? [input.highlightLine] : []),
    'Open Healthy to see the full report and share a card.',
  ];

  return brandedMail({
    subject: title,
    eyebrow: input.periodLabel,
    headline: days,
    bodyLines,
    cta: { label: 'Open in Healthy', url: input.openUrl },
  });
}
