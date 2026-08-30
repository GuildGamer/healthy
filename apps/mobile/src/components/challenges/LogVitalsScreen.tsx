import type { ChallengeVitals } from '@product/client';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import {
  parseVitalsForm,
  type VitalsFieldErrors,
} from './parse-vitals';
import { useSaveChallengeDraft } from './useSaveChallengeDraft';

const SUBMIT_FAILED_MESSAGE =
  'We could not save that reading. Check the values and try again.';

function formatRecordedStamp(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(now);
}

export function LogVitalsScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');
  const [didHydrate, setDidHydrate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<VitalsFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recordedStamp = formatRecordedStamp(new Date());

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );
  const { schedule } = useSaveChallengeDraft(occurrence?.id);

  useEffect(() => {
    if (didHydrate || !occurrence || occurrence.draft?.kind !== 'vitals_bp') {
      if (occurrence) {
        setDidHydrate(true);
      }
      return;
    }

    const fields = occurrence.draft.fields;
    if (fields.systolic != null) {
      setSystolic(String(fields.systolic));
    }
    if (fields.diastolic != null) {
      setDiastolic(String(fields.diastolic));
    }
    if (fields.pulse != null) {
      setPulse(String(fields.pulse));
    }
    if (fields.notes) {
      setNotes(fields.notes);
    }
    setDidHydrate(true);
  }, [didHydrate, occurrence]);

  function persistDraft(next: {
    systolic: string;
    diastolic: string;
    pulse: string;
    notes: string;
  }) {
    const toNumber = (value: string): number | undefined => {
      if (value.trim() === '') {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    schedule({
      kind: 'vitals_bp',
      fields: {
        systolic: toNumber(next.systolic),
        diastolic: toNumber(next.diastolic),
        pulse: toNumber(next.pulse),
        notes: next.notes.trim() || undefined,
      },
    });
  }

  const submit = useMutation({
    mutationFn: async (vitals: ChallengeVitals) => {
      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      return apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        vitals,
      });
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
      if (result.evidenceRequest) {
        router.replace(`/challenge/${challengeId}/verify`);
        return;
      }

      router.replace({
        pathname: '/challenge/success',
        params: {
          title: occurrence?.title ?? 'Challenge',
          points: String(result.pointsAwarded),
          streak: String(result.currentStreakDays),
          penalty: String(result.penaltyApplied),
        },
      });
    },
    onError: (error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : SUBMIT_FAILED_MESSAGE,
      );
    },
  });

  if (todayQuery.isPending) {
    return <ScreenLoader testID="log-vitals-loading" />;
  }

  if (!occurrence) {
    return (
      <View style={styles.centred} testID="log-vitals-missing">
        <Text style={styles.missing}>
          This challenge is not on today&apos;s list.
        </Text>
      </View>
    );
  }

  if (occurrence.status === 'completed') {
    return (
      <View style={styles.centred} testID="log-vitals-done">
        <Text style={styles.title}>{occurrence.title}</Text>
        <Text style={styles.missing}>This reading is already logged.</Text>
        <FormButton label="Done" onPress={() => router.back()} />
      </View>
    );
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
        testID="log-vitals-screen"
      >
        <Text style={styles.title}>Log blood pressure</Text>
        <Text style={styles.subtitle}>{occurrence.title}</Text>
        <Text style={styles.stamp}>Recorded {recordedStamp}</Text>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        <FormField error={fieldErrors.systolic} label="Systolic" required>
          <TextField
            accessibilityLabel="Systolic"
            hasError={Boolean(fieldErrors.systolic)}
            keyboardType="number-pad"
            onChangeText={(value) => {
              setSystolic(value);
              persistDraft({ systolic: value, diastolic, pulse, notes });
            }}
            placeholder="120"
            testID="vitals-systolic"
            value={systolic}
          />
        </FormField>

        <FormField error={fieldErrors.diastolic} label="Diastolic" required>
          <TextField
            accessibilityLabel="Diastolic"
            hasError={Boolean(fieldErrors.diastolic)}
            keyboardType="number-pad"
            onChangeText={(value) => {
              setDiastolic(value);
              persistDraft({ systolic, diastolic: value, pulse, notes });
            }}
            placeholder="80"
            testID="vitals-diastolic"
            value={diastolic}
          />
        </FormField>

        <FormField
          error={fieldErrors.pulse}
          hint="Optional beats per minute"
          label="Pulse"
        >
          <TextField
            accessibilityLabel="Pulse"
            hasError={Boolean(fieldErrors.pulse)}
            keyboardType="number-pad"
            onChangeText={(value) => {
              setPulse(value);
              persistDraft({ systolic, diastolic, pulse: value, notes });
            }}
            placeholder="72"
            testID="vitals-pulse"
            value={pulse}
          />
        </FormField>

        <FormField error={fieldErrors.notes} label="Notes">
          <TextAreaField
            accessibilityLabel="Notes"
            hasError={Boolean(fieldErrors.notes)}
            onChangeText={(value) => {
              setNotes(value);
              persistDraft({ systolic, diastolic, pulse, notes: value });
            }}
            placeholder="Anything unusual about this reading"
            testID="vitals-notes"
            value={notes}
          />
        </FormField>

        <Text style={styles.hint}>
          At random intervals you may be asked to photograph your device
          screen showing the reading.
        </Text>

        <FormButton
          label="Save reading"
          loading={submit.isPending}
          onPress={() => {
            const parsed = parseVitalsForm({
              systolic,
              diastolic,
              pulse,
              notes,
            });

            if (!parsed.success) {
              setFieldErrors(parsed.errors);
              return;
            }

            setFieldErrors({});
            submit.mutate(parsed.data);
          }}
          testID="vitals-submit"
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
    gap: spacing.md,
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
  stamp: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  hint: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  missing: {
    color: colors.muted,
    textAlign: 'center',
  },
});
