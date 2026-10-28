import type { ProgressDayDetail, ProgressDoneItem } from '@product/client';
import { useRouter } from 'expo-router';
import { ACTIVITY_COPY } from '@/components/challenges/constants/doing-copy';
import {
  DECK_KIND_BY_METRIC,
  DeckDisc,
  DeckListRow,
  DeckRowAmount,
  deckCardKindFor,
} from '@/components/deck';
import { formatPointsDelta } from '@/components/points';
import { PROGRESS_COPY } from './constants/progress-copy';
import {
  clockTime,
  doneAmount,
  doneMeta,
  missedPhotoReason,
  practiceAmount,
} from './progress-labels';

function activityRoute(dayKey: string, itemId: string) {
  return {
    pathname: '/history/[dayKey]/[itemId]',
    params: { dayKey, itemId },
  } as const;
}

/** Each challenge finished that day. Tapping one opens it, with its clip when it has one. */
export function DayDoneRows({
  dayKey,
  items,
}: {
  dayKey: string;
  items: readonly ProgressDoneItem[];
}) {
  const router = useRouter();

  return (
    <>
      {items.map((item, index) => (
        <DeckListRow
          accessibilityHint={
            item.proofClip ? ACTIVITY_COPY.openWithClipHint : ACTIVITY_COPY.openHint
          }
          isFirst={index === 0}
          key={item.userChallengeId}
          leading={
            <DeckDisc glyph={item.proofClip ? 'play' : undefined} kind={deckCardKindFor(item)} />
          }
          meta={doneMeta(item)}
          onPress={() => router.push(activityRoute(dayKey, item.userChallengeId))}
          testID={`history-done-${item.userChallengeId}`}
          title={item.title}
          trailing={<DeckRowAmount text={doneAmount(item)} />}
        />
      ))}
    </>
  );
}

/** A missed photo check with its reason, practice with its reps, and any bonus. */
export function DayAlsoRows({ detail }: { detail: ProgressDayDetail }) {
  const router = useRouter();

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
          accessibilityHint={session.proofClip ? ACTIVITY_COPY.openWithClipHint : undefined}
          isFirst={index === 0 && detail.missedPhotoChecks.length === 0}
          key={session.id}
          leading={
            <DeckDisc
              glyph={session.proofClip ? 'play' : undefined}
              kind={DECK_KIND_BY_METRIC[session.metric] ?? null}
            />
          }
          meta={clockTime(session.recordedAt)}
          onPress={
            session.proofClip
              ? () => router.push(activityRoute(detail.dayKey, session.id))
              : undefined
          }
          testID={`history-practice-${session.id}`}
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
