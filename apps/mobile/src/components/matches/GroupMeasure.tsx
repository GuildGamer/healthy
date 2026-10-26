import { fontWeight } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';

const MEASURE_SIZE = 72;

interface GroupMeasureProps {
  /** Plain count, or a hold formatted as m:ss. */
  score: string | number;
  unit: string;
  /** "Group best · You", or "No score yet" before anyone has scored. */
  caption: string;
  /** Clinic white draws the number in the group's colour. */
  numeralColor?: string;
}

/** The board card's one big number — the group's best so far — with a caption. */
export function GroupMeasure({ score, unit, caption, numeralColor }: GroupMeasureProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.block} testID="match-board-measure">
      <View style={styles.row}>
        <Text style={[styles.numeral, numeralColor ? { color: numeralColor } : null]}>{score}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Text style={styles.caption} testID="match-board-caption">
        {caption}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    block: {
      marginTop: 14,
      gap: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
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
    caption: {
      color: theme.deckCards.subtext,
      fontSize: 13,
      fontWeight: fontWeight.medium,
    },
  });
