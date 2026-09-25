import Feather from '@expo/vector-icons/Feather';
import type { MatchListItem } from '@product/client';
import { matchScoreUnit } from '@product/contract/match-board';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { Fragment, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshableScroll, ScreenLoader } from '@/components/feedback';
import { FormButton } from '@/components/forms';
import { apiClient } from '@/lib/api';
import { formatMatchTimeLeft } from './format-match-time';
import {
  MatchActivityMark,
  MatchGroupMark,
  MatchKicker,
} from './match-chrome';
import {
  MATCH_CANCELLED,
  MATCH_CREATE_TITLE,
  MATCH_EMPTY_BODY,
  MATCH_EMPTY_STEPS,
  MATCH_EMPTY_TITLE,
  MATCH_ENDED_LABEL,
  MATCH_KICKER,
  MATCH_LIVE,
  MATCH_MODE_LABEL,
} from './match-copy';
import { matchActivity } from './match-metric';

export function MatchesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const listQuery = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => apiClient.listMyMatches(),
  });

  const live = listQuery.data?.live ?? [];
  const ended = listQuery.data?.ended ?? [];
  const empty = live.length === 0 && ended.length === 0;
  const showCreate = !listQuery.isPending && !empty;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: showCreate
        ? () => (
            <Pressable
              accessibilityLabel={MATCH_CREATE_TITLE}
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.navigate('/matches/create')}
              style={styles.headerCreate}
              testID="matches-create"
            >
              <Feather color={colors.accent} name="plus" size={22} />
            </Pressable>
          )
        : () => null,
    });
  }, [navigation, router, showCreate]);

  if (listQuery.isPending) {
    return <ScreenLoader testID="matches-list-loading" />;
  }

  return (
    <RefreshableScroll
      contentContainerStyle={styles.content}
      onPullRefresh={() => listQuery.refetch()}
      style={styles.screen}
      testID="matches-list-screen"
    >
      {empty ? <MatchesEmpty /> : null}

      {live.length > 0 ? (
        <View style={styles.section} testID="matches-live">
          <Text style={styles.sectionLabel}>{MATCH_LIVE}</Text>
          <MatchRows items={live} />
        </View>
      ) : null}

      {ended.length > 0 ? (
        <View style={styles.section} testID="matches-ended">
          <Text style={styles.sectionLabel}>{MATCH_ENDED_LABEL}</Text>
          <MatchRows items={ended} />
        </View>
      ) : null}
    </RefreshableScroll>
  );
}

function MatchesEmpty() {
  const router = useRouter();

  return (
    <View style={styles.empty} testID="matches-empty">
      <View style={styles.emptyIntro}>
        <MatchGroupMark />
        <MatchKicker>{MATCH_KICKER}</MatchKicker>
        <Text style={styles.emptyTitle}>{MATCH_EMPTY_TITLE}</Text>
        <Text style={styles.emptyCopy}>{MATCH_EMPTY_BODY}</Text>
      </View>

      <View style={styles.steps}>
        {MATCH_EMPTY_STEPS.map((step, index) => (
          <Fragment key={step.title}>
            {index === 0 ? null : <View style={styles.stepDivider} />}
            <View style={styles.step}>
              <Text style={styles.stepIndex}>{index + 1}</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepHint}>{step.hint}</Text>
              </View>
            </View>
          </Fragment>
        ))}
      </View>

      <FormButton
        label={MATCH_CREATE_TITLE}
        onPress={() => router.navigate('/matches/create')}
        testID="matches-empty-create"
      />
    </View>
  );
}

function MatchRows({ items }: { items: MatchListItem[] }) {
  return (
    <View style={styles.rows}>
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <MatchRow item={item} />
          {index === items.length - 1 ? null : <View style={styles.divider} />}
        </Fragment>
      ))}
    </View>
  );
}

function MatchRow({ item }: { item: MatchListItem }) {
  const router = useRouter();
  const isLive = item.status === 'open';
  const statusLabel =
    item.status === 'cancelled'
      ? MATCH_CANCELLED
      : isLive
        ? MATCH_LIVE
        : MATCH_ENDED_LABEL;
  const rankLabel = item.yourRank ? `#${item.yourRank}` : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.navigate(`/matches/${item.id}`)}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      testID={`open-match-${item.id}`}
    >
      <MatchActivityMark
        activity={matchActivity(item.scoringMode, item.metric, item.dailyScope)}
        size="sm"
      />
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.rowMeta}>
          <Text style={isLive ? styles.metaLive : null}>{statusLabel}</Text>
          {' · '}
          {MATCH_MODE_LABEL[item.scoringMode]}
          {' · '}
          {formatMatchTimeLeft(item.endsAt)}
          {rankLabel ? ` · ${rankLabel}` : ''}
        </Text>
      </View>
      <View style={styles.score}>
        <Text style={styles.count}>{item.yourScore}</Text>
        <Text style={styles.countHint}>
          {matchScoreUnit(item.scoringMode)}
        </Text>
      </View>
      <Feather color={colors.muted} name="chevron-right" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerCreate: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  empty: {
    gap: spacing.lg,
  },
  emptyIntro: {
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  steps: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  stepDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.accentContainer,
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: 26,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stepTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  stepHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  rows: {
    marginHorizontal: -spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  metaLive: {
    color: colors.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  score: {
    alignItems: 'flex-end',
  },
  count: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  countHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
});
