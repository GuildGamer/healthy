import type { TodayChallenge } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DeckButton,
  DeckSheet,
  DeckSheetEyebrow,
  DeckSheetMessage,
  DeckSheetTitle,
} from '@/components/deck';
import { ConnectHealthSheet } from '@/components/health/ConnectHealthSheet';
import { formatClockTime } from '@/lib/clock-time';
import { apiClient } from '@/lib/api';
import { readLastNightSleep, type SleepSample } from '@/lib/device-health';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { READING_COPY, SAVE_RETRY_LABEL, SLEEP_RESTED_CHOICES } from './constants/doing-copy';
import { DEFAULT_BED_MINUTE, DEFAULT_WAKE_MINUTE } from './constants/sleep-defaults';
import { finishAndLeave } from './finish-challenge';
import { nowLabel } from './reading-time';
import { ReadingSheetLayout } from './ReadingSheetLayout';
import { saveFailedMessage } from './save-error';
import { sleepDurationLabel, sleepDurationMinutes, sleepWindow } from './sleep-window';
import { TimePickerModal } from './TimePickerModal';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';

type Picking = 'bed' | 'wake' | null;
type Face = 'loading' | 'confirm' | 'times';

function localMinuteOfDayFromIso(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function sleepSourceLabel(sample: SleepSample): string {
  if (sample.source === 'healthkit') {
    return sample.inBedOnly ? READING_COPY.inBedFromAppleHealth : READING_COPY.fromAppleHealth;
  }

  return sample.inBedOnly
    ? READING_COPY.inBedFromHealthConnect
    : READING_COPY.fromHealthConnect;
}

function useHealthLinkPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });

  useEffect(() => {
    if (meQuery.data?.healthLinkStatus === 'unknown') {
      setIsVisible(true);
    }
  }, [meQuery.data?.healthLinkStatus]);

  return { isVisible, close: () => setIsVisible(false) };
}

/** Bedtime, wake time, and an optional rested rating for last night's sleep. */
export function SleepSheet({ occurrence }: { occurrence: TodayChallenge }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tone, glyph } = useChallengeTone(occurrence);
  const healthPrompt = useHealthLinkPrompt();
  const [face, setFace] = useState<Face>('loading');
  const [sample, setSample] = useState<SleepSample | null>(null);
  const [bedMinute, setBedMinute] = useState(DEFAULT_BED_MINUTE);
  const [wakeMinute, setWakeMinute] = useState(DEFAULT_WAKE_MINUTE);
  const [rested, setRested] = useState<number | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [takenAt] = useState(() => new Date());
  const [saveError, setSaveError] = useState<string | null>(null);
  const complete = useCompleteChallenge();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const night = await readLastNightSleep(takenAt);
      if (cancelled) {
        return;
      }

      if (night) {
        setSample(night);
        setBedMinute(localMinuteOfDayFromIso(night.wentToBedAt));
        setWakeMinute(localMinuteOfDayFromIso(night.wokeUpAt));
        setFace('confirm');
        return;
      }

      setFace('times');
    })();

    return () => {
      cancelled = true;
    };
  }, [takenAt]);

  const window =
    face === 'confirm' && sample
      ? { wentToBedAt: sample.wentToBedAt, wokeUpAt: sample.wokeUpAt }
      : sleepWindow(bedMinute, wakeMinute, takenAt);
  const durationMinutes =
    face === 'confirm' && sample ? sample.durationMinutes : sleepDurationMinutes(window);
  const canSave = durationMinutes >= 60 && durationMinutes <= 16 * 60;

  function save() {
    if (!canSave) {
      return;
    }

    setSaveError(null);
    complete.mutate(
      {
        occurrence,
        payload: {
          sleep: {
            ...window,
            ...(rested !== null ? { rested } : {}),
          },
        },
      },
      {
        onSuccess: (result) =>
          finishAndLeave(result, { kind: 'logged', loggedAt: takenAt.toISOString() }),
        onError: (error) => setSaveError(saveFailedMessage(error)),
      },
    );
  }

  function applySampleToPickers(night: SleepSample) {
    setBedMinute(localMinuteOfDayFromIso(night.wentToBedAt));
    setWakeMinute(localMinuteOfDayFromIso(night.wokeUpAt));
  }

  async function refreshAfterConnect() {
    const night = await readLastNightSleep(takenAt);
    if (night) {
      setSample(night);
      applySampleToPickers(night);
      setFace('confirm');
      return;
    }

    setSample(null);
    setFace('times');
  }

  const restedChoices = (
    <>
      <Text style={styles.restedPrompt}>{READING_COPY.restedPrompt}</Text>
      <View accessibilityRole="radiogroup" style={styles.restedChoices}>
        {SLEEP_RESTED_CHOICES.map((value) => {
          const isOn = value === rested;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isOn }}
              key={value}
              onPress={() => setRested(isOn ? null : value)}
              style={[styles.restedChoice, isOn ? styles.restedChoiceOn : null]}
              testID={`sleep-rested-${value}`}
            >
              <Text style={[styles.restedText, isOn ? styles.restedTextOn : null]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <>
      {face === 'loading' ? (
        <DeckSheet onDismiss={() => goBackOrHome()} testID={`log-reading-${occurrence.challengeId}`}>
          <DeckSheetEyebrow
            corner={nowLabel(takenAt)}
            glyph={glyph}
            label={READING_COPY.sleep}
            tone={tone}
          />
          <View style={styles.loading}>
            <ActivityIndicator color={colors.text} testID="sleep-health-loading" />
          </View>
        </DeckSheet>
      ) : null}

      {face === 'confirm' && sample ? (
        <DeckSheet
          onDismiss={complete.isPending ? undefined : () => goBackOrHome()}
          testID={`log-reading-${occurrence.challengeId}`}
        >
          <DeckSheetEyebrow
            corner={nowLabel(takenAt)}
            glyph={glyph}
            label={READING_COPY.sleep}
            tone={tone}
          />
          <DeckSheetTitle>{READING_COPY.sleepTitle}</DeckSheetTitle>
          <View style={styles.duration}>
            <Text style={styles.durationValue} testID="log-sleep-duration">
              {sleepDurationLabel(durationMinutes)}
            </Text>
            <Text style={styles.source} testID="sleep-health-source">
              {sleepSourceLabel(sample)}
            </Text>
          </View>
          <View style={styles.times}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{READING_COPY.wentToBed}</Text>
              <Text style={styles.timeValue}>{formatClockTime(new Date(sample.wentToBedAt))}</Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{READING_COPY.wokeUp}</Text>
              <Text style={styles.timeValue}>{formatClockTime(new Date(sample.wokeUpAt))}</Text>
            </View>
          </View>
          {restedChoices}
          {saveError ? <DeckSheetMessage message={saveError} testID="reading-message" /> : null}
          <View style={styles.save}>
            <DeckButton
              disabled={!canSave}
              label={complete.isError ? SAVE_RETRY_LABEL : READING_COPY.saveSleep}
              loading={complete.isPending}
              onPress={save}
              testID="reading-save"
            />
            <DeckButton
              disabled={complete.isPending}
              label={READING_COPY.editTimes}
              onPress={() => {
                applySampleToPickers(sample);
                setFace('times');
              }}
              testID="sleep-edit-times"
              variant="quiet"
            />
          </View>
        </DeckSheet>
      ) : null}

      {face === 'times' ? (
        <ReadingSheetLayout
          canSave={canSave}
          corner={nowLabel(takenAt)}
          didFail={complete.isError}
          isSaving={complete.isPending}
          label={READING_COPY.sleep}
          message={saveError}
          occurrence={occurrence}
          onSave={save}
          saveLabel={READING_COPY.saveSleep}
          testID={`log-reading-${occurrence.challengeId}`}
        >
          <DeckSheetTitle>{READING_COPY.sleepTitle}</DeckSheetTitle>
          <View style={styles.duration}>
            <Text style={styles.durationValue} testID="log-sleep-duration">
              {sleepDurationLabel(durationMinutes)}
            </Text>
          </View>
          <View style={styles.times}>
            <TimeRow
              label={READING_COPY.wentToBed}
              minute={bedMinute}
              onPress={() => setPicking('bed')}
              testID="sleep-bed-time"
            />
            <TimeRow
              label={READING_COPY.wokeUp}
              minute={wakeMinute}
              onPress={() => setPicking('wake')}
              testID="sleep-wake-time"
            />
          </View>
          {restedChoices}
        </ReadingSheetLayout>
      ) : null}

      <TimePickerModal
        initialMinute={picking === 'wake' ? wakeMinute : bedMinute}
        onCancel={() => setPicking(null)}
        onConfirm={(minute) => {
          if (picking === 'bed') {
            setBedMinute(minute);
          } else if (picking === 'wake') {
            setWakeMinute(minute);
          }
          setPicking(null);
        }}
        title={picking === 'wake' ? READING_COPY.wokeUp : READING_COPY.wentToBed}
        visible={picking !== null}
      />
      <ConnectHealthSheet
        onClose={() => {
          healthPrompt.close();
          void refreshAfterConnect();
        }}
        visible={healthPrompt.isVisible}
      />
    </>
  );
}

function TimeRow({
  label,
  minute,
  onPress,
  testID,
}: {
  label: string;
  minute: number;
  onPress: () => void;
  testID: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.timeRow} testID={testID}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{formatClockTime(minute)}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loading: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    duration: {
      alignItems: 'center',
      marginTop: 18,
    },
    durationValue: {
      color: theme.colors.text,
      fontSize: 56,
      fontWeight: fontWeight.semibold,
      letterSpacing: -2,
      lineHeight: 60,
    },
    source: {
      marginTop: spacing.sm,
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    times: {
      marginTop: 22,
      gap: spacing.sm,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
      paddingHorizontal: 16,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    timeLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    timeValue: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    restedPrompt: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      marginTop: 20,
      textAlign: 'center',
    },
    restedChoices: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 12,
    },
    restedChoice: {
      flex: 1,
      height: 44,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    restedChoiceOn: {
      backgroundColor: theme.colors.text,
    },
    restedText: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    restedTextOn: {
      color: theme.colors.background,
    },
    save: {
      marginTop: spacing.md - 2,
      gap: spacing.sm,
    },
  });
