import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
  SharePosterCard,
} from '@/components/challenges/SharePosterCard';
import type { ShareCorners } from '@/components/challenges/GymPhotoShareCard';
import type { ShareFillId } from '@/components/challenges/share-fill';
import { TODAY_COPY } from './constants/today-copy';
import { dayShareHero } from './day-share';
import type { DayShareContent } from './types/day-share';

/**
 * The day as a deck poster: streak (or today's tally) as one numeral, hairline
 * brand row. It is the shared share card filled with the streak colour, so it
 * can never drift from the other cards.
 */
export function DayShareCard({
  content,
  fillId,
  corners = 'round',
  width = SHARE_POSTER_WIDTH,
  height = SHARE_POSTER_HEIGHT,
}: {
  content: DayShareContent;
  /** Optional colour override from the share fill carousel. */
  fillId?: ShareFillId;
  corners?: ShareCorners;
  width?: number;
  height?: number;
}) {
  const hero = dayShareHero(content);
  const brandMeta =
    content.streakDays > 1
      ? `${content.completedCount} of ${content.totalCount}`
      : `+${content.pointsToday}`;

  return (
    <SharePosterCard
      corners={corners}
      fillId={fillId}
      height={height}
      poster={{
        kind: 'streak',
        label: TODAY_COPY.dayDoneTitle,
        value: hero.value,
        unit: hero.unit,
        corner: content.weekday,
      }}
      runLine={brandMeta}
      testID="home-day-share-card"
      width={width}
    />
  );
}
