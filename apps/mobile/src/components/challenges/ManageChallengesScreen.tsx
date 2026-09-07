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
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Loader, RefreshableScroll, ScreenLoader } from '@/components/feedback';
import { healthCategoryName } from '@/constants/health-categories';
import { apiClient } from '@/lib/api';
import { CatalogCategoryPicker } from './CatalogCategoryPicker';
import { ChallengeIcon } from './ChallengeIcon';
import { frequencyLabel } from './constants/frequency-labels';
import {
  type CatalogBrowseTab,
  type CatalogCategoryFilter,
  catalogEnrollmentCounts,
  categoriesPresentInScope,
  countChallengesInCategory,
  defaultCatalogBrowseTab,
  defaultCatalogCategoryFilter,
  filterCatalogChallenges,
  groupCatalogByCategory,
  resolveCatalogCategoryFilter,
} from './manage-catalog-layout';

const BROWSE_TABS: readonly { id: CatalogBrowseTab; label: string }[] = [
  { id: 'off', label: 'Add' },
  { id: 'on', label: 'Your list' },
];

export function ManageChallengesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CatalogBrowseTab | null>(null);
  const [category, setCategory] = useState<CatalogCategoryFilter | null>(null);

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
  const hasMembership = catalogQuery.data?.hasMembership ?? false;
  const counts = catalogEnrollmentCounts(challenges);

  if (tab === null) {
    setTab(defaultCatalogBrowseTab());
  }

  const activeTab = tab ?? defaultCatalogBrowseTab();
  const categoriesInTab = categoriesPresentInScope(challenges, activeTab);

  if (category === null && categoriesInTab.length > 0) {
    setCategory(defaultCatalogCategoryFilter(categoriesInTab));
  }

  const activeCategory = resolveCatalogCategoryFilter(
    category ?? defaultCatalogCategoryFilter(categoriesInTab),
    categoriesInTab,
  );
  const visible = filterCatalogChallenges(
    challenges,
    activeTab,
    activeCategory,
  );
  const groups = groupCatalogByCategory(visible);
  const isYourList = activeTab === 'on';
  const scopedTotal = filterCatalogChallenges(
    challenges,
    activeTab,
    'all',
  ).length;
  const countsByCategory = new Map(
    categoriesInTab.map((item) => [
      item,
      countChallengesInCategory(challenges, activeTab, item),
    ]),
  );

  function selectBrowseTab(next: CatalogBrowseTab) {
    setTab(next);
    const nextCategories = categoriesPresentInScope(challenges, next);
    setCategory(defaultCatalogCategoryFilter(nextCategories));
  }

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => catalogQuery.refetch()}
      style={styles.container}
      testID="manage-challenges-screen"
    >
      <View style={styles.tabs} testID="catalog-browse-tabs">
        {BROWSE_TABS.map((option) => {
          const selected = option.id === activeTab;
          const count = option.id === 'on' ? counts.on : counts.off;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => selectBrowseTab(option.id)}
              style={styles.tab}
              testID={`catalog-tab-${option.id}`}
            >
              <Text
                style={[
                  styles.tabLabel,
                  selected ? styles.tabLabelSelected : null,
                ]}
              >
                {option.label}
                <Text style={styles.tabCount}> · {count}</Text>
              </Text>
              <View
                style={[
                  styles.tabRule,
                  selected ? styles.tabRuleSelected : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.intro} testID="catalog-tab-intro">
        {isYourList
          ? 'On Home and Challenges. Tap a name for reminders.'
          : 'Flip the switch to add it to your list.'}
      </Text>

      <CatalogCategoryPicker
        categories={categoriesInTab}
        countsByCategory={countsByCategory}
        onSelect={setCategory}
        selected={activeCategory}
        totalInScope={scopedTotal}
      />

      {groups.length === 0 ? (
        <View style={styles.emptyBlock} testID="catalog-empty">
          <Text style={styles.empty}>
            {isYourList
              ? activeCategory === 'all'
                ? 'Your list is empty.'
                : `Nothing in ${healthCategoryName(activeCategory)} yet.`
              : activeCategory === 'all'
                ? 'Everything is already on your list.'
                : `Nothing left to add in ${healthCategoryName(activeCategory)}.`}
          </Text>
          {isYourList ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => selectBrowseTab('off')}
              style={styles.emptyAction}
              testID="catalog-go-add"
            >
              <Text style={styles.emptyActionLabel}>Find challenges to add</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => selectBrowseTab('on')}
              style={styles.emptyAction}
              testID="catalog-go-list"
            >
              <Text style={styles.emptyActionLabel}>Back to your list</Text>
            </Pressable>
          )}
        </View>
      ) : (
        groups.map((group) => (
          <CategorySection
            category={group.category}
            hideTitle={activeCategory !== 'all'}
            key={group.category}
          >
            {group.challenges.map((item, index) => (
              <ChallengeOption
                challenge={item}
                hasMembership={hasMembership}
                isBusy={
                  setEnrollment.isPending &&
                  setEnrollment.variables?.challengeId === item.challengeId
                }
                key={item.challengeId}
                onOpen={() => router.push(`/challenge/${item.challengeId}`)}
                onSetEnrolled={(isEnrolled) =>
                  setEnrollment.mutate({
                    challengeId: item.challengeId,
                    isEnrolled,
                    frequency: item.frequency,
                  })
                }
                onUnlock={() =>
                  router.push({
                    pathname: '/membership',
                    params: { source: 'other' },
                  })
                }
                showDivider={index < group.challenges.length - 1}
              />
            ))}
          </CategorySection>
        ))
      )}
    </RefreshableScroll>
  );
}

function CategorySection({
  category,
  children,
  hideTitle,
}: {
  category: HealthCategory;
  children: ReactNode;
  hideTitle: boolean;
}) {
  return (
    <View style={styles.section} testID={`catalog-section-${category}`}>
      {hideTitle ? null : (
        <Text style={styles.sectionTitle}>{healthCategoryName(category)}</Text>
      )}
      {children}
    </View>
  );
}

function ChallengeOption({
  challenge,
  hasMembership,
  isBusy,
  onOpen,
  onSetEnrolled,
  onUnlock,
  showDivider,
}: {
  challenge: CatalogChallenge;
  hasMembership: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onSetEnrolled: (isEnrolled: boolean) => void;
  onUnlock: () => void;
  showDivider: boolean;
}) {
  const lockedOff =
    challenge.isLocked && !challenge.isEnrolled && !hasMembership;

  return (
    <View testID={`catalog-challenge-${challenge.challengeId}`}>
      <View style={styles.option}>
        <ChallengeIcon category={challenge.category} name={challenge.icon} />
        <Pressable
          accessibilityHint={
            lockedOff
              ? 'Membership required to add this challenge'
              : 'Opens schedule and reminders'
          }
          accessibilityLabel={challenge.title}
          accessibilityRole="button"
          onPress={lockedOff ? onUnlock : onOpen}
          style={styles.optionText}
        >
          <Text numberOfLines={1} style={styles.optionTitle}>
            {challenge.title}
          </Text>
          <Text style={styles.optionMeta}>
            {lockedOff
              ? 'Membership'
              : `+${challenge.rewardPoints} · ${frequencyLabel[challenge.frequency]}`}
          </Text>
        </Pressable>

        {isBusy ? (
          <Loader size="small" />
        ) : lockedOff ? (
          <Pressable
            accessibilityLabel={`Unlock ${challenge.title}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onUnlock}
            style={styles.lockHit}
            testID={`unlock-challenge-${challenge.challengeId}`}
          >
            <Text style={styles.lockMark}>✦</Text>
          </Pressable>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingTop: spacing.sm,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    paddingBottom: spacing.sm,
  },
  tabLabelSelected: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  tabCount: {
    color: colors.muted,
    fontWeight: fontWeight.regular,
  },
  tabRule: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  tabRuleSelected: {
    backgroundColor: colors.accent,
  },
  intro: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  emptyBlock: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  emptyAction: {
    alignSelf: 'flex-start',
  },
  emptyActionLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
  lockHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockMark: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  optionTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  optionMeta: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
