import type { CatalogChallenge } from '@product/client';
import { spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeckNoteCard } from '@/components/deck';
import { RefreshableScroll } from '@/components/feedback';
import { type Theme, useThemedStyles } from '@/theme';
import { ChallengeRow } from './ChallengeRow';
import { ROUTINE_COPY } from './constants/routine-copy';
import { ListSectionTitle } from './ListSectionTitle';
import { PausedChallengeSheet } from './PausedChallengeSheet';
import { buildRoutine } from './routine-layout';
import { RoutineSkeleton } from './RoutineSkeleton';
import type { RoutineGroup, RoutineLayout } from './types/routine';
import { useChallengeQueries } from './useChallengeQueries';

/** Mine: everything you have signed up for, by rhythm, and where each stands this period. */
export function ChallengesScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { catalogQuery, todayQuery, detailsQuery } = useChallengeQueries();
  const [paused, setPaused] = useState<CatalogChallenge | null>(null);

  const refresh = () => Promise.all([catalogQuery.refetch(), todayQuery.refetch()]);
  const openCatalog = () => router.push('/manage-challenges');

  function renderBody() {
    if (catalogQuery.isPending) {
      return <RoutineSkeleton />;
    }

    if (!catalogQuery.data) {
      return (
        <DeckNoteCard
          action={{
            label: ROUTINE_COPY.retry,
            onPress: () => void refresh(),
            testID: 'routine-retry',
          }}
          body={ROUTINE_COPY.errorBody}
          glyph="offline"
          testID="routine-error"
          title={ROUTINE_COPY.errorTitle}
        />
      );
    }

    const routine = buildRoutine({
      catalog: catalogQuery.data.challenges,
      occurrences: todayQuery.data?.challenges ?? [],
      details: detailsQuery.data?.occurrences ?? [],
    });

    if (routine.isEmpty) {
      return (
        <DeckNoteCard
          action={{ label: ROUTINE_COPY.addLabel, onPress: openCatalog, testID: 'routine-add' }}
          body={ROUTINE_COPY.emptyBody}
          glyph="leaf"
          isOutlined
          testID="routine-empty"
          title={ROUTINE_COPY.emptyTitle}
        />
      );
    }

    return (
      <RoutineList
        onOpen={(challengeId) => router.push(`/challenge/${challengeId}`)}
        onOpenPaused={setPaused}
        routine={routine}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <RefreshableScroll
        contentContainerStyle={styles.content}
        onPullRefresh={refresh}
        testID="challenges-routine"
      >
        {renderBody()}
      </RefreshableScroll>
      <PausedChallengeSheet challenge={paused} onClose={() => setPaused(null)} />
    </View>
  );
}

function RoutineList({
  routine,
  onOpen,
  onOpenPaused,
}: {
  routine: RoutineLayout;
  onOpen: (challengeId: string) => void;
  onOpenPaused: (challenge: CatalogChallenge) => void;
}) {
  return (
    <View>
      {routine.groups.map((group, index) => (
        <RhythmSection group={group} isFirst={index === 0} key={group.frequency} onOpen={onOpen} />
      ))}
      {routine.paused.length > 0 ? (
        <View testID="routine-paused">
          <ListSectionTitle
            corner={ROUTINE_COPY.pausedCorner}
            isFirst={routine.groups.length === 0}
            label={ROUTINE_COPY.pausedTitle}
          />
          {routine.paused.map((challenge, index) => (
            <ChallengeRow
              accessory="chevron"
              challenge={challenge}
              isFirst={index === 0}
              isMuted
              key={challenge.challengeId}
              meta={ROUTINE_COPY.pausedMeta}
              onPress={() => onOpenPaused(challenge)}
              testID={`paused-challenge-${challenge.challengeId}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RhythmSection({
  group,
  isFirst,
  onOpen,
}: {
  group: RoutineGroup;
  isFirst: boolean;
  onOpen: (challengeId: string) => void;
}) {
  return (
    <View testID={`routine-${group.frequency}`}>
      <ListSectionTitle
        corner={`${group.doneCount} of ${group.rows.length} done`}
        isFirst={isFirst}
        label={ROUTINE_COPY.rhythmTitle[group.frequency]}
      />
      {group.rows.map((row, index) => (
        <ChallengeRow
          accessibilityHint="Opens its settings"
          accessory={row.state}
          challenge={row.challenge}
          isFirst={index === 0}
          key={row.challenge.challengeId}
          meta={row.meta}
          onPress={() => onOpen(row.challenge.challengeId)}
          testID={`open-challenge-${row.challenge.challengeId}`}
        />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: spacing.xl,
    },
  });
