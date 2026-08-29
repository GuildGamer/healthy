import Feather from '@expo/vector-icons/Feather';
import type { TodayChallenge } from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
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
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => challengesQuery.refetch()}
      style={styles.container}
    >
      <Text style={styles.subtitle}>
        {totalCount > 0
          ? `${completedCount}/${totalCount} completed · tap a challenge to edit`
          : 'Challenges tailored to your health goals'}
      </Text>

      {challengesQuery.isLoading ? (
        <View style={styles.loader}>
          <Loader />
        </View>
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
        <View>
          {challenges.map((challenge, index) => (
            <ChallengeRow
              challenge={challenge}
              isBusy={isAdvancing(challenge.id)}
              isLast={index === challenges.length - 1}
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
            style={styles.addRow}
            testID="add-challenge"
          >
            <Text style={styles.addLink}>Add a challenge</Text>
          </Pressable>
        </View>
      )}
    </RefreshableScroll>
  );
}

function ChallengeRow({
  challenge,
  isBusy,
  isLast,
  onAdvance,
  onOpen,
}: {
  challenge: TodayChallenge;
  isBusy: boolean;
  isLast: boolean;
  onAdvance: () => void;
  onOpen: () => void;
}) {
  return (
    <View>
      <Pressable
        accessibilityHint="Opens schedule and reminders"
        accessibilityLabel={challenge.title}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        testID={`open-challenge-${challenge.challengeId}`}
      >
        <ChallengeIcon
          category={challenge.category}
          completed={challenge.status === 'completed'}
          name={challenge.icon}
        />
        <View style={styles.rowBody}>
          <View style={styles.titleLine}>
            <Text numberOfLines={1} style={styles.title}>
              {challenge.title}
            </Text>
            <Text style={styles.points}>+{challenge.rewardPoints}</Text>
          </View>
          <Text numberOfLines={2} style={styles.description}>
            {challenge.description}
          </Text>
          <Text style={styles.meta}>
            {challenge.category} &middot; {frequencyBadge[challenge.frequency]}
          </Text>
        </View>
        <ChallengeActionButton
          isBusy={isBusy}
          onPress={onAdvance}
          status={challenge.status}
          testID={`advance-challenge-${challenge.id}`}
        />
        <Feather color={colors.border} name="chevron-right" size={16} />
      </Pressable>
      {isLast ? null : <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  addRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  points: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flexShrink: 0,
  },
  description: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  meta: {
    color: colors.muted,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
});
