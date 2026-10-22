import type { TodayChallenge } from '@product/client';
import { activityMeetsTarget } from '@product/contract/challenge-capture';
import { useEffect, useState } from 'react';
import { DeckButton, DeckEyebrow } from '@/components/deck';
import { listTodayDeviceSamples, type DeviceSample } from '@/lib/device-health';
import { goBackOrHome } from '@/lib/go-back';
import { WALK_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { SessionShell, SessionTitle } from './SessionShell';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';
import { WalkHero } from './WalkSessionParts';

function useTodaySteps(occurrence: TodayChallenge): DeviceSample | null {
  const [sample, setSample] = useState<DeviceSample | null>(null);

  useEffect(() => {
    let isCancelled = false;
    void listTodayDeviceSamples(occurrence.capture.metric ?? 'steps').then((found) => {
      if (!isCancelled) {
        setSample(found[0] ?? null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [occurrence.capture.metric]);

  return sample;
}

/** Today's steps, read from the phone: use them once they meet the goal. */
export function StepsSession({ occurrence }: { occurrence: TodayChallenge }) {
  const { fill } = useChallengeTone(occurrence);
  const sample = useTodaySteps(occurrence);
  const complete = useCompleteChallenge();
  const target = occurrence.capture.target;
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
        isIdle={sample === null}
        of={stepsLabel}
        value={sample?.count?.toLocaleString('en-GB') ?? '—'}
      />
    </SessionShell>
  );
}
