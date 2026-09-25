import type {
  MatchMetric,
  MatchScoringMode,
  MatchWindow,
} from '@product/client';
import {
  MATCH_LENGTH_MAX_DAYS,
  MATCH_MODES_BY_METRIC,
  MATCH_WINDOWS_BY_SCORING_MODE,
} from '@product/contract/match-board';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormButton, FormErrorBanner, NumberStepper } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { MatchKicker } from './match-chrome';
import {
  MATCH_ACTIVITY,
  MATCH_CREATE_CTA,
  MATCH_CREATE_CTA_CREW,
  MATCH_CREATE_TITLE,
  MATCH_CUSTOM_DAYS_FEWER,
  MATCH_CUSTOM_DAYS_MORE,
  MATCH_CUSTOM_DAYS_UNIT,
  MATCH_HOW_LONG,
  MATCH_KICKER,
  MATCH_MODE_LABEL,
  MATCH_NEW_GROUP,
  MATCH_WHAT_COUNTS,
  MATCH_WHOS_IN,
  MATCH_WINDOW_CUSTOM,
  MATCH_WINDOW_MONTH,
  MATCH_WINDOW_TODAY,
  MATCH_WINDOW_WEEK,
  matchSetupSummary,
} from './match-copy';
import {
  MATCH_CUSTOM_DAYS_DEFAULT,
  clampCustomDays,
  customDaysFloor,
  legalChoiceFor,
  matchChosenLength,
  matchLengthInput,
  type MatchLengthChoice,
} from './match-length';
import {
  MATCH_ANY_DAILY_CHOICE,
  MATCH_ANY_DAILY_LABEL,
  MATCH_DEFAULT_METRIC,
  MATCH_METRIC_LABEL,
  activityChoiceForMode,
  legalScoringModeFor,
  matchActivityInput,
  type MatchActivityChoice,
} from './match-metric';
import { shareMatchLink } from './share-match-link';

const METRICS: MatchMetric[] = ['pushups', 'walk'];

const WINDOW_LABEL: Record<MatchWindow, string> = {
  today: MATCH_WINDOW_TODAY,
  week: MATCH_WINDOW_WEEK,
  month: MATCH_WINDOW_MONTH,
};

export function MatchCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activityChoice, setActivityChoice] =
    useState<MatchActivityChoice>(MATCH_DEFAULT_METRIC);
  const [scoringMode, setScoringMode] =
    useState<MatchScoringMode>('best_single');
  const [length, setLength] = useState<MatchLengthChoice>({
    kind: 'preset',
    window: 'today',
  });
  const [crewId, setCrewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { metric, dailyScope } = matchActivityInput(
    activityChoice,
    scoringMode,
  );
  const modes = MATCH_MODES_BY_METRIC[metric];
  const windows = MATCH_WINDOWS_BY_SCORING_MODE[scoringMode];
  const crewsQuery = useQuery({
    queryKey: ['crews'],
    queryFn: () => apiClient.listCrews(),
  });
  const crews = crewsQuery.data?.crews ?? [];

  const create = useMutation({
    mutationFn: () =>
      apiClient.createMatch({
        ...matchLengthInput(length),
        metric,
        scoringMode,
        dailyScope,
        ...(crewId ? { crewId } : {}),
      }),
    onSuccess: async (result) => {
      setError(null);
      // A crew is already seated, so there is no link to hand anyone.
      if (!crewId) {
        await shareMatchLink(result.invite.url);
      }
      router.replace(`/matches/${result.match.id}`);
    },
    onError: () => {
      setError('We could not start that group. Try again.');
    },
  });

  function chooseMode(next: MatchScoringMode) {
    // Only a change of mode re-opens the activity, so a host who narrowed a
    // streak does not lose it by tapping Streak again.
    if (next !== scoringMode) {
      setActivityChoice((current) => activityChoiceForMode(next, current));
    }

    setScoringMode(next);
    setLength((current) => legalChoiceFor(current, next));
  }

  function chooseActivity(next: MatchActivityChoice) {
    setActivityChoice(next);
    if (next === MATCH_ANY_DAILY_CHOICE) {
      return;
    }

    chooseMode(legalScoringModeFor(next, scoringMode));
  }

  return (
    <View style={styles.screen} testID="match-create-screen">
      {/* Four choices, a rule sentence and a stepper outgrow a short phone, so
          the form scrolls under a pinned button like the other pick screens. */}
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <MatchKicker>{MATCH_KICKER}</MatchKicker>
        <Text style={styles.title}>{MATCH_CREATE_TITLE}</Text>

        <Text style={styles.section}>{MATCH_ACTIVITY}</Text>
        <View style={styles.pillRow}>
          {METRICS.map((option) => (
            <OptionPill
              key={option}
              label={MATCH_METRIC_LABEL[option]}
              onPress={() => chooseActivity(option)}
              selected={option === activityChoice}
              testID={`match-metric-${option}`}
            />
          ))}
          {/* Only a streak can count every daily challenge, and there it is a
              peer of the activities rather than a setting on one. */}
          {scoringMode === 'days_completed' ? (
            <OptionPill
              label={MATCH_ANY_DAILY_LABEL}
              onPress={() => chooseActivity(MATCH_ANY_DAILY_CHOICE)}
              selected={activityChoice === MATCH_ANY_DAILY_CHOICE}
              testID="match-metric-any"
            />
          ) : null}
        </View>

        {/* One option is not a choice, so the row stays hidden until a crew
            has been saved from a contest. */}
        {crews.length > 0 ? (
          <>
            <Text style={styles.section}>{MATCH_WHOS_IN}</Text>
            <View style={styles.pillRow}>
              <OptionPill
                label={MATCH_NEW_GROUP}
                onPress={() => setCrewId(null)}
                selected={crewId === null}
                testID="match-crew-new"
              />
              {crews.map((crew) => (
                <OptionPill
                  key={crew.id}
                  label={crew.name}
                  onPress={() => setCrewId(crew.id)}
                  selected={crew.id === crewId}
                  testID={`match-crew-${crew.id}`}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.section}>{MATCH_WHAT_COUNTS}</Text>
        <View style={styles.pillRow}>
          {modes.map((mode) => (
            <OptionPill
              key={mode}
              label={MATCH_MODE_LABEL[mode]}
              onPress={() => chooseMode(mode)}
              selected={mode === scoringMode}
              testID={`match-mode-${mode}`}
            />
          ))}
        </View>

        <Text style={styles.section}>{MATCH_HOW_LONG}</Text>
        <View style={styles.pillRow}>
          {windows.map((option) => (
            <OptionPill
              key={option}
              label={WINDOW_LABEL[option]}
              onPress={() => setLength({ kind: 'preset', window: option })}
              selected={length.kind === 'preset' && length.window === option}
              testID={`match-window-${option}`}
            />
          ))}
          <OptionPill
            label={MATCH_WINDOW_CUSTOM}
            onPress={() =>
              setLength({
                kind: 'custom',
                days: clampCustomDays(MATCH_CUSTOM_DAYS_DEFAULT, scoringMode),
              })
            }
            selected={length.kind === 'custom'}
            testID="match-window-custom"
          />
        </View>

        {length.kind === 'custom' ? (
          <NumberStepper
            decrementLabel={MATCH_CUSTOM_DAYS_FEWER}
            incrementLabel={MATCH_CUSTOM_DAYS_MORE}
            max={MATCH_LENGTH_MAX_DAYS}
            min={customDaysFloor(scoringMode)}
            onChange={(days) => setLength({ kind: 'custom', days })}
            suffix={MATCH_CUSTOM_DAYS_UNIT}
            testID="match-window-days"
            typable
            value={length.days}
          />
        ) : null}

        {/* The one place the form explains itself, so every choice above can
            stay a bare label. */}
        <Text style={styles.summary} testID="match-setup-summary">
          {matchSetupSummary(
            matchChosenLength(length),
            scoringMode,
            metric,
            dailyScope,
          )}
        </Text>

        {error ? <FormErrorBanner message={error} /> : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <FormButton
          label={crewId ? MATCH_CREATE_CTA_CREW : MATCH_CREATE_CTA}
          loading={create.isPending}
          onPress={() => create.mutate()}
          testID="match-create-submit"
          trailingIcon={crewId ? 'play' : 'share'}
        />
      </View>
    </View>
  );
}

/** One choice in a section. Bare label: the summary below does the explaining. */
function OptionPill({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : null,
        pressed ? styles.pillPressed : null,
      ]}
      testID={testID}
    >
      <Text
        style={[styles.pillLabel, selected ? styles.pillLabelSelected : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  summary: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  section: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accent,
  },
  pillPressed: {
    opacity: 0.7,
  },
  pillLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  pillLabelSelected: {
    color: colors.accent,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
