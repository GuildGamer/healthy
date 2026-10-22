import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DECK_PAGE_CARD_RADIUS, DeckEyebrow } from '@/components/deck';
import { WeekStrip } from '@/components/home/WeekStrip';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { PROGRESS_COPY } from './constants/progress-copy';
import { weekLine, weekMeasureUnit, weekRangeLabel } from './progress-labels';
import type { WeekSummary } from './types/progress';
const NUMERAL_SIZE = 72;

interface WeekCardProps {
  summary: WeekSummary;
  weekStartKey: string;
  todayKey: string;
}

/** The week leads: days you showed up, filled as you finish them. */
export function WeekCard({ summary, weekStartKey, todayKey }: WeekCardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const line = weekLine(summary);
  const unit = weekMeasureUnit(summary);

  return (
    <View
      accessibilityLabel={`This week: ${summary.shownUpCount} ${unit}`}
      style={styles.card}
      testID="progress-week-card"
    >
      <DeckEyebrow corner={weekRangeLabel(weekStartKey)} label={PROGRESS_COPY.weekEyebrow} />
      <View style={styles.measure}>
        <Text style={styles.numeral}>{summary.shownUpCount}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <WeekStrip
        activeDayKeys={keysIn(summary, 'shownUp')}
        beforeDayKeys={keysIn(summary, 'beforeJoining')}
        dayKeys={summary.days.map((day) => day.dayKey)}
        todayKey={todayKey}
        tone={theme.deckCards.tones.walk}
      />
      {line ? <Text style={styles.line}>{line}</Text> : null}
    </View>
  );
}

function keysIn(summary: WeekSummary, state: WeekSummary['days'][number]['state']): string[] {
  return summary.days.filter((day) => day.state === state).map((day) => day.dayKey);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.md,
      padding: 20,
      borderRadius: DECK_PAGE_CARD_RADIUS,
      backgroundColor: theme.deckCards.night,
    },
    measure: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      marginTop: 12,
    },
    numeral: {
      color: theme.deckCards.text,
      fontSize: NUMERAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -3,
      lineHeight: NUMERAL_SIZE,
    },
    unit: {
      flexShrink: 1,
      color: theme.deckCards.subtext,
      fontSize: 15,
    },
    line: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      lineHeight: 20,
      marginTop: 12,
    },
  });
