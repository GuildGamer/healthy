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
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader, RefreshableScroll } from '@/components/feedback';
import { apiClient } from '@/lib/api';
import { ChallengeActionButton } from './ChallengeActionButton';
import { buildChallengeFocusLayout } from './challenge-list-layout';
import { ChallengeProgressRing } from './ChallengeProgressRing';
import { completionRoute } from './completion-route';
import { TodayWinHeader } from './TodayWinHeader';
import { useAdvanceChallenge } from './useAdvanceChallenge';

export function ChallengesScreen() {
  const router = useRouter();
  const { advance, isAdvancing } = useAdvanceChallenge();
  const [showAlso, setShowAlso] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });

  const challenges = challengesQuery.data?.challenges ?? [];
  const hasMembership = meQuery.data?.hasMembership ?? false;
  const layout = buildChallengeFocusLayout(challenges, hasMembership);
  const openCount =
    (layout.focus ? 1 : 0) +
    layout.upNext.length +
    layout.alsoAvailable.length +
    layout.weekly.length +
    layout.monthly.length;
  const doneVisible = showDone || openCount === 0;

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
          <TodayWinHeader testID="challenges-subtitle" win={layout.win} />

          {layout.focus ? (
            <View style={styles.doNextCard} testID="section-focus">
              <Text style={styles.doNextTitle}>Do next</Text>
              <ChallengeRow
                challenge={layout.focus}
                inCard
                isBusy={isAdvancing(layout.focus.id)}
                isLast
                onAdvance={() => openLog(layout.focus!)}
                onOpen={() =>
                  router.push(`/challenge/${layout.focus!.challengeId}`)
                }
              />
            </View>
          ) : null}

          {layout.upNext.length > 0 ? (
            <View style={styles.upNextBlock} testID="section-up-next">
              <Text style={styles.upNextTitle}>Up next</Text>
              {layout.upNext.map((challenge, index) => (
                <ChallengeRow
                  challenge={challenge}
                  isBusy={isAdvancing(challenge.id)}
                  isLast={index === layout.upNext.length - 1}
                  key={challenge.id}
                  onAdvance={() => openLog(challenge)}
                  onOpen={() =>
                    router.push(`/challenge/${challenge.challengeId}`)
                  }
                />
              ))}
            </View>
          ) : null}

          <CollapsedSection
            count={layout.alsoAvailable.length}
            expanded={showAlso}
            label="Also available"
            onToggle={() => setShowAlso((value) => !value)}
            testID="section-also"
          >
            {layout.alsoAvailable.map((challenge, index) => (
              <ChallengeRow
                challenge={challenge}
                isBusy={isAdvancing(challenge.id)}
                isLast={index === layout.alsoAvailable.length - 1}
                key={challenge.id}
                onAdvance={() => openLog(challenge)}
                onOpen={() =>
                  router.push(`/challenge/${challenge.challengeId}`)
                }
              />
            ))}
          </CollapsedSection>

          <CollapsedSection
            count={layout.weekly.length}
            expanded={showWeekly}
            label="This week"
            onToggle={() => setShowWeekly((value) => !value)}
            testID="section-weekly"
          >
            {layout.weekly.map((challenge, index) => (
              <ChallengeRow
                challenge={challenge}
                isBusy={isAdvancing(challenge.id)}
                isLast={index === layout.weekly.length - 1}
                key={challenge.id}
                onAdvance={() => openLog(challenge)}
                onOpen={() =>
                  router.push(`/challenge/${challenge.challengeId}`)
                }
              />
            ))}
          </CollapsedSection>

          <CollapsedSection
            count={layout.monthly.length}
            expanded={showMonthly}
            label="This month"
            onToggle={() => setShowMonthly((value) => !value)}
            testID="section-monthly"
          >
            {layout.monthly.map((challenge, index) => (
              <ChallengeRow
                challenge={challenge}
                isBusy={isAdvancing(challenge.id)}
                isLast={index === layout.monthly.length - 1}
                key={challenge.id}
                onAdvance={() => openLog(challenge)}
                onOpen={() =>
                  router.push(`/challenge/${challenge.challengeId}`)
                }
              />
            ))}
          </CollapsedSection>

          {layout.done.length > 0 && !doneVisible ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDone(true)}
              style={styles.doneToggle}
              testID="show-done-challenges"
            >
              <Text style={styles.doneToggleLabel}>
                {layout.done.length} done
              </Text>
            </Pressable>
          ) : null}

          {doneVisible && layout.done.length > 0 ? (
            <View testID="section-done">
              <Text style={styles.sectionTitle}>Done</Text>
              {layout.done.map((challenge, index) => (
                <ChallengeRow
                  challenge={challenge}
                  isBusy={isAdvancing(challenge.id)}
                  isLast={index === layout.done.length - 1}
                  key={challenge.id}
                  onAdvance={() => openLog(challenge)}
                  onOpen={() =>
                    router.push(`/challenge/${challenge.challengeId}`)
                  }
                />
              ))}
            </View>
          ) : null}

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

function CollapsedSection({
  children,
  count,
  expanded,
  label,
  onToggle,
  testID,
}: {
  children: ReactNode;
  count: number;
  expanded: boolean;
  label: string;
  onToggle: () => void;
  testID: string;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <View testID={testID}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={styles.collapseToggle}
        testID={`${testID}-toggle`}
      >
        <Text style={styles.collapseLabel}>
          {label} · {count}
        </Text>
        <Text style={styles.collapseHint}>{expanded ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {expanded ? children : null}
    </View>
  );
}

function ChallengeRow({
  challenge,
  inCard = false,
  isBusy,
  isLast,
  onAdvance,
  onOpen,
}: {
  challenge: TodayChallenge;
  inCard?: boolean;
  isBusy: boolean;
  isLast: boolean;
  onAdvance: () => void;
  onOpen: () => void;
}) {
  const done = challenge.status === 'completed';

  return (
    <View>
      <View
        style={[styles.row, inCard && styles.rowInCard]}
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
            <Text style={styles.meta}>+{challenge.rewardPoints} pts</Text>
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
  sectionTitle: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  doNextCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    paddingTop: spacing.sm,
  },
  doNextTitle: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  upNextBlock: {
    marginTop: spacing.lg,
  },
  upNextTitle: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  collapseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  collapseLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  collapseHint: {
    color: colors.accent,
    fontSize: fontSize.sm,
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
  rowInCard: {
    paddingHorizontal: spacing.md,
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
