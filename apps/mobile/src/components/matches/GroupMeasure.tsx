import { fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

const MEASURE_SIZE = 72;

interface GroupMeasureProps {
  /** Plain count, or a hold formatted as m:ss. */
  score: string | number;
  unit: string;
  /** "2nd", or null while there is no place to hold. */
  place: string | null;
  /** Clinic white draws the number in the group's colour. */
  numeralColor?: string;
}

/** Your score as the card's one big number, with your place beside it. */
export function GroupMeasure({ score, unit, place, numeralColor }: GroupMeasureProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row} testID="match-board-measure">
      <Text style={[styles.numeral, numeralColor ? { color: numeralColor } : null]}>{score}</Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      {place ? (
        <Text style={styles.place} testID="match-board-place">
          {place}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      marginTop: 14,
    },
    numeral: {
      color: theme.deckCards.text,
      fontSize: MEASURE_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -3,
      lineHeight: MEASURE_SIZE,
    },
    unit: {
      flexShrink: 1,
      color: theme.deckCards.subtext,
      fontSize: 15,
    },
    place: {
      marginLeft: 'auto',
      color: theme.deckCards.text,
      backgroundColor: theme.deckCards.track,
      borderRadius: radii.md,
      overflow: 'hidden',
      paddingHorizontal: 11,
      paddingVertical: 6,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
      marginBottom: spacing.xs,
    },
  });
