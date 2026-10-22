import type { MatchDayStrip } from '@product/client';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { daySquaresFor } from './group-days';

const SQUARE_HEIGHT = 26;
const SQUARE_RADIUS = 9;

interface GroupDaySquaresProps {
  strip: MatchDayStrip;
  movedDayKeys: readonly string[];
  /** The group's colour, for the days you showed up. */
  toneColor: string;
}

/** Your days as squares on a short streak card. Which days, never what earned them. */
export function GroupDaySquares({ strip, movedDayKeys, toneColor }: GroupDaySquaresProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row} testID="match-day-squares">
      {daySquaresFor(strip, movedDayKeys).map((square) => (
        <View key={square.dayKey} style={styles.day}>
          <View
            accessibilityLabel={`${square.dayKey}${square.isHit ? ', done' : ''}`}
            style={[
              styles.square,
              square.isHit ? { backgroundColor: toneColor } : null,
              square.isToday ? styles.today : null,
            ]}
            testID={`match-day-${square.dayKey}${square.isHit ? '-hit' : ''}`}
          />
          <Text style={styles.letter}>{square.letter}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 16,
    },
    day: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
    },
    square: {
      alignSelf: 'stretch',
      height: SQUARE_HEIGHT,
      borderRadius: SQUARE_RADIUS,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.deckCards.track,
    },
    today: {
      borderColor: theme.deckCards.text,
    },
    letter: {
      color: theme.deckCards.subtext,
      fontSize: 11,
    },
  });
