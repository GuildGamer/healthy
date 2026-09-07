import Feather from '@expo/vector-icons/Feather';
import type { MatchListItem } from '@product/client';
import { colors, fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshableScroll, ScreenLoader } from '@/components/feedback';
import { FormButton } from '@/components/forms';
import { displayFontFamily } from '@/lib/fonts';
import { apiClient } from '@/lib/api';
import { formatMatchTimeLeft } from './format-match-time';
import {
  MATCH_CARD_RADIUS,
  MatchKicker,
  MatchMetricMark,
} from './match-chrome';
import {
  MATCH_CANCELLED,
  MATCH_CREATE_TITLE,
  MATCH_EMPTY,
  MATCH_ENDED_LABEL,
  MATCH_KICKER,
  MATCH_LIVE,
  MATCH_SCORING_LABEL,
  MATCH_TITLE,
} from './match-copy';

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
              onPress={() => router.push('/matches/create')}
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
      {empty ? (
        <View style={styles.empty} testID="matches-empty">
          <MatchMetricMark />
          <MatchKicker>{MATCH_KICKER}</MatchKicker>
          <Text style={styles.emptyTitle}>{MATCH_CREATE_TITLE}</Text>
          <Text style={styles.emptyCopy}>{MATCH_EMPTY}</Text>
          <FormButton
            label={MATCH_CREATE_TITLE}
            onPress={() => router.push('/matches/create')}
            testID="matches-empty-create"
          />
        </View>
      ) : null}

      {live.length > 0 ? (
        <View style={styles.section} testID="matches-live">
          <Text style={styles.sectionLabel}>{MATCH_LIVE}</Text>
          {live.map((item) => (
            <MatchRow item={item} key={item.id} />
          ))}
        </View>
      ) : null}

      {ended.length > 0 ? (
        <View style={styles.section} testID="matches-ended">
          <Text style={styles.sectionLabel}>{MATCH_ENDED_LABEL}</Text>
          {ended.map((item) => (
            <MatchRow item={item} key={item.id} />
          ))}
        </View>
      ) : null}
    </RefreshableScroll>
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
      onPress={() => router.push(`/matches/${item.id}`)}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      testID={`open-match-${item.id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.statusRow}>
          <View style={[styles.pip, isLive ? styles.pipLive : styles.pipEnded]} />
          <Text style={[styles.status, isLive ? styles.statusLive : null]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.time}>{formatMatchTimeLeft(item.endsAt)}</Text>
      </View>

      <View style={styles.cardBody}>
        <MatchMetricMark size="sm" />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {MATCH_TITLE}
            {' · '}
            {MATCH_SCORING_LABEL}
            {rankLabel ? ` · ${rankLabel}` : ''}
          </Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.count}>{item.yourBestCount}</Text>
          <Text style={styles.countHint}>best</Text>
        </View>
        <Feather color={colors.muted} name="chevron-right" size={18} />
      </View>
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
    flexGrow: 1,
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
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: MATCH_CARD_RADIUS,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pipLive: {
    backgroundColor: colors.accent,
  },
  pipEnded: {
    backgroundColor: colors.disabledText,
  },
  status: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusLive: {
    color: colors.accent,
  },
  time: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
  score: {
    alignItems: 'flex-end',
  },
  count: {
    color: colors.text,
    fontFamily: displayFontFamily,
    fontSize: fontSize.xl,
    lineHeight: 28,
  },
  countHint: {
    color: colors.muted,
    fontSize: fontSize.xs,
  },
});
