import type { TodayChallenge } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DECK_NUMERAL_SIZE, DeckRoundButton, DeckSheetTitle } from '@/components/deck';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { READING_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { ReadingSheetLayout } from './ReadingSheetLayout';
import { saveFailedMessage } from './save-error';
import { useWaterGlasses } from './useWaterGlasses';
import { waterGlassCount, waterGlassGoal } from './water-glasses';

/** Water opened from anywhere but its card: the same running count, with − and +. */
export function WaterSheet({ occurrence }: { occurrence: TodayChallenge }) {
  const styles = useThemedStyles(createStyles);
  const [glasses, setGlassCount] = useState(() => waterGlassCount(occurrence));
  const [saveError, setSaveError] = useState<string | null>(null);
  const water = useWaterGlasses();
  const goal = waterGlassGoal(occurrence);

  function save() {
    setSaveError(null);
    water.setGlasses(occurrence, glasses, {
      onFinished: (result) => finishAndLeave(result, { kind: 'water', glasses }),
      onError: (error) => setSaveError(saveFailedMessage(error)),
    });

    if (glasses < goal) {
      goBackOrHome();
    }
  }

  return (
    <ReadingSheetLayout
      canSave
      corner={`Goal ${goal}`}
      didFail={saveError !== null}
      isSaving={water.isFinishing(occurrence.id)}
      label={READING_COPY.water}
      message={saveError}
      occurrence={occurrence}
      onSave={save}
      saveLabel={READING_COPY.save}
      testID={`log-reading-${occurrence.challengeId}`}
    >
      <DeckSheetTitle>{READING_COPY.waterTitle}</DeckSheetTitle>
      <View style={styles.count}>
        <Text style={styles.numeral} testID="log-water">
          {glasses}
        </Text>
        <Text style={styles.unit}>{READING_COPY.waterUnit}</Text>
      </View>
      <View style={styles.steppers}>
        <DeckRoundButton
          accessibilityLabel="One glass fewer"
          disabled={glasses === 0}
          glyph="minus"
          onPress={() => setGlassCount(Math.max(glasses - 1, 0))}
          onSurface
          testID="water-minus"
        />
        <DeckRoundButton
          accessibilityLabel="One more glass"
          glyph="plus"
          onPress={() => setGlassCount(glasses + 1)}
          onSurface
          testID="water-plus"
        />
      </View>
    </ReadingSheetLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    count: {
      alignItems: 'center',
      marginTop: 26,
    },
    numeral: {
      color: theme.colors.text,
      fontSize: DECK_NUMERAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -4,
      lineHeight: DECK_NUMERAL_SIZE,
    },
    unit: {
      color: theme.colors.muted,
      fontSize: 17,
      fontWeight: fontWeight.medium,
      marginTop: 6,
    },
    steppers: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
  });
