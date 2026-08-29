import type { ChallengeEvidence } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';
import {
  captureSelfie,
  type CapturedSelfie,
} from '@/lib/capture-selfie';

const SUBMIT_FAILED_MESSAGE =
  'We could not check that photo. Take another and try again.';

export function LogEvidenceScreen({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<CapturedSelfie | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  const submit = useMutation({
    mutationFn: async (evidence: ChallengeEvidence) => {
      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      return apiClient.completeChallenge({
        userChallengeId: occurrence.id,
        evidence,
      });
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
      router.replace({
        pathname: '/challenge/success',
        params: {
          title: occurrence?.title ?? 'Challenge',
          points: String(result.pointsAwarded),
          streak: String(result.currentStreakDays),
        },
      });
    },
    onError: (error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : SUBMIT_FAILED_MESSAGE,
      );
    },
  });

  async function takeSelfie() {
    setErrorMessage(null);
    const captured = await captureSelfie();

    if (captured.status === 'canceled') {
      return;
    }

    if (captured.status === 'failed') {
      setErrorMessage(captured.message);
      return;
    }

    setPhoto(captured.photo);
  }

  if (todayQuery.isPending) {
    return <ScreenLoader testID="log-evidence-loading" />;
  }

  if (!occurrence) {
    return (
      <View style={styles.centred} testID="log-evidence-missing">
        <Text style={styles.missing}>
          This challenge is not on today&apos;s list.
        </Text>
      </View>
    );
  }

  if (occurrence.status === 'completed') {
    return (
      <View style={styles.centred} testID="log-evidence-done">
        <Text style={styles.title}>{occurrence.title}</Text>
        <Text style={styles.missing}>This session is already logged.</Text>
        <FormButton label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
      testID="log-evidence-screen"
    >
      <Text style={styles.title}>Gym photo</Text>
      <Text style={styles.subtitle}>{occurrence.title}</Text>
      <Text style={styles.hint}>
        {occurrence.instruction ||
          'Take a selfie at the gym or clearly mid-workout.'}
      </Text>

      {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

      {photo ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: photo.previewUri }}
          style={styles.preview}
          testID="evidence-preview"
        />
      ) : (
        <View style={styles.placeholder} testID="evidence-placeholder">
          <Text style={styles.placeholderLabel}>No photo yet</Text>
        </View>
      )}

      <FormButton
        label="Take selfie"
        onPress={() => {
          void takeSelfie();
        }}
        testID="evidence-take-photo"
      />

      <FormButton
        disabled={!photo}
        label="Submit photo"
        loading={submit.isPending}
        onPress={() => {
          if (!photo) {
            return;
          }

          submit.mutate({
            mimeType: photo.mimeType,
            imageBase64: photo.imageBase64,
          });
        }}
        testID="evidence-submit"
      />
    </ScrollView>
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
  hint: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  missing: {
    color: colors.muted,
    textAlign: 'center',
  },
});
