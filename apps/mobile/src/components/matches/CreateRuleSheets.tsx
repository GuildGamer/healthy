import type { MatchScoringMode } from '@product/client';
import {
  isScoringModeAllowedForMetric,
  matchScoringModeSchema,
} from '@product/contract/match-board';
import { Platform, StyleSheet, View } from 'react-native';
import { DeckButton, DeckSheetModal } from '@/components/deck';
import type { GlyphName } from '@/components/icons';
import { type GroupRules, scoringModeHint } from './group-rule-copy';
import { CREATE_COPY, MATCH_MODE_LABEL } from './match-copy';
import {
  MATCH_ANY_DAILY_CHOICE,
  MATCH_ANY_DAILY_LABEL,
  MATCH_METRIC_LABEL,
  MATCH_POSE_METRICS,
  type MatchActivityChoice,
} from './match-metric';
import { SheetChoice } from './SheetChoice';

const MODE_GLYPH: Record<MatchScoringMode, GlyphName> = {
  best_single: 'trophy',
  cumulative_total: 'strength',
  days_completed: 'flame',
};

interface RuleSheetProps {
  visible: boolean;
  onClose: () => void;
  rules: GroupRules;
}

/** The three ways to win, each with an example. One that cannot run here is dimmed, not hidden. */
export function HowYouWinSheet({
  visible,
  onClose,
  rules,
  onChoose,
}: RuleSheetProps & { onChoose: (mode: MatchScoringMode) => void }) {
  return (
    <DeckSheetModal
      footer={<SheetDone onClose={onClose} />}
      onDismiss={onClose}
      testID="match-create-mode-sheet"
      title={CREATE_COPY.howYouWinTitle}
      visible={visible}
    >
      {matchScoringModeSchema.options.map((mode) => (
        <SheetChoice
          glyph={MODE_GLYPH[mode]}
          hint={scoringModeHint(mode, rules)}
          isDisabled={!isScoringModeAllowedForMetric(rules.metric, mode)}
          isSelected={mode === rules.scoringMode}
          key={mode}
          onPress={() => onChoose(mode)}
          testID={`match-mode-${mode}`}
          title={MATCH_MODE_LABEL[mode]}
        />
      ))}
    </DeckSheetModal>
  );
}

const ACTIVITY_HINT: Record<MatchActivityChoice, string> = {
  walk: 'Walks you already track count',
  pushups: 'Sets counted by the camera',
  squats: 'Sets counted by the camera',
  plank: 'Hold timed by the camera',
  jumping_jacks: 'Sets counted by the camera',
  burpees: 'Sets counted by the camera',
  sit_ups: 'Sets counted by the camera',
  mountain_climbers: 'Sets counted by the camera',
  lunges: 'Left and right counted together',
  any_daily: 'Whatever each person is working on',
};

const ACTIVITY_GLYPH: Record<MatchActivityChoice, GlyphName> = {
  walk: 'walk',
  pushups: 'strength',
  squats: 'strength',
  plank: 'strength',
  jumping_jacks: 'strength',
  burpees: 'strength',
  sit_ups: 'strength',
  mountain_climbers: 'strength',
  lunges: 'strength',
  any_daily: 'calendar',
};

const POSE_UNAVAILABLE_HINT =
  Platform.OS === 'android' ? 'iPhone only for now' : 'Sets counted by the camera';

/** What counts. An open streak is only on offer when the group is won on days. */
export function ActivitySheet({
  visible,
  onClose,
  rules,
  activityChoice,
  onChoose,
}: RuleSheetProps & {
  activityChoice: MatchActivityChoice;
  onChoose: (choice: MatchActivityChoice) => void;
}) {
  const poseChoices: MatchActivityChoice[] = [...MATCH_POSE_METRICS];
  const choices: MatchActivityChoice[] =
    rules.scoringMode === 'days_completed'
      ? [MATCH_ANY_DAILY_CHOICE, ...poseChoices, 'walk']
      : [...poseChoices, 'walk'];

  return (
    <DeckSheetModal
      footer={<SheetDone onClose={onClose} />}
      onDismiss={onClose}
      testID="match-create-activity-sheet"
      title={CREATE_COPY.activityTitle}
      visible={visible}
    >
      {choices.map((choice) => {
        const isPose = choice !== 'walk' && choice !== MATCH_ANY_DAILY_CHOICE;
        const hint = isPose
          ? choice === 'plank'
            ? Platform.OS === 'android'
              ? 'iPhone only for now'
              : ACTIVITY_HINT.plank
            : POSE_UNAVAILABLE_HINT
          : ACTIVITY_HINT[choice];
        const isDisabled = isPose && Platform.OS === 'android';

        return (
          <SheetChoice
            glyph={ACTIVITY_GLYPH[choice]}
            hint={hint}
            isDisabled={isDisabled}
            isSelected={activityChoice === choice}
            key={choice}
            onPress={() => onChoose(choice)}
            testID={`match-metric-${choice === MATCH_ANY_DAILY_CHOICE ? 'any' : choice}`}
            title={
              choice === MATCH_ANY_DAILY_CHOICE ? MATCH_ANY_DAILY_LABEL : MATCH_METRIC_LABEL[choice]
            }
          />
        );
      })}
    </DeckSheetModal>
  );
}

export function SheetDone({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.done}>
      <DeckButton label={CREATE_COPY.done} onPress={onClose} testID="match-sheet-done" />
    </View>
  );
}

const styles = StyleSheet.create({
  done: {
    marginTop: 18,
  },
});
