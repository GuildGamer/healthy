import { createHash } from 'node:crypto';
import { rivalryCopy } from './rivalry-copy.js';
import { firstNameFromDisplay, starterStepLabel } from './starter-steps.js';
import { selectSituation } from './select-situation.js';
import type {
  ComposedReminderCopy,
  ReminderContext,
  ReminderSituation,
} from './types.js';

type CopyPair = { title: string; body: string };

export function composeReminderCopy(
  context: ReminderContext,
): ComposedReminderCopy {
  const situation = selectSituation(context);
  const copyVersion = pickCopyVersion(
    context.userId,
    context.dayKey,
    situation,
  );

  if (context.rivalry && situation === context.rivalry.situation) {
    // The rival's name already carries the push; no greeting, no tip line.
    return {
      ...rivalryCopy(context.rivalry),
      situation,
      templateKey: `cadence.${situation}`,
      copyVersion,
      matchId: context.rivalry.matchId,
    };
  }

  const firstName =
    copyVersion === 'v1a' ? context.firstName : null;
  const step = starterStepLabel({
    deviceMetric: context.lead?.deviceMetric ?? null,
    completionKind: context.lead?.completionKind ?? 'check_in',
  });
  const pair = copyForSituation(situation, {
    firstName,
    step,
    streakDays: context.streakDays,
    doneCount: context.doneCount,
    openCount: context.openCount,
    measuredCount: context.lead?.measuredCount ?? null,
    targetCount: context.lead?.targetCount ?? null,
    leadTitle: context.lead?.title ?? null,
    deviceMetric: context.lead?.deviceMetric ?? null,
  });

  let body = pair.body;
  let templateKey = `cadence.${situation}`;
  if (
    context.benefitBody &&
    shouldAppendBenefit(context.userId, context.dayKey)
  ) {
    body = `${body} ${truncateBenefitLine(context.benefitBody)}`;
    templateKey = `${templateKey}.benefit`;
  }

  return {
    title: pair.title,
    body,
    situation,
    templateKey,
    copyVersion,
    matchId: null,
  };
}

/** Stable ~1-in-4 treatment sends append a benefit line. */
export function shouldAppendBenefit(userId: string, dayKey: string): boolean {
  const digest = createHash('sha256')
    .update(`${userId}:${dayKey}:benefit`)
    .digest();
  return digest.readUInt32BE(0) % 4 === 0;
}

export function truncateBenefitLine(body: string, maxChars = 80): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) {
    return compact;
  }

  const cut = compact.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
  return `${clipped}…`;
}

export function pickCopyVersion(
  userId: string,
  dayKey: string,
  situation: ReminderSituation,
): 'v1a' | 'v1b' {
  const digest = createHash('sha256')
    .update(`${userId}:${dayKey}:${situation}`)
    .digest();
  return digest.readUInt32BE(0) % 2 === 0 ? 'v1a' : 'v1b';
}

type CopyInput = {
  firstName: string | null;
  step: string;
  streakDays: number;
  doneCount: number;
  openCount: number;
  measuredCount: number | null;
  targetCount: number | null;
  leadTitle: string | null;
  deviceMetric: string | null;
};

function withName(base: string, firstName: string | null): string {
  if (!firstName) {
    return base;
  }

  if (base.endsWith('?')) {
    return `${base.slice(0, -1)}, ${firstName}?`;
  }

  return `${base}, ${firstName}`;
}

function remainingCount(input: CopyInput): number | null {
  if (input.targetCount == null || input.measuredCount == null) {
    return null;
  }

  return Math.max(0, input.targetCount - input.measuredCount);
}

function copyForSituation(
  situation: ReminderSituation,
  input: CopyInput,
): CopyPair {
  switch (situation) {
    case 'awaiting_evidence':
      return {
        title: withName('You did the hard part', input.firstName),
        body: 'Just add the photo to lock in today.',
      };

    case 'in_progress_partial': {
      const left = remainingCount(input);
      if (left != null && left > 0 && input.deviceMetric === 'pushups') {
        return {
          title: withName("You're past halfway", input.firstName),
          body: `${left} more push-ups and you're done.`,
        };
      }

      return {
        title: withName("You're past halfway", input.firstName),
        body: `A little more and you're done — ${input.step}.`,
      };
    }

    case 'in_progress_none':
      return {
        title: withName('Pick up where you left off', input.firstName),
        body: `Prop your phone — even ${input.step} counts.`,
      };

    case 'missed_yesterday':
      return {
        title: withName('Fresh start', input.firstName),
        body: `One easy one today: ${input.step}?`,
      };

    case 'first_week':
      return {
        title: withName('Nice start', input.firstName),
        body: `A quick ${input.step}?`,
      };

    case 'morning_nothing_done':
      if (input.deviceMetric === 'steps' || input.deviceMetric === 'walk') {
        return {
          title: withName('A quick walk?', input.firstName),
          body: '5 minutes outside gets today started.',
        };
      }

      return {
        title: withName('Got 2 minutes?', input.firstName),
        body: `Drop and do ${input.step}. That's today started.`,
      };

    case 'midday_almost_done':
      return {
        title: withName(
          input.doneCount === 1 ? '1 down' : `${input.doneCount} down`,
          input.firstName,
        ),
        body:
          input.openCount === 1 && input.leadTitle
            ? `Just ${shortLabel(input.leadTitle)} left — ${input.step}.`
            : `${input.openCount} still open — ${input.step}.`,
      };

    case 'evening_streak':
      return {
        title: withName(
          `${input.streakDays} day${input.streakDays === 1 ? '' : 's'} and counting`,
          input.firstName,
        ),
        body: `${capitalize(input.step)} keeps it going. Takes a minute.`,
      };

    case 'evening_open':
      return {
        title: withName('Still time today', input.firstName),
        body: `${capitalize(input.step)} before bed?`,
      };

    case 'group_closing':
    case 'group_streak_gap':
    case 'group_rival_moved':
    case 'group_defend':
    case 'open_default':
      return {
        title: withName('Got a few minutes?', input.firstName),
        body: `${capitalize(input.step)} keeps today alive.`,
      };
  }
}

function shortLabel(title: string): string {
  return title
    .replace(/^Do\s+/i, '')
    .replace(/^Complete\s+/i, '')
    .replace(/^Check\s+/i, '')
    .trim() || title;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Re-export for callers that only need the name helper. */
export { firstNameFromDisplay };
