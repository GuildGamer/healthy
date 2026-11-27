import type { GlucoseContext, TodayChallenge } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DeckKeypad, DeckReadingSlot, DeckSheetTitle } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GLUCOSE_CONTEXT_CHOICES, READING_COPY } from './constants/doing-copy';
import { finishAndLeave } from './finish-challenge';
import { applyKeypadKey, readingRangeError } from './reading-entry';
import { ReadingSheetLayout } from './ReadingSheetLayout';
import { mealLabel, nowLabel } from './reading-time';
import { saveFailedMessage } from './save-error';
import {
  SINGLE_READING_RULES,
  canSaveSingleReading,
  initialSingleReading,
  singleReadingDraft,
  singleReadingPayload,
} from './single-reading';
import type { SingleReadingKind, SingleReadingState } from './types/single-reading';
import { useChallengeTone } from './useChallengeTone';
import { useCompleteChallenge } from './useCompleteChallenge';
import { useSaveChallengeDraft } from './useSaveChallengeDraft';

const SHEET_LABEL: Record<SingleReadingKind, string> = {
  glucose: READING_COPY.glucose,
  peak_flow: READING_COPY.peakFlow,
  carbs: READING_COPY.carbs,
};

const SHEET_UNIT: Record<SingleReadingKind, string> = {
  glucose: READING_COPY.glucoseUnit,
  peak_flow: READING_COPY.peakFlowUnit,
  carbs: READING_COPY.carbsUnit,
};

const SHEET_PLACEHOLDER: Record<SingleReadingKind, string> = {
  glucose: '5.4',
  peak_flow: '450',
  carbs: '45',
};

interface SingleReadingSheetProps {
  occurrence: TodayChallenge;
  kind: SingleReadingKind;
}

/** Glucose, peak flow, or carbs: one big number, our keypad, and whatever the number needs. */
export function SingleReadingSheet({ occurrence, kind }: SingleReadingSheetProps) {
  const [reading, setReading] = useState<SingleReadingState>(() =>
    initialSingleReading(occurrence.draft),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [takenAt] = useState(() => new Date());
  const complete = useCompleteChallenge();
  const { schedule } = useSaveChallengeDraft(occurrence.id);
  const rangeError = reading.isWritingNote
    ? null
    : readingRangeError(reading.value, SINGLE_READING_RULES[kind]);

  function update(next: SingleReadingState) {
    setReading(next);
    setSaveError(null);
    schedule(singleReadingDraft(kind, next));
  }

  function save() {
    const payload = singleReadingPayload(kind, reading);
    if (!payload) {
      return;
    }

    complete.mutate(
      { occurrence, payload },
      {
        onSuccess: (result) =>
          finishAndLeave(result, { kind: 'logged', loggedAt: takenAt.toISOString() }),
        onError: (error) => setSaveError(saveFailedMessage(error)),
      },
    );
  }

  return (
    <ReadingSheetLayout
      canSave={canSaveSingleReading(kind, reading)}
      corner={kind === 'carbs' ? mealLabel(takenAt) : nowLabel(takenAt)}
      didFail={complete.isError}
      isSaving={complete.isPending}
      label={SHEET_LABEL[kind]}
      message={rangeError ?? saveError}
      occurrence={occurrence}
      onSave={save}
      saveLabel={kind === 'carbs' ? READING_COPY.save : READING_COPY.saveReading}
      testID={`log-reading-${occurrence.challengeId}`}
    >
      {kind === 'peak_flow' ? <DeckSheetTitle>{READING_COPY.peakFlowTitle}</DeckSheetTitle> : null}
      <SingleReadingBody
        kind={kind}
        occurrence={occurrence}
        reading={reading}
        rangeError={rangeError}
        update={update}
      />
    </ReadingSheetLayout>
  );
}

function SingleReadingBody({
  kind,
  occurrence,
  reading,
  rangeError,
  update,
}: {
  kind: SingleReadingKind;
  occurrence: TodayChallenge;
  reading: SingleReadingState;
  rangeError: string | null;
  update: (next: SingleReadingState) => void;
}) {
  if (reading.isWritingNote) {
    return (
      <>
        <CarbsNote note={reading.note} onChange={(note) => update({ ...reading, note })} />
        <SwapLine
          label={READING_COPY.useGrams}
          onPress={() => update({ ...reading, isWritingNote: false })}
        />
      </>
    );
  }

  return (
    <>
      <ReadingLine
        kind={kind}
        occurrence={occurrence}
        hasError={rangeError !== null}
        value={reading.value}
      />
      {kind === 'glucose' ? (
        <GlucoseChoices
          selected={reading.context}
          onSelect={(context) => update({ ...reading, context })}
        />
      ) : null}
      <DeckKeypad
        allowsDecimal={SINGLE_READING_RULES[kind].decimals > 0}
        onKey={(key) =>
          update({
            ...reading,
            value: applyKeypadKey(reading.value, key, SINGLE_READING_RULES[kind]),
          })
        }
      />
      {kind === 'carbs' ? (
        <SwapLine
          label={READING_COPY.writeNote}
          onPress={() => update({ ...reading, isWritingNote: true })}
        />
      ) : null}
    </>
  );
}

function ReadingLine({
  kind,
  occurrence,
  hasError,
  value,
}: {
  kind: SingleReadingKind;
  occurrence: TodayChallenge;
  hasError: boolean;
  value: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { tone } = useChallengeTone(occurrence);

  return (
    <View style={styles.reading}>
      <DeckReadingSlot
        accessibilityLabel={SHEET_LABEL[kind]}
        hasError={hasError}
        isActive
        placeholder={SHEET_PLACEHOLDER[kind]}
        testID={`log-${kind}`}
        tone={tone}
        value={value}
      />
      <Text style={styles.unit}>{SHEET_UNIT[kind]}</Text>
    </View>
  );
}

function GlucoseChoices({
  selected,
  onSelect,
}: {
  selected: GlucoseContext | null;
  onSelect: (context: GlucoseContext) => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityRole="radiogroup" style={styles.choices}>
      {GLUCOSE_CONTEXT_CHOICES.map((choice) => {
        const isOn = choice.id === selected;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: isOn }}
            key={choice.id}
            onPress={() => onSelect(choice.id)}
            style={[styles.choice, isOn ? styles.choiceOn : null]}
            testID={`glucose-${choice.id}`}
          >
            <Text style={[styles.choiceText, isOn ? styles.choiceTextOn : null]}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CarbsNote({ note, onChange }: { note: string; onChange: (note: string) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TextInput
      accessibilityLabel={READING_COPY.carbsNotePlaceholder}
      autoFocus
      maxLength={500}
      multiline
      onChangeText={onChange}
      placeholder={READING_COPY.carbsNotePlaceholder}
      placeholderTextColor={colors.muted}
      style={styles.note}
      testID="log-carbs-note"
      value={note}
    />
  );
}

function SwapLine({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Glyph color={colors.muted} name="message" size={14} strokeWidth={2} />
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    reading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: 6,
      marginTop: 22,
    },
    unit: {
      color: theme.colors.muted,
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    choices: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 18,
    },
    choice: {
      flex: 1,
      height: 44,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choiceOn: {
      backgroundColor: theme.colors.text,
    },
    choiceText: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    choiceTextOn: {
      color: theme.colors.background,
    },
    note: {
      marginTop: 18,
      minHeight: 110,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      color: theme.colors.text,
      fontSize: fontSize.md,
      padding: 14,
      textAlignVertical: 'top',
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
  });
