import { fontSize } from '@product/brand';
import type { TodayChallenge } from '@product/client';
import { activityMeetsTarget } from '@product/contract/challenge-capture';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { DeckButton, DeckEyebrow } from '@/components/deck';
import { readTodaySteps } from '@/lib/device-health';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { WALK_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { SessionShell, SessionTitle } from './SessionShell';
import { stepsHeroValue } from './steps-hero';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';
import { WalkHero } from './WalkSessionParts';

type TodaySteps = { status: 'reading' } | { status: 'count'; count: number } | { status: 'unread' };

function useTodaySteps(occurrence: TodayChallenge): TodaySteps {
  const [reading, setReading] = useState<TodaySteps>({ status: 'reading' });

  useEffect(() => {
    let isCancelled = false;
    void readTodaySteps({ ask: true }).then((count) => {
      if (isCancelled) {
        return;
      }
      setReading(count === null ? { status: 'unread' } : { status: 'count', count });
    });

    return () => {
      isCancelled = true;
    };
  }, [occurrence.capture.metric]);

  return reading;
}

/** Today's steps, read from the phone: use them once they meet the goal. */
export function StepsSession({ occurrence }: { occurrence: TodayChallenge }) {
  const styles = useThemedStyles(createStyles);
  const { fill } = useChallengeTone(occurrence);
  const reading = useTodaySteps(occurrence);
  const complete = useCompleteChallenge();
  const target = occurrence.capture.target;
  const count = reading.status === 'count' ? reading.count : null;
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
        value={stepsHeroValue(count)}
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
