import type { HealthCategory } from '@product/client';
import { firstDayFor } from './first-day';
import { FirstDayPlaceholder, FirstDayTimeline } from './FirstDayTimeline';
import { useStarterChallenges } from './use-starter-challenges';

const NOTHING_PICKED_MESSAGE = 'Your first contests appear here once you’re in.';
const OFFLINE_MESSAGE =
  'You’re offline. Your first day appears once you’re connected.';
const LOADING_MESSAGE = 'Putting your first day together…';

/** Preview of day-one fitness challenges. Kept for dormant condition-picker UI. */
export function FirstDayPreview({ picked }: { picked: readonly HealthCategory[] }) {
  const starters = useStarterChallenges();

  if (picked.length === 0) {
    return <FirstDayPlaceholder message={NOTHING_PICKED_MESSAGE} />;
  }

  if (starters.isError) {
    return <FirstDayPlaceholder message={OFFLINE_MESSAGE} offline />;
  }

  if (!starters.data) {
    return <FirstDayPlaceholder message={LOADING_MESSAGE} />;
  }

  return <FirstDayTimeline day={firstDayFor(starters.data.challenges, picked)} />;
}
