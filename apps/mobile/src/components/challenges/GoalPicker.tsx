import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckRoundButton,
  DeckSheetFooter,
  DeckSheetMessage,
  DeckSheetSub,
} from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { clampGoal, formatGoalAmount, type GoalEditor } from './challenge-goal';
import { SETTINGS_COPY } from './constants/routine-copy';

const GOAL_NUMERAL_SIZE = 84;

interface GoalPickerProps {
  editor: GoalEditor;
  unit: string;
  initialValue: number;
  onDone: (value: number) => void;
  isSaving?: boolean;
  error?: string | null;
}

/** The goal as one big number, with − and + and a few picks that suit the challenge. */
export function GoalPicker({
  editor,
  unit,
  initialValue,
  onDone,
  isSaving = false,
  error = null,
}: GoalPickerProps) {
  const styles = useThemedStyles(createStyles);
  const { sub, range } = editor;
  const [value, setValue] = useState(() => clampGoal(initialValue, range));
  const step = (delta: number) => setValue((current) => clampGoal(current + delta, range));

  return (
    <View testID="goal-picker">
      <DeckSheetSub>{sub}</DeckSheetSub>
      <View style={styles.stepper}>
        <DeckRoundButton
          accessibilityLabel="Fewer"
          disabled={value <= range.min}
          glyph="minus"
          onPress={() => step(-1)}
          onSurface
          testID="goal-minus"
        />
        <Text
          accessibilityLabel={`${formatGoalAmount(value)} ${unit}`}
          style={styles.value}
          testID="goal-value"
        >
          {formatGoalAmount(value)}
        </Text>
        <DeckRoundButton
          accessibilityLabel="More"
          disabled={value >= range.max}
          glyph="plus"
          onPress={() => step(1)}
          onSurface
          testID="goal-plus"
        />
      </View>
      <View style={styles.quickPicks}>
        {range.quickPicks.map((pick) => {
          const isSelected = pick === value;
          return (
            <Pressable
              accessibilityLabel={`${pick} ${unit}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={pick}
              onPress={() => setValue(pick)}
              style={[styles.pick, isSelected ? styles.selectedPick : null]}
              testID={`goal-pick-${pick}`}
            >
              <Text style={[styles.pickText, isSelected ? styles.selectedPickText : null]}>
                {pick}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <DeckSheetMessage message={error} /> : null}
      <DeckSheetFooter>
        <View style={styles.action}>
          <DeckButton
            label={SETTINGS_COPY.goalDone}
            loading={isSaving}
            onPress={() => onDone(value)}
            testID="goal-done"
          />
        </View>
      </DeckSheetFooter>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 22,
      marginTop: 26,
    },
    value: {
      minWidth: 120,
      color: theme.colors.text,
      fontSize: GOAL_NUMERAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -4,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    quickPicks: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: 20,
    },
    pick: {
      width: 62,
      height: 40,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceRaised,
    },
    selectedPick: {
      backgroundColor: theme.colors.text,
    },
    pickText: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
    },
    selectedPickText: {
      color: theme.colors.background,
    },
    action: {
      marginTop: 26,
    },
  });
