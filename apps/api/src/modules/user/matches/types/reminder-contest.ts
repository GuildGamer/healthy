import type { MatchListItem } from '@product/contract';

/** A live contest as the daily reminder sees it: the list item plus who moved today. */
export type ReminderContest = {
  item: MatchListItem;
  doneTodayUserIds: ReadonlySet<string>;
};
