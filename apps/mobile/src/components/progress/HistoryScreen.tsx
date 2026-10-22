import type { ProgressDays } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckNoteCard, DeckPushedPage, DeckSectionTitle } from '@/components/deck';
import { Loader } from '@/components/feedback';
import { shiftDayKey } from '@/components/home/day-keys';
import { formatPointsDelta } from '@/components/points';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { DAYS_PER_WEEK, PROGRESS_COPY } from './constants/progress-copy';
import { buildHistorySections } from './history-sections';
import { HistoryDayRow } from './HistoryDayRow';
import { useProgressDays } from './useProgressQueries';

/** One row per day you've had, grouped by week. */
export function HistoryScreen() {
  const daysQuery = useProgressDays();

  return (
    <DeckPushedPage
      onBack={() => goBackOrHome('/(tabs)/profile')}
      onPullRefresh={() => daysQuery.refetch()}
      testID="history-screen"
      title={PROGRESS_COPY.historyTitle}
    >
      <HistoryBody
        isPending={daysQuery.isPending}
        onRetry={() => void daysQuery.refetch()}
        progress={daysQuery.data}
      />
    </DeckPushedPage>
  );
}

function HistoryBody({
  progress,
  isPending,
  onRetry,
}: {
  progress: ProgressDays | undefined;
  isPending: boolean;
  onRetry: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  if (isPending) {
    return (
      <View style={styles.loader}>
        <Loader />
      </View>
    );
  }

  if (!progress) {
    return (
      <DeckNoteCard
        action={{ label: PROGRESS_COPY.tryAgain, onPress: onRetry, testID: 'history-retry' }}
        body={PROGRESS_COPY.failedBody}
        glyph="offline"
        testID="history-error"
        title={PROGRESS_COPY.historyFailedTitle}
      />
    );
  }

  const lastWeekStartKey = shiftDayKey(progress.weekStartKey, -DAYS_PER_WEEK);
  const isFirstDay = progress.joinedDayKey === progress.dayKey;

  return (
    <View>
      {buildHistorySections(progress).map((section, sectionIndex) => (
        <View key={section.weekStartKey}>
          <DeckSectionTitle
            corner={formatPointsDelta(section.pointsTotal)}
            isFirst={sectionIndex === 0}
            label={section.title}
          />
          {section.days.map((day, dayIndex) => (
            <HistoryDayRow
              day={day}
              isFirst={dayIndex === 0}
              key={day.dayKey}
              lastWeekStartKey={lastWeekStartKey}
              todayKey={progress.dayKey}
            />
          ))}
        </View>
      ))}
      {isFirstDay ? <FirstDayNote /> : null}
    </View>
  );
}

function FirstDayNote() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.note} testID="history-first-day">
      <Text style={styles.noteTitle}>{PROGRESS_COPY.firstDayCardTitle}</Text>
      <Text style={styles.noteBody}>{PROGRESS_COPY.firstDayCardBody}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loader: {
      marginTop: spacing.xl,
    },
    note: {
      marginTop: 18,
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 22,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
    },
    noteTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    noteBody: {
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
  });
