import Feather from '@expo/vector-icons/Feather';
import type { TodayChallenge } from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '@/lib/api';
import { ChallengeActionButton } from './ChallengeActionButton';
import { ChallengeIcon } from './ChallengeIcon';
import { completionRoute } from './completion-route';
import { frequencyBadge } from './constants/frequency-labels';
import { useAdvanceChallenge } from './useAdvanceChallenge';

export function ChallengesScreen() {
  const router = useRouter();
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
          ? `${completedCount}/${totalCount} completed · tap a challenge to edit`
          : 'Challenges tailored to your health goals'}
      </Text>

      {challengesQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : challenges.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/manage-challenges')}
          style={styles.emptyAction}
          testID="add-challenge"
        >
          <Text style={styles.empty}>
            You have not picked any challenges yet.
          </Text>
          <Text style={styles.addLink}>Add a challenge</Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {challenges.map((challenge) => (
            <ChallengeCard
              challenge={challenge}
              isBusy={isAdvancing(challenge.id)}
              key={challenge.id}
              onAdvance={() => {
                const route = completionRoute(challenge);
                if (route) {
                  router.push(route);
                  return;
                }

                advance({
                  userChallengeId: challenge.id,
                  status: challenge.status,
                });
              }}
              onOpen={() =>
                router.push(`/challenge/${challenge.challengeId}`)
              }
            />
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/manage-challenges')}
            testID="add-challenge"
          >
            <Text style={styles.addLink}>Add a challenge</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ChallengeCard({
  challenge,
  isBusy,
  onAdvance,
  onOpen,
}: {
  challenge: TodayChallenge;
  isBusy: boolean;
  onAdvance: () => void;
  onOpen: () => void;
}) {
  return (
    <Pressable
      accessibilityHint="Opens schedule and reminders"
      accessibilityLabel={challenge.title}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`open-challenge-${challenge.challengeId}`}
    >
      <View style={styles.cardHeader}>
        <ChallengeIcon
          category={challenge.category}
          completed={challenge.status === 'completed'}
          name={challenge.icon}
        />
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <Text style={styles.points}>+{challenge.rewardPoints}</Text>
        <Feather color={colors.border} name="chevron-right" size={18} />
      </View>
      <Text style={styles.cardDescription}>{challenge.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.category}>
          {challenge.category} &middot; {frequencyBadge[challenge.frequency]}
        </Text>
        <ChallengeActionButton
          isBusy={isBusy}
          onPress={onAdvance}
          status={challenge.status}
          testID={`advance-challenge-${challenge.id}`}
        />
      </View>
    </Pressable>
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
  addLink: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  emptyAction: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
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
  cardPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    gap: spacing.md,
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
