import Feather from '@expo/vector-icons/Feather';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { ChallengeEvidence } from '@product/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { consumeCaptureResult } from '@/lib/capture-session';

const SUBMIT_FAILED_MESSAGE =
  'We could not check that photo. Take another and try again.';

function remainingSeconds(expiresAt: string): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function EvidenceRequestScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const didAutoSkip = useRef(false);

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );
  const evidenceRequest = occurrence?.evidenceRequest ?? null;

  useEffect(() => {
    if (!evidenceRequest) {
      setSecondsLeft(null);
      return;
    }

    const expiresAt = evidenceRequest.expiresAt;

    function tick() {
      setSecondsLeft(remainingSeconds(expiresAt));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [evidenceRequest]);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
      queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
      queryClient.invalidateQueries({ queryKey: ['activity'] }),
    ]);

  const submit = useMutation({
    mutationFn: async (evidence: ChallengeEvidence) => {
      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      return apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        evidence,
      });
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      await invalidate();
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

  const skip = useMutation({
    mutationFn: async () => {
      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      return apiClient.skipChallengeEvidence({
        userChallengeId: occurrence.id,
      });
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      await invalidate();
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

  useEffect(() => {
    if (secondsLeft !== 0 || !occurrence || didAutoSkip.current) {
      return;
    }

    didAutoSkip.current = true;
    skip.mutate();
  }, [occurrence, secondsLeft, skip]);

  useFocusEffect(
    useCallback(() => {
      const captured = consumeCaptureResult(challengeId);
      if (!captured) {
        return;
      }

      submit.mutate({
        mimeType: captured.mimeType,
        imageBase64: captured.imageBase64,
      });
    }, [challengeId, submit]),
  );

  if (todayQuery.isPending) {
    return <ScreenLoader testID="evidence-request-loading" />;
  }

  if (!occurrence || occurrence.status === 'completed') {
    return (
      <View style={styles.centred} testID="evidence-request-closed">
        <Text style={styles.missing}>This photo check is no longer open.</Text>
        <FormButton label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  const hint =
    occurrence.completionKind === 'vitals_bp'
      ? 'Photograph your monitor or the screen that shows this reading.'
      : 'Take a photo that shows you doing this challenge.';
  const penalty = evidenceRequest?.penaltyPoints ?? 0;

  return (
    <View style={styles.container} testID="evidence-request-screen">
      <View style={styles.body}>
        <View style={styles.timer} testID="evidence-request-timer">
          <Text style={styles.timerValue}>
            {formatCountdown(secondsLeft ?? evidenceRequest?.windowSeconds ?? 0)}
          </Text>
          <Text style={styles.timerLabel}>remaining</Text>
        </View>

        <Text style={styles.title}>Photo check</Text>
        <Text style={styles.subtitle}>{occurrence.title}</Text>
        <Text style={styles.hint}>{hint}</Text>

        <View style={styles.warning}>
          <Feather color={colors.warning} name="alert-circle" size={18} />
          <Text style={styles.warningText}>
            Skipping or running out of time deducts {penalty} points.
          </Text>
        </View>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
      </View>

      <View style={styles.actions}>
        <FormButton
          label="Open camera"
          loading={submit.isPending}
          onPress={() => {
            setErrorMessage(null);
            router.push({
              pathname: '/challenge/[challengeId]/camera',
              params: { challengeId, intent: 'proof' },
            });
          }}
          testID="evidence-request-camera"
        />
        <FormButton
          label="Skip and take the penalty"
          loading={skip.isPending}
          onPress={() => skip.mutate()}
          testID="evidence-request-skip"
          variant="secondary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  timer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  timerValue: {
    color: colors.accent,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  timerLabel: {
    color: colors.accent,
    fontSize: fontSize.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  hint: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    width: '100%',
  },
  warningText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
  missing: {
    color: colors.muted,
    textAlign: 'center',
  },
});
