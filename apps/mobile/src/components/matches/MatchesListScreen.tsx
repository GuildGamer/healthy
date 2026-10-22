import type { MatchListItem } from '@product/client';
import { spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { DeckNoteCard, DeckSectionTitle } from '@/components/deck';
import { RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { type Theme, useThemedStyles } from '@/theme';
import { GroupListRow, PastGroupsRow } from './GroupListRow';
import { GroupsEmptyCard } from './GroupsEmptyCard';
import { GroupsSkeleton } from './GroupsSkeleton';
import { pastGroupsSummary } from './group-history';
import { GROUPS_COPY } from './match-copy';

/** The Groups segment: who has done today in each live group, and the past folded away. */
export function MatchesListScreen() {
  const styles = useThemedStyles(createStyles);
  const listQuery = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => apiClient.listMyMatches(),
  });

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => listQuery.refetch()}
      style={styles.screen}
      testID="matches-list-screen"
    >
      <GroupsBody
        ended={listQuery.data?.ended ?? []}
        hasFailed={listQuery.isError}
        isPending={listQuery.isPending}
        live={listQuery.data?.live ?? []}
        onRetry={() => void listQuery.refetch()}
      />
    </RefreshableScroll>
  );
}

function GroupsBody({
  live,
  ended,
  isPending,
  hasFailed,
  onRetry,
}: {
  live: readonly MatchListItem[];
  ended: readonly MatchListItem[];
  isPending: boolean;
  hasFailed: boolean;
  onRetry: () => void;
}) {
  const router = useRouter();

  if (isPending) {
    return <GroupsSkeleton />;
  }

  if (hasFailed) {
    return (
      <DeckNoteCard
        action={{ label: GROUPS_COPY.tryAgain, onPress: onRetry, testID: 'matches-retry' }}
        body={GROUPS_COPY.loadFailedBody}
        glyph="offline"
        testID="matches-load-failed"
        title={GROUPS_COPY.loadFailedTitle}
      />
    );
  }

  return (
    <>
      {live.length > 0 ? (
        <View testID="matches-live">
          <DeckSectionTitle corner={GROUPS_COPY.doneTodayHint} isFirst label={GROUPS_COPY.live} />
          {live.map((item, index) => (
            <GroupListRow
              isFirst={index === 0}
              item={item}
              key={item.id}
              onPress={() => router.navigate(`/matches/${item.id}`)}
            />
          ))}
        </View>
      ) : (
        <GroupsEmptyCard onStart={() => router.navigate('/matches/create')} />
      )}
      {ended.length > 0 ? (
        <PastGroupsRow
          onPress={() => router.navigate('/matches/past')}
          summary={pastGroupsSummary(ended)}
        />
      ) : null}
    </>
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
