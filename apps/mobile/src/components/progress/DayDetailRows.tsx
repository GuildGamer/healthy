import type { ProgressDayDetail, ProgressDoneItem } from '@product/client';
import { useRouter } from 'expo-router';
import { dayCompletionShareRoute } from '@/components/challenges/completion-poster';
import {
  DECK_KIND_BY_METRIC,
  DeckDisc,
  DeckListRow,
  DeckRowAmount,
  deckCardKindFor,
} from '@/components/deck';
import { formatPointsDelta } from '@/components/points';
import { PROGRESS_COPY } from './constants/progress-copy';
import { clockTime, missedPhotoReason, practiceAmount } from './progress-labels';

/** Each challenge finished that day. Tapping one opens its share card, never a reading. */
export function DayDoneRows({ items }: { items: readonly ProgressDoneItem[] }) {
  const router = useRouter();

  return (
    <>
      {items.map((item, index) => (
        <DeckListRow
          accessibilityHint="Opens the share card"
          isFirst={index === 0}
          key={item.userChallengeId}
          leading={<DeckDisc kind={deckCardKindFor(item)} />}
          meta={clockTime(item.completedAt)}
          onPress={() => router.push(dayCompletionShareRoute(item))}
          testID={`history-done-${item.userChallengeId}`}
          title={item.title}
          trailing={<DeckRowAmount text={formatPointsDelta(item.points)} />}
        />
      ))}
    </>
  );
}

/** A missed photo check with its reason, practice with its reps, and any bonus. */
export function DayAlsoRows({ detail }: { detail: ProgressDayDetail }) {
  return (
    <>
      {detail.missedPhotoChecks.map((check, index) => (
        <DeckListRow
          isFirst={index === 0}
          isTopAligned
          key={check.userChallengeId}
          leading={<DeckDisc glyph="camera" kind={deckCardKindFor(check)} />}
          meta={missedPhotoReason(check)}
          testID={`history-missed-${check.userChallengeId}`}
          title={PROGRESS_COPY.photoCheckMissed}
          trailing={<DeckRowAmount text={formatPointsDelta(-check.pointsLost)} tone="loss" />}
        />
      ))}
      {detail.practice.map((session, index) => (
        <DeckListRow
          isFirst={index === 0 && detail.missedPhotoChecks.length === 0}
          key={session.id}
          leading={<DeckDisc kind={DECK_KIND_BY_METRIC[session.metric] ?? null} />}
          meta={clockTime(session.recordedAt)}
          title={session.title}
          trailing={<DeckRowAmount text={practiceAmount(session)} tone="quiet" />}
        />
      ))}
      {detail.adjustments.map((adjustment, index) => (
        <DeckListRow
          isFirst={index === 0 && detail.missedPhotoChecks.length + detail.practice.length === 0}
          key={adjustment.id}
          leading={<DeckDisc glyph="star" />}
          meta={clockTime(adjustment.at)}
          title={adjustment.reason}
          trailing={
            <DeckRowAmount
              text={formatPointsDelta(adjustment.points)}
              tone={adjustment.points < 0 ? 'loss' : 'plain'}
            />
          }
        />
      ))}
    </>
  );
}
