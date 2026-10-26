import type { ChallengeHistoryEntry } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckNoteCard, DeckPageNav } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { formatPointsDelta } from '@/components/points';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { historyEvidenceCopy, historyLogCopy } from './challenge-history';
import { ACTIVITY_COPY } from './constants/doing-copy';
import { SETTINGS_COPY } from './constants/routine-copy';
import { groupHistoryByWeek, historyDayLabel, historyTimeLabel, timesLabel } from './history-weeks';
import { ListSectionTitle } from './ListSectionTitle';
import { RoutineSkeleton } from './RoutineSkeleton';
import { useChallengeHistory } from './useChallengeHistory';

/** Where your own values live, by week, newest first. Private: never on Today or the routine. */
export function ChallengeHistoryScreen({ challengeId }: { challengeId: string }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { historyQuery, entries } = useChallengeHistory(challengeId);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>
        <DeckPageNav
          onBack={() => goBackOrHome(`/challenge/${challengeId}`)}
          title={SETTINGS_COPY.history}
        />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        testID="challenge-history-screen"
      >
        <HistoryBody
          challengeId={challengeId}
          entries={entries}
          hasFailed={historyQuery.isError}
          isPending={historyQuery.isPending}
          onRetry={() => void historyQuery.refetch()}
        />
      </ScrollView>
    </View>
  );
}

function HistoryBody({
  challengeId,
  entries,
  isPending,
  hasFailed,
  onRetry,
}: {
  challengeId: string;
  entries: readonly ChallengeHistoryEntry[];
  isPending: boolean;
  hasFailed: boolean;
  onRetry: () => void;
}) {
  if (isPending && entries.length === 0) {
    return <RoutineSkeleton />;
  }

  if (hasFailed && entries.length === 0) {
    return (
      <DeckNoteCard
        action={{ label: SETTINGS_COPY.retry, onPress: onRetry }}
        body={SETTINGS_COPY.historyErrorBody}
        glyph="offline"
        testID="challenge-history-error"
        title={SETTINGS_COPY.historyErrorTitle}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <DeckNoteCard
        body={SETTINGS_COPY.historyEmpty}
        glyph="clock"
        isOutlined
        testID="challenge-history-empty"
        title={SETTINGS_COPY.historyEmptyTitle}
      />
    );
  }

  const now = new Date();
  return (
    <View testID="challenge-history-list">
      {groupHistoryByWeek(entries, now).map((week, index) => (
        <View key={week.weekStartKey}>
          <ListSectionTitle
            corner={timesLabel(week.entries.length)}
            isFirst={index === 0}
            label={week.label}
          />
          {week.entries.map((entry, entryIndex) => (
            <HistoryRow
              challengeId={challengeId}
              entry={entry}
              isFirst={entryIndex === 0}
              key={entry.id}
              now={now}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function HistoryRow({
  challengeId,
  entry,
  isFirst,
  now,
}: {
  challengeId: string;
  entry: ChallengeHistoryEntry;
  isFirst: boolean;
  now: Date;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const evidence = historyEvidenceCopy(entry.evidence);
  const when = historyTimeLabel(entry.completedAt);
  const hasClip = entry.proofClip !== null;

  return (
    <Pressable
      accessibilityHint={hasClip ? ACTIVITY_COPY.openWithClipHint : ACTIVITY_COPY.openHint}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/challenge/[challengeId]/history/[entryId]',
          params: { challengeId, entryId: entry.id },
        })
      }
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divider,
        pressed ? styles.pressed : null,
      ]}
      testID={`challenge-history-${entry.id}`}
    >
      <View style={styles.rowText}>
        <Text style={styles.day}>{historyDayLabel(entry.completedAt, now)}</Text>
        <Text style={styles.when}>{evidence ? `${when} · ${evidence}` : when}</Text>
      </View>
      <View style={styles.values}>
        <Text style={styles.reading}>{historyLogCopy(entry.log)}</Text>
        <Text style={[styles.points, entry.pointsDelta < 0 ? styles.penalty : null]}>
          {formatPointsDelta(entry.pointsDelta)}
        </Text>
      </View>
      {hasClip ? (
        <Glyph
          color={colors.accent}
          name="play"
          size={16}
          strokeWidth={2}
          testID={`challenge-history-proof-${entry.id}`}
        />
      ) : (
        <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} />
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      paddingHorizontal: 20,
    },
    content: {
      paddingHorizontal: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    rowText: {
      flexShrink: 1,
    },
    day: {
      color: theme.colors.text,
      fontSize: 15,
    },
    when: {
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    values: {
      alignItems: 'flex-end',
    },
    reading: {
      color: theme.colors.text,
      fontSize: 19,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.2,
    },
    points: {
      color: theme.colors.muted,
      fontSize: 14,
    },
    penalty: {
      color: theme.colors.danger,
    },
  });
