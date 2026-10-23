import { fontSize } from '@product/brand';
import type { TodayChallenge } from '@product/client';
import { activityMeetsTarget } from '@product/contract/challenge-capture';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  endWalkLiveActivity,
  startWalkLiveActivity,
  updateWalkLiveActivity,
} from 'walk-live-activity';
import { DeckButton, DeckEyebrow } from '@/components/deck';
import { goBackOrHome } from '@/lib/go-back';
import { stepsCardCopy } from '@/lib/steps-session-card';
import { useLiveTodaySteps } from '@/lib/use-live-today-steps';
import { walkCardChanged, type WalkCardCopy } from '@/lib/walk-session-card';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { WALK_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { SessionShell, SessionTitle } from './SessionShell';
import { stepsHeroValue } from './steps-hero';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';
import { WalkHero } from './WalkSessionParts';

/** Today's steps, read live from the phone: use them once they meet the goal. */
export function StepsSession({ occurrence }: { occurrence: TodayChallenge }) {
  const styles = useThemedStyles(createStyles);
  const { scheme } = useTheme();
  const { fill } = useChallengeTone(occurrence);
  const reading = useLiveTodaySteps({ ask: true });
  const complete = useCompleteChallenge();
  const target = occurrence.capture.target;
  const lastCardRef = useRef<WalkCardCopy | null>(null);
  const count = reading.status === 'count' ? reading.count : null;
  /** Hero and lock-screen show 0 while the pedometer is still catching up. */
  const displayCount = count ?? 0;
  const sample =
    count === null
      ? null
      : {
          source: 'pedometer' as const,
          metric: occurrence.capture.metric ?? 'steps',
          count,
        };
  const meetsGoal = sample !== null && activityMeetsTarget(sample, target);
  const stepsLabel = target.count
    ? `of ${target.count.toLocaleString('en-GB')} ${WALK_COPY.steps}`
    : WALK_COPY.steps;

  // Start as soon as the session opens — including at 0 — so locking the phone
  // before the first pedometer read still shows the STEPS card.
  useEffect(() => {
    const copy = stepsCardCopy({
      count: displayCount,
      targetCount: target.count,
      scheme,
    });

    if (!walkCardChanged(lastCardRef.current, copy)) {
      return;
    }

    if (!lastCardRef.current) {
      startWalkLiveActivity(copy);
    } else {
      updateWalkLiveActivity(copy);
    }
    lastCardRef.current = copy;
  }, [displayCount, scheme, target.count]);

  useEffect(() => {
    return () => {
      endWalkLiveActivity(lastCardRef.current ?? undefined);
      lastCardRef.current = null;
    };
  }, []);

  function submit(payload: Parameters<typeof complete.mutate>[0]['payload']) {
    complete.mutate(
      { occurrence, payload },
      { onSuccess: (result) => finishAndLeave(result, { kind: 'checkedIn' }) },
    );
  }

  return (
    <SessionShell
      dock={
        <>
          {meetsGoal && sample ? (
            <DeckButton
              label={WALK_COPY.useThis}
              loading={complete.isPending}
              onPress={() => submit({ deviceActivity: sample })}
              testID="use-sample"
            />
          ) : null}
          <DeckButton
            label={WALK_COPY.byHand}
            onPress={() =>
              submit({
                deviceActivity: { source: 'manual', metric: occurrence.capture.metric ?? 'steps' },
              })
            }
            testID="confirm-challenge"
            variant="quiet"
          />
        </>
      }
      fill={fill}
      onClose={() => goBackOrHome()}
      testID="steps-panel"
    >
      <DeckEyebrow glyph="walk" label={WALK_COPY.movement} />
      <SessionTitle>{occurrence.title}</SessionTitle>
      <WalkHero
        isGoalMet={meetsGoal}
        isIdle={false}
        of={stepsLabel}
        value={stepsHeroValue(displayCount)}
      />
      {reading.status === 'unread' ? (
        <Text style={styles.unread}>{WALK_COPY.stepsUnread}</Text>
      ) : null}
    </SessionShell>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    unread: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.md,
      lineHeight: 21,
      marginTop: 14,
    },
  });
