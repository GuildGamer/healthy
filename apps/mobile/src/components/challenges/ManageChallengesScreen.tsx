import type {
  CatalogChallenge,
  ChallengeFrequency,
  HealthCategory,
} from '@product/client';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@product/brand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Loader, RefreshableScroll, ScreenLoader } from '@/components/feedback';
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
    return <ScreenLoader testID="manage-challenges-loading" />;
  }

  const challenges = catalogQuery.data?.challenges ?? [];
  const groups = groupByCategory(challenges);

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => catalogQuery.refetch()}
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
      ))}
    </RefreshableScroll>
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
    <View testID={`catalog-challenge-${challenge.challengeId}`}>
      <View style={styles.option}>
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
          <Loader size="small" />
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
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
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
