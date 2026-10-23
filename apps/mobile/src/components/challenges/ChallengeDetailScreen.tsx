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
import { DeckNoteCard, DeckPageNav, DeckSheetMessage } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { weekDayKeys } from '@/components/home/day-keys';
import { WeekStrip } from '@/components/home/WeekStrip';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { useLiveTodaySteps } from '@/lib/use-live-today-steps';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { rewardCornerLabel } from './catalog-layout';
import { mergeTodayIntoHistory } from './challenge-history';
import { ChallengeHero } from './ChallengeHero';
import { ChallengeSettingsSheet } from './ChallengeSettingsSheet';
import { ReminderSettings, ScheduleSettings } from './ChallengeSettingsSections';
import { confirmRemoval } from './confirm-removal';
import { ROUTINE_COPY, SETTINGS_COPY } from './constants/routine-copy';
import { WALK_COPY } from './constants/doing-copy';
import { timesLabel } from './history-weeks';
import { stepsHeroValue } from './steps-hero';
import type { SettingsSheet } from './types/settings-sheet';
import {
  useRemoveChallenge,
  useRemoveReminder,
  useUpdateEnrollment,
} from './useChallengeMutations';
import { useChallengeQueries } from './useChallengeQueries';
import { useChallengeTone } from './useChallengeTone';

/** A challenge's settings: everything saves as you change it, and removing it sits at the foot. */
export function ChallengeDetailScreen({ challengeId }: { challengeId: string }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { catalogQuery, todayQuery, detailsQuery } = useChallengeQueries();

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
        <DeckPageNav onBack={() => goBackOrHome('/(tabs)/challenges')} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        testID="challenge-detail-screen"
      >
        {challenge && catalogQuery.data ? (
          <ChallengeSettingsBody
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
};

function ChallengeSettingsBody(props: SettingsBodyProps) {
  const router = useRouter();
  const { challenge } = props;

  if (!challenge.isEnrolled) {
    return (
      <>
        <DetailHero {...props} />
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

  return <EnrolledSettings {...props} />;
}

function EnrolledSettings(props: SettingsBodyProps) {
  const router = useRouter();
  const { challenge, catalog, occurrence, detail } = props;
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

  return (
    <>
      <DetailHero {...props} frequency={frequency} />
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

function DetailHero({
  challenge,
  detail,
  week,
  frequency = challenge.frequency,
}: SettingsBodyProps & { frequency?: ChallengeFrequency }) {
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

function RemoveChallenge({ challenge }: { challenge: CatalogChallenge }) {
  const styles = useThemedStyles(createStyles);
  const removeChallenge = useRemoveChallenge();

  function remove() {
    confirmRemoval(challenge.title, () =>
      removeChallenge.mutate(challenge.challengeId, {
        onSuccess: () => goBackOrHome('/(tabs)/challenges'),
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
