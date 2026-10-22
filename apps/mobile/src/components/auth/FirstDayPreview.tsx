import type { HealthCategory } from '@product/client';
import { firstDayFor } from './first-day';
import { FirstDayPlaceholder, FirstDayTimeline } from './FirstDayTimeline';
import { useStarterChallenges } from './use-starter-challenges';

const NOTHING_PICKED_MESSAGE = 'Tick what you’re looking after and your first day appears here.';
const OFFLINE_MESSAGE =
  'You’re offline. Your first day appears once you’re connected, and your picks are kept.';
const LOADING_MESSAGE = 'Putting your first day together…';

/** The day the picked conditions would start, changing as they are ticked. */
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
