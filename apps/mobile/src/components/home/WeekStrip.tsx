import { fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { dayKeyName, weekdayInitial } from './day-keys';

const DAY_HEIGHT = 28;
const TODAY_RING_WIDTH = 2;
const BEFORE_OUTLINE_WIDTH = 1.5;

interface WeekStripProps {
  /** Monday to Sunday. */
  dayKeys: readonly string[];
  activeDayKeys: readonly string[];
  todayKey: string;
  /** The card's tone; Clinic white fills a done day with it. */
  tone: string;
  /** Days before someone joined: faint outlines, so they never read as misses. */
  beforeDayKeys?: readonly string[];
}

/** The week at a glance: which days counted, and where today sits. */
export function WeekStrip({
  dayKeys,
  activeDayKeys,
  todayKey,
  tone,
  beforeDayKeys = [],
}: WeekStripProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const doneColor = theme.deckCards.hasToneRail ? tone : theme.colors.primary;
  const active = new Set(activeDayKeys);
  const before = new Set(beforeDayKeys);

  return (
    <View style={styles.row} testID="deck-week-strip">
      {dayKeys.map((dayKey) => {
        const isActive = active.has(dayKey);
        return (
          <View
            accessibilityLabel={`${dayKeyName(dayKey, 'weekday')}${isActive ? ', done' : ''}`}
            key={dayKey}
            style={styles.column}
            testID={isActive ? `deck-week-hit-${dayKey}` : undefined}
          >
            <View
              style={[
                styles.day,
                isActive ? { backgroundColor: doneColor } : null,
                before.has(dayKey) ? styles.before : null,
                dayKey === todayKey ? styles.today : null,
              ]}
            />
            <Text style={styles.letter}>{weekdayInitial(dayKey)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
      marginTop: spacing.md,
    },
    column: {
      flex: 1,
      alignItems: 'stretch',
    },
    day: {
      height: DAY_HEIGHT,
      borderRadius: radii.sm,
      backgroundColor: theme.deckCards.track,
    },
    today: {
      borderWidth: TODAY_RING_WIDTH,
      borderColor: theme.deckCards.text,
    },
    before: {
      backgroundColor: 'transparent',
      borderWidth: BEFORE_OUTLINE_WIDTH,
      borderColor: theme.deckCards.track,
    },
    letter: {
      color: theme.deckCards.subtext,
      fontSize: 11,
      fontWeight: fontWeight.medium,
      textAlign: 'center',
      marginTop: 5,
    },
  });
