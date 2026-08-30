import type {
  ChallengeCarbs,
  ChallengeDraft,
  ChallengeGlucose,
  ChallengePeakFlow,
  ChallengeWater,
  GlucoseContext,
  TodayChallenge,
  WaterUnit,
} from '@product/client';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import {
  FormButton,
  FormErrorBanner,
  FormField,
  TextAreaField,
  TextField,
} from '@/components/forms';
import { apiClient } from '@/lib/api';
import { useSaveChallengeDraft } from './useSaveChallengeDraft';

const SUBMIT_FAILED_MESSAGE =
  'We could not save that log. Check the values and try again.';

const GLUCOSE_CONTEXTS: { id: GlucoseContext; label: string }[] = [
  { id: 'fasting', label: 'Fasting' },
  { id: 'before_meal', label: 'Before meal' },
  { id: 'after_meal', label: 'After meal' },
];

const WATER_UNITS: { id: WaterUnit; label: string }[] = [
  { id: 'glasses', label: 'Glasses' },
  { id: 'ml', label: 'ml' },
];

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function LogReadingScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  if (todayQuery.isPending) {
    return <ScreenLoader testID="log-reading-loading" />;
  }

  if (!occurrence) {
    return (
      <View style={styles.centred}>
        <Text style={styles.missing}>
          This challenge is not on today&apos;s list.
        </Text>
      </View>
    );
  }

  if (
    occurrence.completionKind === 'vitals_bp' ||
    occurrence.completionKind === 'check_in' ||
    occurrence.completionKind === 'evidence_photo'
  ) {
    return (
      <View style={styles.centred}>
        <Text style={styles.missing}>This challenge uses a different log.</Text>
      </View>
    );
  }

  return (
    <ReadingForm
      challengeId={challengeId}
      occurrence={occurrence}
      onLogged={async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['me'] }),
          queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
          queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
          queryClient.invalidateQueries({ queryKey: ['activity'] }),
        ]);
        router.replace({
          pathname: '/challenge/success',
          params: {
            title: occurrence.title,
            points: String(result.pointsAwarded),
            streak: String(result.currentStreakDays),
          },
        });
      }}
    />
  );
}

function ReadingForm({
  challengeId,
  occurrence,
  onLogged,
}: {
  challengeId: string;
  occurrence: TodayChallenge;
  onLogged: (result: { pointsAwarded: number; currentStreakDays: number }) => Promise<void>;
}) {
  const draft = occurrence.draft;
  const { schedule } = useSaveChallengeDraft(occurrence.id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mmolL, setMmolL] = useState(
    draft?.kind === 'glucose' && draft.fields.mmolL != null
      ? String(draft.fields.mmolL)
      : '',
  );
  const [glucoseContext, setGlucoseContext] = useState<GlucoseContext | undefined>(
    draft?.kind === 'glucose' ? draft.fields.context : undefined,
  );
  const [peakFlow, setPeakFlow] = useState(
    draft?.kind === 'peak_flow' && draft.fields.bestLitresPerMinute != null
      ? String(draft.fields.bestLitresPerMinute)
      : '',
  );
  const [waterAmount, setWaterAmount] = useState(
    draft?.kind === 'water' && draft.fields.amount != null
      ? String(draft.fields.amount)
      : '',
  );
  const [waterUnit, setWaterUnit] = useState<WaterUnit>(
    draft?.kind === 'water' ? (draft.fields.unit ?? 'glasses') : 'glasses',
  );
  const [carbGrams, setCarbGrams] = useState(
    draft?.kind === 'carbs' && draft.fields.grams != null
      ? String(draft.fields.grams)
      : '',
  );
  const [carbNote, setCarbNote] = useState(
    draft?.kind === 'carbs' ? (draft.fields.note ?? '') : '',
  );

  const submit = useMutation({
    mutationFn: async () => {
      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      if (occurrence.completionKind === 'glucose') {
        const glucose: ChallengeGlucose = {
          mmolL: Number(mmolL),
          context: glucoseContext ?? 'fasting',
        };
        return apiClient.completeChallenge({
          userChallengeId: occurrence.id,
          glucose,
        });
      }

      if (occurrence.completionKind === 'peak_flow') {
        const peak: ChallengePeakFlow = {
          bestLitresPerMinute: Number(peakFlow),
        };
        return apiClient.completeChallenge({
          userChallengeId: occurrence.id,
          peakFlow: peak,
        });
      }

      if (occurrence.completionKind === 'water') {
        const water: ChallengeWater = {
          amount: Number(waterAmount),
          unit: waterUnit,
        };
        return apiClient.completeChallenge({
          userChallengeId: occurrence.id,
          water,
        });
      }

      const carbs: ChallengeCarbs = {
        grams: numberOrUndefined(carbGrams),
        note: carbNote.trim() || undefined,
      };
      return apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        carbs,
      });
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      await onLogged(result);
    },
    onError: () => {
      setErrorMessage(SUBMIT_FAILED_MESSAGE);
    },
  });

  function persistDraft(next: ChallengeDraft) {
    schedule(next);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
        testID={`log-reading-${challengeId}`}
      >
        <Text style={styles.title}>{occurrence.title}</Text>
        <Text style={styles.subtitle}>{occurrence.instruction}</Text>
        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        {occurrence.completionKind === 'glucose' ? (
          <>
            <FormField label="Glucose" required>
              <TextField
                accessibilityLabel="Glucose mmol/L"
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setMmolL(value);
                  persistDraft({
                    kind: 'glucose',
                    fields: {
                      mmolL: numberOrUndefined(value),
                      context: glucoseContext,
                    },
                  });
                }}
                placeholder="5.4"
                testID="log-glucose"
                value={mmolL}
              />
            </FormField>
            <Text style={styles.choiceLabel}>When</Text>
            <View style={styles.choices}>
              {GLUCOSE_CONTEXTS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    setGlucoseContext(option.id);
                    persistDraft({
                      kind: 'glucose',
                      fields: {
                        mmolL: numberOrUndefined(mmolL),
                        context: option.id,
                      },
                    });
                  }}
                  style={[
                    styles.choice,
                    glucoseContext === option.id && styles.choiceOn,
                  ]}
                >
                  <Text style={styles.choiceText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {occurrence.completionKind === 'peak_flow' ? (
          <FormField label="Best of three (L/min)" required>
            <TextField
              accessibilityLabel="Peak flow"
              keyboardType="number-pad"
              onChangeText={(value) => {
                setPeakFlow(value);
                persistDraft({
                  kind: 'peak_flow',
                  fields: { bestLitresPerMinute: numberOrUndefined(value) },
                });
              }}
              placeholder="450"
              testID="log-peak-flow"
              value={peakFlow}
            />
          </FormField>
        ) : null}

        {occurrence.completionKind === 'water' ? (
          <>
            <FormField label="Amount" required>
              <TextField
                accessibilityLabel="Water amount"
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setWaterAmount(value);
                  persistDraft({
                    kind: 'water',
                    fields: {
                      amount: numberOrUndefined(value),
                      unit: waterUnit,
                    },
                  });
                }}
                placeholder={waterUnit === 'ml' ? '1500' : '6'}
                testID="log-water"
                value={waterAmount}
              />
            </FormField>
            <View style={styles.choices}>
              {WATER_UNITS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    setWaterUnit(option.id);
                    persistDraft({
                      kind: 'water',
                      fields: {
                        amount: numberOrUndefined(waterAmount),
                        unit: option.id,
                      },
                    });
                  }}
                  style={[
                    styles.choice,
                    waterUnit === option.id && styles.choiceOn,
                  ]}
                >
                  <Text style={styles.choiceText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {occurrence.completionKind === 'carbs' ? (
          <>
            <FormField label="Grams">
              <TextField
                accessibilityLabel="Carbohydrate grams"
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setCarbGrams(value);
                  persistDraft({
                    kind: 'carbs',
                    fields: {
                      grams: numberOrUndefined(value),
                      note: carbNote || undefined,
                    },
                  });
                }}
                placeholder="45"
                testID="log-carbs-grams"
                value={carbGrams}
              />
            </FormField>
            <FormField label="Or a short note">
              <TextAreaField
                accessibilityLabel="Carbohydrate note"
                onChangeText={(value) => {
                  setCarbNote(value);
                  persistDraft({
                    kind: 'carbs',
                    fields: {
                      grams: numberOrUndefined(carbGrams),
                      note: value || undefined,
                    },
                  });
                }}
                placeholder="Rice and beans at lunch"
                testID="log-carbs-note"
                value={carbNote}
              />
            </FormField>
          </>
        ) : null}

        <FormButton
          label="Save log"
          loading={submit.isPending}
          onPress={() => submit.mutate()}
          testID="log-reading-submit"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  missing: {
    color: colors.muted,
    textAlign: 'center',
  },
  choiceLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  choiceOn: {
    backgroundColor: colors.accentContainer,
  },
  choiceText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
});
