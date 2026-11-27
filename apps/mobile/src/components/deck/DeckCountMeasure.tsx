import { fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { DECK_NUMERAL_SIZE } from './constants';

interface DeckCountMeasureProps {
  value: number;
  /** What the numeral is out of, such as "of 10 min". */
  of: string;
  /** 0 to 1. */
  fill: number;
  /** The card's tone; Clinic white uses it for the numeral and the bar. */
  tone: string;
  testID?: string;
}

/** The big numeral at the foot of a card, with the bar under it. */
export function DeckCountMeasure({ value, of, fill, tone, testID }: DeckCountMeasureProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isClinicWhite = theme.deckCards.hasToneRail;
  const numeralColor = isClinicWhite ? tone : theme.deckCards.text;
  const barColor = isClinicWhite ? tone : theme.colors.primary;
  const percent = `${Math.round(Math.min(Math.max(fill, 0), 1) * 100)}%` as const;

  return (
    <View testID={testID}>
      <View style={styles.row}>
        <Text style={[styles.numeral, { color: numeralColor }]}>{value}</Text>
        <Text style={styles.of}>{of}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: percent, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    numeral: {
      fontSize: DECK_NUMERAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -4,
      lineHeight: DECK_NUMERAL_SIZE,
    },
    of: {
      flexShrink: 1,
      color: theme.deckCards.subtext,
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    track: {
      height: spacing.xs,
      borderRadius: 2,
      backgroundColor: theme.deckCards.track,
      marginTop: 14,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 2,
    },
  });
