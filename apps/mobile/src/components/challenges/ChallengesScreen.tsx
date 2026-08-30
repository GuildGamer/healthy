import type { TodayChallenge } from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { ChallengeActionButton } from './ChallengeActionButton';
import { ChallengeProgressRing } from './ChallengeProgressRing';
import { completionRoute } from './completion-route';
import { frequencyBadge } from './constants/frequency-labels';
import { useAdvanceChallenge } from './useAdvanceChallenge';

export function ChallengesScreen() {
  const router = useRouter();
  const { advance, isAdvancing } = useAdvanceChallenge();
  const [showDone, setShowDone] = useState(false);

  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const challenges = challengesQuery.data?.challenges ?? [];
  const open = challenges.filter((item) => item.status !== 'completed');
  const done = challenges.filter((item) => item.status === 'completed');
  const completedCount = challengesQuery.data?.completedCount ?? 0;
  const totalCount = challengesQuery.data?.totalCount ?? 0;
  const doneVisible = showDone || open.length === 0;

  function openLog(challenge: TodayChallenge) {
    const route = completionRoute(challenge);
    if (route) {
      router.push(route);
      return;
    }

    advance({
      userChallengeId: challenge.id,
      status: challenge.status,
    });
  }

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => challengesQuery.refetch()}
      style={styles.container}
    >
      {totalCount > 0 ? (
        <Text style={styles.subtitle}>
          {completedCount === totalCount
            ? 'All done for today'
            : `${completedCount} of ${totalCount} today`}
        </Text>
      ) : null}

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
          <Text style={styles.empty}>Nothing on your list yet.</Text>
          <Text style={styles.addLink}>Add a challenge</Text>
        </Pressable>
      ) : (
        <View>
          {open.map((challenge, index) => (
            <ChallengeRow
              challenge={challenge}
              isBusy={isAdvancing(challenge.id)}
              isLast={index === open.length - 1 && !doneVisible}
              key={challenge.id}
              onAdvance={() => openLog(challenge)}
              onOpen={() => router.push(`/challenge/${challenge.challengeId}`)}
            />
          ))}

          {done.length > 0 && !doneVisible ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDone(true)}
              style={styles.doneToggle}
              testID="show-done-challenges"
            >
              <Text style={styles.doneToggleLabel}>
                {done.length} done
              </Text>
            </Pressable>
          ) : null}

          {doneVisible
            ? done.map((challenge, index) => (
                <ChallengeRow
                  challenge={challenge}
                  isBusy={isAdvancing(challenge.id)}
                  isLast={index === done.length - 1}
                  key={challenge.id}
                  onAdvance={() => openLog(challenge)}
                  onOpen={() =>
                    router.push(`/challenge/${challenge.challengeId}`)
                  }
                />
              ))
            : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/manage-challenges')}
            style={styles.addRow}
            testID="add-challenge"
          >
            <Text style={styles.addLink}>Add or remove</Text>
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
  const done = challenge.status === 'completed';

  return (
    <View>
      <View
        style={styles.row}
        testID={`challenge-row-${challenge.id}`}
      >
        <Pressable
          accessibilityHint="Opens schedule and reminders"
          accessibilityLabel={challenge.title}
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [
            styles.rowBody,
            pressed && styles.rowPressed,
          ]}
          testID={`open-challenge-${challenge.challengeId}`}
        >
          <ChallengeProgressRing
            fieldProgress={challenge.progress}
            status={challenge.status}
            testID={`challenge-progress-${challenge.id}`}
          />
          <View style={styles.rowText}>
            <Text
              numberOfLines={1}
              style={[styles.title, done && styles.titleDone]}
            >
              {challenge.title}
            </Text>
            <Text style={styles.meta}>
              +{challenge.rewardPoints} pts
              {challenge.frequency === 'daily'
                ? ''
                : ` · ${frequencyBadge[challenge.frequency]}`}
            </Text>
          </View>
        </Pressable>
        <ChallengeActionButton
          captureKind={challenge.capture.kind}
          completionKind={challenge.completionKind}
          isBusy={isBusy}
          onPress={onAdvance}
          status={challenge.status}
          testID={`advance-challenge-${challenge.id}`}
        />
      </View>
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
    fontWeight: fontWeight.medium,
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
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  titleDone: {
    color: colors.muted,
  },
  meta: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  doneToggle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  doneToggleLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
});
