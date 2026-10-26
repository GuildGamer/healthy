import type { ProgressDayDetail } from '@product/client';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckNoteCard, DeckPushedPage, DeckSectionTitle } from '@/components/deck';
import { Loader } from '@/components/feedback';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { DayAlsoRows, DayDoneRows } from './DayDetailRows';
import { PROGRESS_COPY } from './constants/progress-copy';
import { formatPointsDelta } from '@/components/points';
import { dayDetailTotal, dayPageTitle, daySentence } from './progress-labels';
import { useProgressDay } from './useProgressQueries';

const TOTAL_SIZE = 52;

/** One day: each challenge with what it earned, then anything else that moved. */
export function DayDetailScreen({ dayKey }: { dayKey: string }) {
  const dayQuery = useProgressDay(dayKey);

  return (
    <DeckPushedPage
      onBack={() => goBackOrHome('/history')}
      onPullRefresh={() => dayQuery.refetch()}
      testID="history-day-screen"
      title={dayPageTitle(dayKey)}
    >
      <DayBody
        detail={dayQuery.data}
        isPending={dayQuery.isPending}
        onRetry={() => void dayQuery.refetch()}
      />
    </DeckPushedPage>
  );
}

function DayBody({
  detail,
  isPending,
  onRetry,
}: {
  detail: ProgressDayDetail | undefined;
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

  if (!detail) {
    return (
      <DeckNoteCard
        action={{ label: PROGRESS_COPY.tryAgain, onPress: onRetry, testID: 'history-day-retry' }}
        body={PROGRESS_COPY.failedBody}
        glyph="offline"
        title={PROGRESS_COPY.dayFailedTitle}
      />
    );
  }

  const hasAlso =
    detail.missedPhotoChecks.length + detail.practice.length + detail.adjustments.length > 0;

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.total} testID="history-day-total">
          {formatPointsDelta(dayDetailTotal(detail))}
        </Text>
        <Text style={styles.sentence}>{daySentence(detail)}</Text>
      </View>
      {detail.done.length > 0 || detail.dailyDueCount > 0 ? (
        <>
          <DeckSectionTitle
            corner={`${detail.dailyDoneCount} of ${detail.dailyDueCount}`}
            label={PROGRESS_COPY.doneSection}
          />
          <DayDoneRows dayKey={detail.dayKey} items={detail.done} />
        </>
      ) : null}
      {hasAlso ? (
        <>
          <DeckSectionTitle label={PROGRESS_COPY.alsoSection} />
          <DayAlsoRows detail={detail} />
        </>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loader: {
      marginTop: spacing.xl,
    },
    hero: {
      marginTop: 18,
      paddingHorizontal: spacing.xs,
    },
    total: {
      color: theme.colors.text,
      fontSize: TOTAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -2,
      lineHeight: TOTAL_SIZE + 4,
    },
    sentence: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
  });
