import type { ProgressDayDetail, ProgressDoneItem, ProgressPracticeItem } from '@product/client';
import {
  type ActivityDetail,
  ActivityDetailScreen,
} from '@/components/challenges/ActivityDetailScreen';
import {
  dayCompletionShareRoute,
  posterForDoneItem,
} from '@/components/challenges/completion-poster';
import { goBackOrHome } from '@/lib/go-back';
import { clockTime, dayPageTitle, practiceMeasure } from './progress-labels';
import { useProgressDay } from './useProgressQueries';

/** One row of a day: a finished challenge by its occurrence, or a practice set by its id. */
export function DayActivityScreen({ dayKey, itemId }: { dayKey: string; itemId: string }) {
  const dayQuery = useProgressDay(dayKey);

  return (
    <ActivityDetailScreen
      detail={dayQuery.data ? dayActivityDetail(dayQuery.data, itemId) : undefined}
      isPending={dayQuery.isPending}
      onBack={() => goBackOrHome(`/history/${dayKey}`)}
      onRefresh={() => dayQuery.refetch()}
    />
  );
}

function dayActivityDetail(day: ProgressDayDetail, itemId: string): ActivityDetail | undefined {
  const done = day.done.find((item) => item.userChallengeId === itemId);
  if (done) {
    return doneDetail(done, day.dayKey);
  }

  const practice = day.practice.find((item) => item.id === itemId);
  return practice ? practiceDetail(practice, day.dayKey) : undefined;
}

function doneDetail(item: ProgressDoneItem, dayKey: string): ActivityDetail {
  const poster = posterForDoneItem(item);

  return {
    title: item.title,
    amount: item.share ? `${poster.value} ${poster.unit}` : poster.value,
    when: `${dayPageTitle(dayKey)} · ${clockTime(item.completedAt)}`,
    points: item.points,
    proofClip: item.proofClip,
    userChallengeId: item.userChallengeId,
    shareCard: dayCompletionShareRoute(item),
  };
}

function practiceDetail(item: ProgressPracticeItem, dayKey: string): ActivityDetail {
  return {
    title: item.title,
    amount: practiceMeasure(item),
    when: `${dayPageTitle(dayKey)} · ${clockTime(item.recordedAt)}`,
    points: null,
    proofClip: item.proofClip,
    userChallengeId: null,
    shareCard: null,
  };
}
