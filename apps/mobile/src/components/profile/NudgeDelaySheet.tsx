import { fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckSheetModal, DeckSheetSub, DeckSheetTitle } from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { NUDGE_DELAY_MINUTES, nudgeDelayLabel, nudgeLandingLabel } from './nudge-delay';

interface NudgeDelaySheetProps {
  savedMinutes: number;
  onDone: (minutes: number) => void;
  onClose: () => void;
}

/** Four big choices, each saying when the nudge would land if you started now. */
export function NudgeDelaySheet({ savedMinutes, onDone, onClose }: NudgeDelaySheetProps) {
  const styles = useThemedStyles(createStyles);
  const [selectedMinutes, setSelectedMinutes] = useState(savedMinutes);
  const now = new Date();

  return (
    <DeckSheetModal onDismiss={onClose} testID="nudge-delay-sheet" visible>
      <DeckSheetTitle>Nudge me after</DeckSheetTitle>
      <DeckSheetSub>If you leave a log unfinished.</DeckSheetSub>
      <View style={styles.grid}>
        {NUDGE_DELAY_MINUTES.map((minutes) => {
          const isSelected = minutes === selectedMinutes;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={minutes}
              onPress={() => setSelectedMinutes(minutes)}
              style={[styles.choice, isSelected ? styles.choiceOn : null]}
              testID={`nudge-delay-${minutes}`}
            >
              <Text style={styles.choiceLabel}>{nudgeDelayLabel(minutes)}</Text>
              <Text style={styles.choiceMeta}>{nudgeLandingLabel(now, minutes)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.action}>
        <DeckButton
          label="Done"
          onPress={() => onDone(selectedMinutes)}
          testID="nudge-delay-done"
        />
      </View>
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: spacing.md,
    },
    choice: {
      flexBasis: '47%',
      flexGrow: 1,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surfaceRaised,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    choiceOn: {
      borderColor: theme.colors.text,
    },
    choiceLabel: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.4,
    },
    choiceMeta: {
      color: theme.colors.muted,
      fontSize: 12.5,
      marginTop: 2,
    },
    action: {
      marginTop: 18,
    },
  });
