import type { TodayChallenge } from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '@/lib/api';
import { ChallengeActionButton } from './ChallengeActionButton';
import { useAdvanceChallenge } from './useAdvanceChallenge';

export function ChallengesScreen() {
  const { advance, isAdvancing } = useAdvanceChallenge();

  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const challenges = challengesQuery.data?.challenges ?? [];
  const completedCount = challengesQuery.data?.completedCount ?? 0;
  const totalCount = challengesQuery.data?.totalCount ?? 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => challengesQuery.refetch()}
          refreshing={challengesQuery.isRefetching}
          tintColor={colors.accent}
        />
      }
      style={styles.container}
    >
      <Text style={styles.subtitle}>
        {totalCount > 0
          ? `${completedCount}/${totalCount} completed today`
          : 'Daily challenges tailored to your health goals'}
      </Text>

      {challengesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : challenges.length === 0 ? (
        <Text style={styles.empty}>No challenges available yet.</Text>
      ) : (
        <View style={styles.list}>
          {challenges.map((challenge) => (
            <ChallengeCard
              challenge={challenge}
              isBusy={isAdvancing(challenge.id)}
              key={challenge.id}
              onAdvance={() =>
                advance({
                  userChallengeId: challenge.id,
                  status: challenge.status,
                })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ChallengeCard({
  challenge,
  isBusy,
  onAdvance,
}: {
  challenge: TodayChallenge;
  isBusy: boolean;
  onAdvance: () => void;
}) {
  return (
    <View style={styles.card} testID={`challenge-card-${challenge.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <Text style={styles.points}>+{challenge.rewardPoints}</Text>
      </View>
      <Text style={styles.cardDescription}>{challenge.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.category}>{challenge.category}</Text>
        <ChallengeActionButton
          isBusy={isBusy}
          onPress={onAdvance}
          status={challenge.status}
          testID={`advance-challenge-${challenge.id}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  points: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  cardDescription: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  category: {
    color: colors.muted,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
