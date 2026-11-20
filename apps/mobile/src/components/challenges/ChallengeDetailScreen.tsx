import type {
  CatalogChallenge,
  ChallengeCatalogOutput,
  ChallengeFrequency,
  TodayChallenge,
  TodayOccurrenceDetail,
} from '@product/client';
import { displayChallengeTitle } from '@product/contract/challenge-title';
import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DeckButton,
  DeckNoteCard,
  DeckPageNav,
  DeckRoundButton,
  DeckSheetMessage,
  DeckToast,
} from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { weekDayKeys } from '@/components/home/day-keys';
import { WeekStrip } from '@/components/home/WeekStrip';
import { findBenefitTip, WhyItMatters } from '@/components/tips';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { challengesTabHref } from '@/lib/challenges-tab';
import { useLiveTodaySteps } from '@/lib/use-live-today-steps';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { rewardCornerLabel } from './catalog-layout';
import { deckCardVerb, isCountedOnCard, isOpenOccurrence } from './challenge-act';
import { mergeTodayIntoHistory } from './challenge-history';
import { ChallengeHero } from './ChallengeHero';
import { ChallengeSettingsSheet } from './ChallengeSettingsSheet';
import { ReminderSettings, ScheduleSettings } from './ChallengeSettingsSections';
import { confirmRemoval } from './confirm-removal';
import { ROUTINE_COPY, SETTINGS_COPY } from './constants/routine-copy';
import { WALK_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { timesLabel } from './history-weeks';
import { anotherSetRoute, openPoseContest } from './open-pose-contest';
import {
  CONTEST_AGAIN_HINT,
  PRACTICE_AGAIN_HINT,
  PRACTICE_AGAIN_LABEL,
  practiceMetric,
  practiceTallyCopy,
} from './practice-entry';
import { stepsHeroValue } from './steps-hero';
import type { SettingsSheet } from './types/settings-sheet';
import { useActOnChallenge } from './useActOnChallenge';
import {
  useRemoveChallenge,
  useRemoveReminder,
  useUpdateEnrollment,
} from './useChallengeMutations';
import { useChallengeQueries } from './useChallengeQueries';
import { useChallengeTone } from './useChallengeTone';
import { waterGlassCount, waterGlassGoal } from './water-glasses';

type ChallengeActs = ReturnType<typeof useActOnChallenge>;

/** A challenge's settings: everything saves as you change it, and removing it sits at the foot. */
export function ChallengeDetailScreen({ challengeId }: { challengeId: string }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { catalogQuery, todayQuery, detailsQuery } = useChallengeQueries();
  const acts = useActOnChallenge({ onFinished: finishAndLeave });

  if (catalogQuery.isPending) {
    return <ScreenLoader testID="challenge-detail-loading" />;
  }

  const challenge = catalogQuery.data?.challenges.find((item) => item.challengeId === challengeId);
  const occurrence = todayQuery.data?.challenges.find((item) => item.challengeId === challengeId);
  const detail = detailsQuery.data?.occurrences.find(
    (item) => item.userChallengeId === occurrence?.id,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.nav}>
        <DeckPageNav onBack={() => goBackOrHome(challengesTabHref('mine'))} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        testID="challenge-detail-screen"
      >
        {challenge && catalogQuery.data ? (
          <ChallengeSettingsBody
            acts={acts}
            catalog={catalogQuery.data}
            challenge={challenge}
            detail={detail ?? null}
            occurrence={occurrence ?? null}
            week={
              detailsQuery.data
                ? { startKey: detailsQuery.data.weekStartKey, todayKey: detailsQuery.data.dayKey }
                : null
            }
          />
        ) : (
          <DeckNoteCard
            body={SETTINGS_COPY.missingBody}
            glyph="search"
            testID="challenge-detail-missing"
            title={SETTINGS_COPY.missingTitle}
          />
        )}
      </ScrollView>
      {acts.toast ? (
        <DeckToast
          action={acts.toast.action}
          message={acts.toast.message}
          onDismiss={acts.dismissToast}
          testID="detail-act-toast"
        />
      ) : null}
    </View>
  );
}

type SettingsBodyProps = {
  challenge: CatalogChallenge;
  catalog: ChallengeCatalogOutput;
  occurrence: TodayChallenge | null;
  detail: TodayOccurrenceDetail | null;
  /** The member's current week, once Today's details have landed. */
  week: { startKey: string; todayKey: string } | null;
  acts: ChallengeActs;
};

function ChallengeSettingsBody(props: SettingsBodyProps) {
  const router = useRouter();
  const { challenge } = props;
  const benefit = useChallengeBenefitTip(challenge);

  if (!challenge.isEnrolled) {
    return (
      <>
        <DetailHero {...props} />
        <WhyItMatters tip={benefit} />
        <DeckNoteCard
          action={{
            label: ROUTINE_COPY.addLabel,
            onPress: () => router.replace('/manage-challenges'),
            testID: 'detail-open-catalog',
          }}
          body={SETTINGS_COPY.notEnrolledBody}
          glyph="plus"
          isOutlined
          title={SETTINGS_COPY.notEnrolledTitle}
        />
      </>
    );
  }

  if (challenge.isLocked) {
    return (
      <>
        <DetailHero {...props} />
        <WhyItMatters tip={benefit} />
        <DeckNoteCard
          action={{
            label: ROUTINE_COPY.pausedSheetMembership,
            onPress: () => router.push({ pathname: '/membership', params: { source: 'other' } }),
            testID: 'detail-membership',
          }}
          body={ROUTINE_COPY.pausedSheetBody}
          glyph="lock"
          testID="detail-paused"
          title={ROUTINE_COPY.pausedSheetTitle}
        />
        <RemoveChallenge challenge={challenge} />
      </>
    );
  }

  return <EnrolledSettings {...props} benefit={benefit} />;
}

function useChallengeBenefitTip(challenge: CatalogChallenge) {
  const tipsQuery = useQuery({ queryKey: ['tips'], queryFn: () => apiClient.listTips() });
  return findBenefitTip(tipsQuery.data?.tips ?? [], {
    challengeSlug: challenge.slug,
    activityKey: challenge.capture.metric,
  });
}

function EnrolledSettings(props: SettingsBodyProps & { benefit: ReturnType<typeof findBenefitTip> }) {
  const router = useRouter();
  const { challenge, catalog, occurrence, detail, benefit, acts } = props;
  const [sheet, setSheet] = useState<SettingsSheet | null>(null);
  const [frequency, setFrequency] = useState<ChallengeFrequency>(challenge.frequency);
  const updateEnrollment = useUpdateEnrollment();
  const removeReminder = useRemoveReminder();
  const historyQuery = useQuery({
    queryKey: ['challenges', 'history', challenge.challengeId],
    queryFn: () => apiClient.listChallengeHistory({ challengeId: challenge.challengeId }),
  });
  const history = mergeTodayIntoHistory(
    historyQuery.data?.entries ?? [],
    occurrence,
    detail?.completedAt ?? null,
  );

  function selectFrequency(next: ChallengeFrequency) {
    const previous = frequency;
    setFrequency(next);
    updateEnrollment.mutate(
      { challengeId: challenge.challengeId, frequency: next },
      { onError: () => setFrequency(previous) },
    );
  }

  const hasSaveError = updateEnrollment.isError || removeReminder.isError;
  const showsAct = occurrence !== null && isOpenOccurrence(occurrence.status);

  return (
    <>
      <DetailHero {...props} frequency={frequency} />
      {showsAct ? <DetailAct acts={acts} occurrence={occurrence} /> : null}
      <PracticeAgain occurrence={occurrence} />
      <WhyItMatters tip={benefit} />
      {hasSaveError ? <DeckSheetMessage message={SETTINGS_COPY.saveFailed} /> : null}
      <ScheduleSettings
        challenge={challenge}
        frequency={frequency}
        isSaving={updateEnrollment.isPending}
        onEditGoal={() => setSheet({ kind: 'goal' })}
        onSelectFrequency={selectFrequency}
      />
      <ReminderSettings
        hasMembership={catalog.hasMembership}
        historyCount={historyQuery.isPending ? null : timesLabel(history.length)}
        limit={catalog.maxRemindersPerChallenge}
        onAskForMore={() => setSheet({ kind: 'moreReminders' })}
        onEditReminder={(replacing) => setSheet({ kind: 'reminder', replacing })}
        onOpenHistory={() => router.push(`/challenge/${challenge.challengeId}/history`)}
        onRemoveReminder={(reminder) => removeReminder.mutate(reminder.id)}
        reminders={challenge.reminders}
      />
      <RemoveChallenge challenge={challenge} />
      <ChallengeSettingsSheet
        challenge={challenge}
        onClose={() => setSheet(null)}
        reminderLimit={catalog.maxRemindersPerChallenge}
        sheet={sheet}
      />
    </>
  );
}

/** Today's open act: the same verb the card uses, under the hero. */
function DetailAct({ occurrence, acts }: { occurrence: TodayChallenge; acts: ChallengeActs }) {
  const styles = useThemedStyles(createStyles);
  const counted = isCountedOnCard(occurrence);
  const glasses = waterGlassCount(occurrence);
  const canDecrement = counted && glasses > 0;

  return (
    <View style={styles.act} testID="detail-act">
      {counted ? (
        <Text style={styles.actCount} testID="detail-act-glasses">
          {glasses} of {waterGlassGoal(occurrence)} glasses
        </Text>
      ) : null}
      <View style={styles.actRow}>
        {canDecrement ? (
          <DeckRoundButton
            accessibilityLabel="Take one back"
            glyph="minus"
            onPress={() => acts.removeGlass(occurrence)}
            testID="detail-act-decrement"
          />
        ) : null}
        <DeckButton
          isFlexible
          label={deckCardVerb(occurrence)}
          loading={acts.isActing(occurrence.id)}
          onPress={() => acts.act(occurrence)}
          testID="detail-act-button"
        />
      </View>
    </View>
  );
}

function DetailHero({
  challenge,
  detail,
  week,
  frequency = challenge.frequency,
}: Omit<SettingsBodyProps, 'acts'> & { frequency?: ChallengeFrequency }) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tone } = useChallengeTone(challenge);
  const isSteps = challenge.capture.metric === 'steps';
  const liveSteps = useLiveTodaySteps({ ask: true, enabled: isSteps });
  const title = displayChallengeTitle({
    title: challenge.title,
    metric: challenge.capture.metric,
    count: challenge.capture.target.count,
  });
  const targetCount = challenge.capture.target.count;
  const stepsLine =
    isSteps && liveSteps.status === 'count'
      ? targetCount
        ? `${stepsHeroValue(liveSteps.count)} of ${targetCount.toLocaleString('en-GB')} ${WALK_COPY.steps}`
        : `${stepsHeroValue(liveSteps.count)} ${WALK_COPY.steps}`
      : null;

  return (
    <ChallengeHero
      challenge={challenge}
      corner={rewardCornerLabel(challenge.rewardPoints, frequency)}
      testID="challenge-detail-hero"
      title={title}
    >
      {stepsLine ? (
        <Text style={[styles.stepsLive, { color: deckCards.subtext }]} testID="detail-steps-live">
          {stepsLine}
        </Text>
      ) : null}
      {detail && week ? (
        <WeekStrip
          activeDayKeys={detail.activeDayKeys}
          dayKeys={weekDayKeys(week.startKey)}
          todayKey={week.todayKey}
          tone={tone}
        />
      ) : null}
    </ChallengeHero>
  );
}

/** Today's daily set is done; more sets go to an open contest when one is live. */
function PracticeAgain({ occurrence }: { occurrence: TodayChallenge | null }) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const metric = practiceMetric(occurrence);
  const matchesQuery = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => apiClient.listMyMatches(),
  });
  const totalsQuery = useQuery({
    queryKey: ['practice', 'totals', metric],
    queryFn: () => apiClient.getPracticeTotals({ metric: metric! }),
    enabled: metric !== null,
  });

  if (!metric || !occurrence) {
    return null;
  }

  const live = matchesQuery.data?.live ?? [];
  const contest = openPoseContest(live, metric);
  const tally = contest ? null : practiceTallyCopy(totalsQuery.data);

  return (
    <View style={styles.practice} testID="detail-practice">
      <DeckButton
        glyph="repeat"
        label={PRACTICE_AGAIN_LABEL}
        onPress={() => router.push(anotherSetRoute(occurrence.challengeId, metric, live))}
        testID="detail-practice-again"
      />
      <Text style={styles.practiceTally} testID="detail-practice-hint">
        {contest ? CONTEST_AGAIN_HINT : PRACTICE_AGAIN_HINT}
      </Text>
      {tally ? (
        <Text style={styles.practiceTally} testID="detail-practice-tally">
          {tally}
        </Text>
      ) : null}
    </View>
  );
}

function RemoveChallenge({ challenge }: { challenge: CatalogChallenge }) {
  const styles = useThemedStyles(createStyles);
  const removeChallenge = useRemoveChallenge();

  function remove() {
    confirmRemoval(challenge.title, () =>
      removeChallenge.mutate(challenge.challengeId, {
        onSuccess: () => goBackOrHome(challengesTabHref('mine')),
      }),
    );
  }

  return (
    <>
      {removeChallenge.isError ? <DeckSheetMessage message={SETTINGS_COPY.saveFailed} /> : null}
      <Pressable
        accessibilityRole="button"
        disabled={removeChallenge.isPending}
        onPress={remove}
        style={({ pressed }) => [styles.remove, pressed ? styles.removePressed : null]}
        testID="challenge-detail-stop"
      >
        <Text style={styles.removeLabel}>{SETTINGS_COPY.remove}</Text>
      </Pressable>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stepsLive: {
      marginTop: spacing.sm,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    nav: {
      paddingHorizontal: 20,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    act: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    actCount: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      textAlign: 'center',
    },
    actRow: {
      flexDirection: 'row',
      gap: 10,
    },
    practice: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    practiceTally: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      textAlign: 'center',
    },
    remove: {
      marginTop: spacing.lg,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removePressed: {
      opacity: 0.6,
    },
    removeLabel: {
      color: theme.colors.danger,
      fontSize: 15.5,
      fontWeight: fontWeight.medium,
    },
  });
