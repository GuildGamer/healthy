import type { ProgressDay } from '@product/client';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DeckListRow, DeckRowAmount, deckCardKindFor } from '@/components/deck';
import { formatPointsDelta } from '@/components/points';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { historyDayDetail, historyDayTitle, photoCheckLossLabel } from './progress-labels';

const DOT_SIZE = 10;

interface HistoryDayRowProps {
  day: ProgressDay;
  todayKey: string;
  lastWeekStartKey: string;
  isFirst: boolean;
}

/** One day: a dot per challenge in its colour, how much was done, and what it earned. */
export function HistoryDayRow({ day, todayKey, lastWeekStartKey, isFirst }: HistoryDayRowProps) {
  const router = useRouter();
  const title = historyDayTitle(day.dayKey, todayKey, lastWeekStartKey);
  const detail = historyDayDetail(day, day.dayKey === todayKey);

  return (
    <DeckListRow
      accessibilityHint={`${detail}. Opens what you did that day`}
      isFirst={isFirst}
      meta={<DayDots day={day} detail={detail} />}
      onPress={() => router.push(`/history/${day.dayKey}`)}
      testID={`history-day-${day.dayKey}`}
      title={title}
      trailing={
        <DeckRowAmount
          lossNote={day.pointsLost > 0 ? photoCheckLossLabel(day.pointsLost) : null}
          text={formatPointsDelta(day.pointsTotal)}
        />
      }
    />
  );
}

function DayDots({ day, detail }: { day: ProgressDay; detail: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.dots}>
      {day.dailyChallenges.map((challenge, index) => (
        <View
          key={`${challenge.challengeId}-${index}`}
          style={[
            styles.dot,
            challenge.isDone
              ? { backgroundColor: theme.deckCards.tones[deckCardKindFor(challenge)] }
              : null,
          ]}
        />
      ))}
      <Text numberOfLines={1} style={styles.detail}>
        {detail}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: theme.colors.border,
    },
    detail: {
      flexShrink: 1,
      color: theme.colors.muted,
      fontSize: 13,
      marginLeft: 6,
    },
  });
