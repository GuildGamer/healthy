import type { ReminderRivalry } from '../types/reminder-rivalry.js';

export type RivalryCopy = { title: string; body: string };

function scoreGap(rivalry: ReminderRivalry): number {
  return Math.abs(rivalry.rivalScore - rivalry.yourScore);
}

/** "6", or "1 day" / "3 days" when the contest counts days shown up. */
function gapPhrase(rivalry: ReminderRivalry, gap: number): string {
  if (rivalry.scoringMode !== 'days_completed') {
    return String(gap);
  }

  return gap === 1 ? '1 day' : `${gap} days`;
}

/** What it takes to stay on top, in the contest's own terms. */
function defendAction(rivalry: ReminderRivalry): string {
  if (rivalry.scoringMode === 'days_completed') {
    return 'Show up today to stay ahead.';
  }

  if (rivalry.metric === 'walk') {
    return 'A walk keeps it that way.';
  }

  return 'One set keeps it that way.';
}

function closingCopy(rivalry: ReminderRivalry): RivalryCopy {
  const gap = scoreGap(rivalry);
  const title = `${rivalry.timeLeft} in ${rivalry.contestTitle}`;

  if (gap === 0) {
    return { title, body: `Level with ${rivalry.rivalName}. Next one takes it.` };
  }

  return { title, body: `You're ${gapPhrase(rivalry, gap)} behind ${rivalry.rivalName}.` };
}

function defendCopy(rivalry: ReminderRivalry): RivalryCopy {
  const gap = scoreGap(rivalry);
  const title =
    gap === 0
      ? `${rivalry.rivalName}'s level with you`
      : `${rivalry.rivalName}'s ${gapPhrase(rivalry, gap)} behind you`;

  return { title, body: `${defendAction(rivalry)} ${rivalry.timeLeft}.` };
}

/**
 * Group-stakes copy for the daily reminder. Titles name the rival or the
 * contest; bodies carry the gap or the clock. Never a health word.
 */
export function rivalryCopy(rivalry: ReminderRivalry): RivalryCopy {
  switch (rivalry.situation) {
    case 'group_closing':
      return closingCopy(rivalry);

    case 'group_streak_gap':
      return {
        title: `${rivalry.rivalName} showed up today`,
        body: `You haven't yet · ${rivalry.timeLeft}`,
      };

    case 'group_rival_moved':
      return {
        title: `${rivalry.rivalName} scored today`,
        body: `${rivalry.rivalScore} to your ${rivalry.yourScore} · ${rivalry.timeLeft}`,
      };

    case 'group_defend':
      return defendCopy(rivalry);
  }
}
