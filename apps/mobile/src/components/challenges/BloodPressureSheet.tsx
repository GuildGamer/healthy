import type { ChallengeDraft, TodayChallenge } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DeckKeypad, DeckReadingSlot, type KeypadKey } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { READING_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { parseVitalsForm } from './parse-vitals';
import { bloodPressureError, isBloodPressureReady, typeBloodPressure } from './reading-entry';
import { ReadingSheetLayout } from './ReadingSheetLayout';
import { nowLabel } from './reading-time';
import { saveFailedMessage } from './save-error';
import type { BloodPressureEntry, BloodPressureField } from './types/reading-entry';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useSaveChallengeDraft } from './useSaveChallengeDraft';

type VitalsExtras = { pulse: string; notes: string };

function entryFromDraft(occurrence: TodayChallenge): BloodPressureEntry & VitalsExtras {
  const fields = occurrence.draft?.kind === 'vitals_bp' ? occurrence.draft.fields : {};
  const top = fields.systolic != null ? String(fields.systolic) : '';
  return {
    top,
    bottom: fields.diastolic != null ? String(fields.diastolic) : '',
    active: top.length > 0 ? 'bottom' : 'top',
    pulse: fields.pulse != null ? String(fields.pulse) : '',
    notes: fields.notes ?? '',
  };
}

function vitalsDraft(entry: BloodPressureEntry, extras: VitalsExtras): ChallengeDraft {
  const toNumber = (value: string) => (value === '' ? undefined : Number(value));
  return {
    kind: 'vitals_bp',
    fields: {
      systolic: toNumber(entry.top),
      diastolic: toNumber(entry.bottom),
      pulse: toNumber(extras.pulse),
      notes: extras.notes.trim() || undefined,
    },
  };
}

/** Blood pressure as the monitor shows it: the pair, big, typed top then bottom. */
export function BloodPressureSheet({ occurrence }: { occurrence: TodayChallenge }) {
  const initial = entryFromDraft(occurrence);
  const [entry, setEntry] = useState<BloodPressureEntry>(initial);
  const [extras, setExtras] = useState<VitalsExtras>({
    pulse: initial.pulse,
    notes: initial.notes,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [takenAt] = useState(() => new Date());
  const complete = useCompleteChallenge();
  const { schedule } = useSaveChallengeDraft(occurrence.id);

  function update(nextEntry: BloodPressureEntry, nextExtras: VitalsExtras) {
    setEntry(nextEntry);
    setExtras(nextExtras);
    setSaveError(null);
    schedule(vitalsDraft(nextEntry, nextExtras));
  }

  function save() {
    const parsed = parseVitalsForm({ systolic: entry.top, diastolic: entry.bottom, ...extras });
    if (!parsed.success) {
      setSaveError(Object.values(parsed.errors)[0] ?? null);
      return;
    }

    complete.mutate(
      { occurrence, payload: { vitals: parsed.data } },
      {
        onSuccess: (result) =>
          finishAndLeave(result, { kind: 'logged', loggedAt: takenAt.toISOString() }),
        onError: (error) => setSaveError(saveFailedMessage(error)),
      },
    );
  }

  return (
    <ReadingSheetLayout
      canSave={isBloodPressureReady(entry)}
      corner={nowLabel(takenAt)}
      didFail={complete.isError}
      isSaving={complete.isPending}
      label={READING_COPY.bloodPressure}
      message={bloodPressureError(entry) ?? saveError}
      occurrence={occurrence}
      onSave={save}
      saveLabel={READING_COPY.saveReading}
      testID="log-vitals-screen"
    >
      <BloodPressurePair
        entry={entry}
        hasError={bloodPressureError(entry) !== null}
        onFocus={(field) => setEntry({ ...entry, active: field })}
        occurrence={occurrence}
      />
      <DeckKeypad onKey={(key: KeypadKey) => update(typeBloodPressure(entry, key), extras)} />
      <VitalsExtrasLine extras={extras} onChange={(next) => update(entry, next)} />
    </ReadingSheetLayout>
  );
}

function BloodPressurePair({
  entry,
  hasError,
  onFocus,
  occurrence,
}: {
  entry: BloodPressureEntry;
  hasError: boolean;
  onFocus: (field: BloodPressureField) => void;
  occurrence: TodayChallenge;
}) {
  const styles = useThemedStyles(createStyles);
  const { tone } = useChallengeTone(occurrence);
  const topError = hasError && bloodPressureError({ ...entry, bottom: '' }) !== null;

  return (
    <View>
      <View style={styles.pair}>
        <DeckReadingSlot
          accessibilityLabel={READING_COPY.topLabel}
          hasError={topError}
          isActive={entry.active === 'top'}
          onPress={() => onFocus('top')}
          placeholder="120"
          testID="vitals-systolic"
          tone={tone}
          value={entry.top}
        />
        <Text style={styles.separator}>/</Text>
        <DeckReadingSlot
          accessibilityLabel={READING_COPY.bottomLabel}
          hasError={hasError && !topError}
          isActive={entry.active === 'bottom'}
          onPress={() => onFocus('bottom')}
          placeholder="80"
          testID="vitals-diastolic"
          tone={tone}
          value={entry.bottom}
        />
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{READING_COPY.topLabel}</Text>
        <Text style={styles.label}>{READING_COPY.bottomLabel}</Text>
      </View>
    </View>
  );
}

function VitalsExtrasLine({
  extras,
  onChange,
}: {
  extras: VitalsExtras;
  onChange: (next: VitalsExtras) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isOpen, setIsOpen] = useState(extras.pulse !== '' || extras.notes !== '');

  if (!isOpen) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={styles.link}
        testID="vitals-extras"
      >
        <Glyph color={colors.muted} name="plus" size={14} strokeWidth={2.2} />
        <Text style={styles.linkText}>{READING_COPY.addPulseOrNote}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.extras}>
      <TextInput
        accessibilityLabel={READING_COPY.pulsePlaceholder}
        keyboardType="number-pad"
        maxLength={3}
        onChangeText={(pulse) => onChange({ ...extras, pulse })}
        placeholder={READING_COPY.pulsePlaceholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.pulse]}
        testID="vitals-pulse"
        value={extras.pulse}
      />
      <TextInput
        accessibilityLabel={READING_COPY.notePlaceholder}
        onChangeText={(notes) => onChange({ ...extras, notes })}
        placeholder={READING_COPY.notePlaceholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.note]}
        testID="vitals-notes"
        value={extras.notes}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pair: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: 6,
      marginTop: 22,
    },
    separator: {
      color: theme.colors.muted,
      fontSize: 56,
      fontWeight: fontWeight.medium,
    },
    labels: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 56,
      marginTop: 6,
    },
    label: {
      color: theme.colors.muted,
      fontSize: 13,
    },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      minHeight: 32,
    },
    linkText: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
    },
    extras: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 14,
    },
    input: {
      height: 46,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      color: theme.colors.text,
      fontSize: fontSize.md,
      paddingHorizontal: 14,
    },
    pulse: {
      width: 92,
    },
    note: {
      flex: 1,
    },
  });
