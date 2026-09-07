import Feather from '@expo/vector-icons/Feather';
import type { ChallengeEvidence } from '@product/client';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { consumeCaptureResult } from '@/lib/capture-session';
import type { CapturedSelfie } from '@/lib/capture-selfie';
import { displayFontFamily } from '@/lib/fonts';
import { setPendingShareCard } from '@/lib/share-card-session';
import { EvidencePhotoFrame } from './EvidencePhotoFrame';

const SUBMIT_FAILED_MESSAGE =
  'We could not check that photo. Take another and try again.';

const DEFAULT_HINT =
  'Take a selfie at the gym. Your face and the gym (machines, racks, or the gym floor) must be visible. Photos from home will not count.';

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

  useFocusEffect(
    useCallback(() => {
      const captured = consumeCaptureResult(challengeId);
      if (!captured) {
        return;
      }

      setPhoto(captured);
      setErrorMessage(null);
    }, [challengeId]),
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
        queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);

      if (photo?.previewUri) {
        setPendingShareCard({
          photoUri: photo.previewUri,
          title: occurrence?.title ?? 'Challenge',
          pointsAwarded: result.pointsAwarded,
          currentStreakDays: result.currentStreakDays,
          ...(photo.width && photo.height
            ? { photoWidth: photo.width, photoHeight: photo.height }
            : {}),
        });
      }

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

  function openCamera() {
    setErrorMessage(null);
    router.push({
      pathname: '/challenge/[challengeId]/camera',
      params: { challengeId, intent: 'selfie' },
    });
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
      <View style={styles.ticket}>
        <View style={styles.ticketRule} />
        <Text style={styles.kicker}>Gym check-in</Text>
        <Text style={styles.title}>{occurrence.title}</Text>
        <Text style={styles.hint}>
          {occurrence.instruction || DEFAULT_HINT}
        </Text>

        {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}

        {photo ? (
          <EvidencePhotoFrame
            height={photo.height}
            testID="evidence-preview"
            uri={photo.previewUri}
            width={photo.width}
          />
        ) : (
          <View style={styles.placeholder} testID="evidence-placeholder">
            <View style={styles.placeholderIcon}>
              <Feather color={colors.accent} name="camera" size={28} />
            </View>
            <Text style={styles.placeholderTitle}>No check-in yet</Text>
            <Text style={styles.placeholderLabel}>
              Face the camera with the gym behind you
            </Text>
          </View>
        )}

        <View style={styles.stamp}>
          <Feather color={colors.accent} name="map-pin" size={16} />
          <Text style={styles.stampLabel}>
            Must be taken at a gym. Home photos will not count.
          </Text>
        </View>
      </View>

      <FormButton
        label={photo ? 'Retake selfie' : 'Take selfie'}
        onPress={openCamera}
        testID="evidence-take-photo"
        variant={photo ? 'secondary' : 'primary'}
      />

      <FormButton
        disabled={!photo}
        label="Submit check-in"
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
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.lg,
    gap: spacing.md,
  },
  ticketRule: {
    height: 3,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    backgroundColor: colors.accent,
  },
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    lineHeight: 30,
  },
  hint: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  placeholder: {
    width: '100%',
    minHeight: 220,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  placeholderLabel: {
    color: colors.muted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSurface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stampLabel: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 18,
  },
  missing: {
    color: colors.muted,
    textAlign: 'center',
  },
});
