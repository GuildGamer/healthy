import type {
  ProgressContestSetItem,
  ProgressDayDetail,
  ProgressDoneItem,
  ProgressPracticeItem,
} from '@product/client';
import { useRouter } from 'expo-router';
import {
  dayCompletionShareRoute,
  dayContestShareRoute,
} from '@/components/challenges/completion-poster';
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
  contestSetAmount,
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

/**
 * Each challenge finished that day. Opens the share screen directly (video ↔
 * card when a clip exists). No intermediate detail page.
 */
export function DayDoneRows({ items }: { items: readonly ProgressDoneItem[] }) {
  const router = useRouter();

  return (
    <>
      {items.map((item, index) => {
        const hasClip = item.proofClip !== null;
        return (
          <DeckListRow
            accessibilityHint={hasClip ? ACTIVITY_COPY.openWithClipHint : ACTIVITY_COPY.openHint}
            isFirst={index === 0}
            key={item.userChallengeId}
            leading={
              <DeckDisc glyph={hasClip ? 'play' : undefined} kind={deckCardKindFor(item)} />
            }
            meta={doneMeta(item)}
            onPress={() => router.push(dayCompletionShareRoute(item))}
            testID={`history-done-${item.userChallengeId}`}
            title={item.title}
            trailing={<DeckRowAmount text={doneAmount(item)} />}
          />
        );
      })}
    </>
  );
}

/** A missed photo check, group contest sets, practice, and any bonus. */
export function DayAlsoRows({ detail }: { detail: ProgressDayDetail }) {
  const contestSets = detail.contestSets ?? [];
  let isFirst = true;

  function takeFirst(): boolean {
    if (!isFirst) {
      return false;
    }
    isFirst = false;
    return true;
  }

  return (
    <>
      {detail.missedPhotoChecks.map((check) => (
        <DeckListRow
          isFirst={takeFirst()}
          isTopAligned
          key={check.userChallengeId}
          leading={<DeckDisc glyph="camera" kind={deckCardKindFor(check)} />}
          meta={missedPhotoReason(check)}
          testID={`history-missed-${check.userChallengeId}`}
          title={PROGRESS_COPY.photoCheckMissed}
          trailing={<DeckRowAmount text={formatPointsDelta(-check.pointsLost)} tone="loss" />}
        />
      ))}
      {contestSets.map((set) => (
        <ContestSetRow isFirst={takeFirst()} key={set.id} set={set} />
      ))}
      {detail.practice.map((session) => (
        <PracticeRow
          dayKey={detail.dayKey}
          isFirst={takeFirst()}
          key={session.id}
          session={session}
        />
      ))}
      {detail.adjustments.map((adjustment) => (
        <DeckListRow
          isFirst={takeFirst()}
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

function ContestSetRow({
  set,
  isFirst,
}: {
  set: ProgressContestSetItem;
  isFirst: boolean;
}) {
  const router = useRouter();
  const hasClip = set.proofClip !== null;

  return (
    <DeckListRow
      accessibilityHint={hasClip ? ACTIVITY_COPY.openWithClipHint : ACTIVITY_COPY.openHint}
      isFirst={isFirst}
      leading={
        <DeckDisc
          glyph={hasClip ? 'play' : undefined}
          kind={DECK_KIND_BY_METRIC[set.metric] ?? null}
        />
      }
      meta={clockTime(set.recordedAt)}
      onPress={() => router.push(dayContestShareRoute(set))}
      testID={`history-contest-${set.id}`}
      title={set.title}
      trailing={<DeckRowAmount text={contestSetAmount(set)} />}
    />
  );
}

function PracticeRow({
  dayKey,
  session,
  isFirst,
}: {
  dayKey: string;
  session: ProgressPracticeItem;
  isFirst: boolean;
}) {
  const router = useRouter();
  const hasClip = session.proofClip !== null;

  return (
    <DeckListRow
      accessibilityHint={hasClip ? ACTIVITY_COPY.openWithClipHint : undefined}
      isFirst={isFirst}
      leading={
        <DeckDisc
          glyph={hasClip ? 'play' : undefined}
          kind={DECK_KIND_BY_METRIC[session.metric] ?? null}
        />
      }
      meta={clockTime(session.recordedAt)}
      onPress={
        hasClip ? () => router.push(activityRoute(dayKey, session.id)) : undefined
      }
      testID={`history-practice-${session.id}`}
      title={session.title}
      trailing={<DeckRowAmount text={practiceAmount(session)} tone="quiet" />}
    />
  );
}
