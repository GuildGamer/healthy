import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
} from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon';
import { Loader, RefreshableScroll } from '@/components/feedback';
import {
  healthCategoryMark,
  healthCategoryName,
} from '@/constants/health-categories';
import { apiClient } from '@/lib/api';
import { tipQuoteFontFamily } from '@/lib/fonts';
import type { HealthTip } from './constants/health-tips';
import {
  groupTipsByCategory,
  selectDailyTip,
  tipsForCategories,
} from './select-daily-tip';
import { TipSectionSwitch } from './TipSectionSwitch';
import {
  groupsForScope,
  resolveTipScope,
  type TipSectionScope,
} from './tip-section-scope';

function FeaturedTip({ tip }: { tip: HealthTip }) {
  return (
    <View style={styles.featured} testID={`tip-${tip.id}`}>
      <Text style={styles.eyebrow}>
        Today · {healthCategoryName(tip.category)}
      </Text>
      <Text style={styles.quote}>{tip.title}</Text>
      <Text style={styles.featuredBody}>{tip.body}</Text>
    </View>
  );
}

function TipRow({
  isLast,
  tip,
}: {
  isLast: boolean;
  tip: HealthTip;
}) {
  return (
    <View>
      <View style={styles.row} testID={`tip-${tip.id}`}>
        <ChallengeIcon
          category={tip.category}
          name={healthCategoryMark(tip.category)}
        />
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{tip.title}</Text>
          <Text style={styles.rowBody}>{tip.body}</Text>
        </View>
      </View>
      {isLast ? null : <View style={styles.divider} />}
    </View>
  );
}

export function TipsScreen() {
  const [scope, setScope] = useState<TipSectionScope>('all');
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
  });
  const challengesQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });

  const categories = meQuery.data?.categories ?? [];
  const dayKey = challengesQuery.data?.dayKey ?? '';
  const tips = tipsForCategories(categories);
  const todayTip = selectDailyTip(categories, dayKey);
  const moreTips = tips.filter((tip) => tip.id !== todayTip?.id);
  const groups = groupTipsByCategory(moreTips);
  const activeScope = resolveTipScope(scope, groups);
  const visibleGroups = groupsForScope(groups, activeScope);
  const showFeatured =
    todayTip != null &&
    (activeScope === 'all' || activeScope === todayTip.category);
  const isLoading = meQuery.isPending || challengesQuery.isPending;

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() =>
        Promise.all([meQuery.refetch(), challengesQuery.refetch()])
      }
      style={styles.container}
      testID="tips-screen"
    >
      <Text style={styles.intro}>
        Small, practical changes for the conditions you are tracking.
      </Text>

      {isLoading && tips.length === 0 ? (
        <View style={styles.loader}>
          <Loader />
        </View>
      ) : null}

      <View style={styles.stage}>
        {showFeatured && todayTip ? <FeaturedTip tip={todayTip} /> : null}

        <TipSectionSwitch
          groups={groups}
          onSelect={setScope}
          scope={activeScope}
        />
      </View>

      {visibleGroups.map((group) => (
        <View key={group.category} style={styles.section}>
          {activeScope === 'all' ? (
            <Text style={styles.sectionTitle}>
              {healthCategoryName(group.category)}
            </Text>
          ) : null}
          {group.tips.map((tip, index) => (
            <TipRow
              isLast={index === group.tips.length - 1}
              key={tip.id}
              tip={tip}
            />
          ))}
        </View>
      ))}
    </RefreshableScroll>
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
  stage: {
    gap: 10,
  },
  featured: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
  quote: {
    color: colors.text,
    fontFamily: tipQuoteFontFamily,
    fontSize: fontSize.lg,
    lineHeight: 28,
  },
  featuredBody: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: tipQuoteFontFamily,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  rowBody: {
    color: colors.muted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  loader: {
    marginTop: spacing.xl,
  },
});
