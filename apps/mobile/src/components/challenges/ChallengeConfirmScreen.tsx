import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenLoader } from '@/components/feedback';
import { FormButton, FormErrorBanner } from '@/components/forms';
import { apiClient } from '@/lib/api';

const SUBMIT_FAILED_MESSAGE = 'We could not mark that as done. Try again.';

export function ChallengeConfirmScreen({
  challengeId,
}: {
  challengeId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const occurrence = todayQuery.data?.challenges.find(
    (item) => item.challengeId === challengeId,
  );

  const start = useMutation({
    mutationFn: async () => {
      if (!occurrence || occurrence.status !== 'pending') {
        return;
      }

      await apiClient.startChallenge({ userChallengeId: occurrence.id });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] });
    },
  });

  const complete = useMutation({
    mutationFn: async () => {
      if (!occurrence) {
        throw new Error(SUBMIT_FAILED_MESSAGE);
      }

      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      return apiClient.completeChallenge({ userChallengeId: occurrence.id });
    },
    onSuccess: async (result) => {
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
        },
      });
    },
  });

  const didStart = useRef(false);

  useEffect(() => {
    if (!occurrence || occurrence.status !== 'pending' || didStart.current) {
      return;
    }

    didStart.current = true;
    start.mutate();
  }, [occurrence, start]);

  if (todayQuery.isLoading || !occurrence) {
    return <ScreenLoader />;
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{occurrence.title}</Text>
      <Text style={styles.instruction}>{occurrence.instruction}</Text>
      {complete.isError ? (
        <FormErrorBanner message={SUBMIT_FAILED_MESSAGE} />
      ) : null}
      <FormButton
        label="I did this"
        loading={complete.isPending}
        onPress={() => complete.mutate()}
        testID="confirm-challenge"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  instruction: {
    color: colors.muted,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
});
