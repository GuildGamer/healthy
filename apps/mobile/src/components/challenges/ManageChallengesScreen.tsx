import type {
  CatalogChallenge,
  ChallengeFrequency,
  HealthCategory,
} from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { apiClient } from '@/lib/api';
import { ChallengeIcon } from './ChallengeIcon';
import { frequencyLabel } from './constants/frequency-labels';

const categoryTitle: Record<HealthCategory, string> = {
  hypertension: 'Blood pressure',
  diabetes: 'Diabetes',
  asthma: 'Asthma',
  general: 'General health',
};

type CategoryGroup = {
  category: HealthCategory;
  challenges: CatalogChallenge[];
};

function groupByCategory(challenges: CatalogChallenge[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];

  for (const challenge of challenges) {
    const current = groups.at(-1);

    if (current?.category === challenge.category) {
      current.challenges.push(challenge);
      continue;
    }

    groups.push({ category: challenge.category, challenges: [challenge] });
  }

  return groups;
}

export function ManageChallengesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  });

  const setEnrollment = useMutation({
    mutationFn: (input: {
      challengeId: string;
      isEnrolled: boolean;
      frequency?: ChallengeFrequency;
    }) => apiClient.setChallengeEnrollment(input),
    onSuccess: (catalog) => {
      queryClient.setQueryData(['challenges', 'catalog'], catalog);
      queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] });
    },
  });

  if (catalogQuery.isLoading) {
    return (
      <View style={styles.centred} testID="manage-challenges-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const challenges = catalogQuery.data?.challenges ?? [];
  const groups = groupByCategory(challenges);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
      testID="manage-challenges-screen"
    >
      <Text style={styles.intro}>
        Turn on the challenges you want. Open one from Home or Challenges to
        set how often it repeats and when to be reminded.
      </Text>

      {groups.map((group) => (
        <View key={group.category} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {categoryTitle[group.category]}
          </Text>

          <View style={styles.card}>
            {group.challenges.map((challenge, index) => (
              <ChallengeOption
                challenge={challenge}
                isBusy={
                  setEnrollment.isPending &&
                  setEnrollment.variables?.challengeId === challenge.challengeId
                }
                key={challenge.challengeId}
                onOpen={() =>
                  router.push(`/challenge/${challenge.challengeId}`)
                }
                onSetEnrolled={(isEnrolled) =>
                  setEnrollment.mutate({
                    challengeId: challenge.challengeId,
                    isEnrolled,
                    frequency: challenge.frequency,
                  })
                }
                showDivider={index < group.challenges.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ChallengeOption({
  challenge,
  isBusy,
  onOpen,
  onSetEnrolled,
  showDivider,
}: {
  challenge: CatalogChallenge;
  isBusy: boolean;
  onOpen: () => void;
  onSetEnrolled: (isEnrolled: boolean) => void;
  showDivider: boolean;
}) {
  return (
    <View
      style={[styles.option, showDivider ? styles.optionDivided : null]}
      testID={`catalog-challenge-${challenge.challengeId}`}
    >
      <ChallengeIcon category={challenge.category} name={challenge.icon} />
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={styles.optionText}
      >
        <Text style={styles.optionTitle}>{challenge.title}</Text>
        <Text style={styles.optionDescription}>{challenge.description}</Text>
        <Text style={styles.optionMeta}>
          +{challenge.rewardPoints} · {frequencyLabel[challenge.frequency]}
        </Text>
      </Pressable>

      {isBusy ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <Switch
          accessibilityLabel={challenge.title}
          onValueChange={onSetEnrolled}
          testID={`toggle-challenge-${challenge.challengeId}`}
          thumbColor={colors.surface}
          trackColor={{ false: colors.disabledSurface, true: colors.accent }}
          value={challenge.isEnrolled}
        />
      )}
    </View>
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
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  optionDivided: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  optionDescription: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  optionMeta: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
});
