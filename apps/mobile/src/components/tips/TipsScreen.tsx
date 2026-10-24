import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import {
  DECK_PAGE_CARD_RADIUS,
  DeckNoteCard,
  DeckPushedPage,
  DeckSectionTitle,
} from '@/components/deck';
import { Loader } from '@/components/feedback';
import { healthCategoryName } from '@/constants/health-categories';
import { apiClient } from '@/lib/api';
import { tipQuoteFontFamily } from '@/lib/fonts';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import type { HealthTip } from './constants/health-tips';
import { TIPS_COPY } from './constants/tip-history';
import { selectDailyTip } from './select-daily-tip';
import { earlierTips, type PastTip, tipDayLabel } from './tip-history';

function useTipsPage() {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });
  const daysQuery = useQuery({
    queryKey: ['progress', 'days'],
    queryFn: () => apiClient.listProgressDays(),
  });
  const tipsQuery = useQuery({ queryKey: ['tips'], queryFn: () => apiClient.listTips() });
  const catalog = tipsQuery.data?.tips ?? [];
  const categories = meQuery.data?.categories ?? [];
  const days = daysQuery.data;

  return {
    isPending: meQuery.isPending || daysQuery.isPending || tipsQuery.isPending,
    isError: !tipsQuery.data || !days,
    todayKey: days?.dayKey ?? '',
    todayTip: days ? selectDailyTip(catalog, categories, days.dayKey) : null,
    pastTips: days
      ? earlierTips({ catalog, categories, todayKey: days.dayKey, joinedDayKey: days.joinedDayKey })
      : [],
    refetch: () => Promise.all([meQuery.refetch(), daysQuery.refetch(), tipsQuery.refetch()]),
  };
}

/** Today's tip, then the ones you've already been given, newest first. */
export function TipsScreen() {
  const page = useTipsPage();

  return (
    <DeckPushedPage
      onBack={() => goBackOrHome('/(tabs)/profile')}
      onPullRefresh={page.refetch}
      testID="tips-screen"
      title={TIPS_COPY.title}
    >
      <TipsBody page={page} />
    </DeckPushedPage>
  );
}

function TipsBody({ page }: { page: ReturnType<typeof useTipsPage> }) {
  const styles = useThemedStyles(createStyles);

  if (page.isPending) {
    return (
      <View style={styles.loader}>
        <Loader />
      </View>
    );
  }

  if (page.isError) {
    return (
      <DeckNoteCard
        action={{
          label: TIPS_COPY.tryAgain,
          onPress: () => void page.refetch(),
          testID: 'tips-retry',
        }}
        body={TIPS_COPY.failedBody}
        glyph="offline"
        testID="tips-error"
        title={TIPS_COPY.failedTitle}
      />
    );
  }

  if (!page.todayTip) {
    return (
      <DeckNoteCard
        body={TIPS_COPY.emptyBody}
        glyph="leaf"
        isOutlined
        testID="tips-empty"
        title={TIPS_COPY.emptyTitle}
      />
    );
  }

  return (
    <View>
      <TodayTipCard tip={page.todayTip} />
      {page.pastTips.length === 0 ? (
        <Text style={styles.firstTip}>{TIPS_COPY.firstTip}</Text>
      ) : (
        <EarlierTips pastTips={page.pastTips} todayKey={page.todayKey} />
      )}
    </View>
  );
}

function TodayTipCard({ tip }: { tip: HealthTip }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card} testID={`tip-${tip.id}`}>
      <Text style={styles.eyebrow}>
        {TIPS_COPY.today} · {healthCategoryName(tip.category)}
      </Text>
      <Text style={styles.quote}>{tip.title}</Text>
      <Text style={styles.body}>{tip.body}</Text>
      {tip.source ? <Text style={styles.source}>{tip.source}</Text> : null}
    </View>
  );
}

function EarlierTips({ pastTips, todayKey }: { pastTips: readonly PastTip[]; todayKey: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View>
      <DeckSectionTitle label={TIPS_COPY.earlier} />
      {pastTips.map(({ tip, dayKey }, index) => (
        <View
          key={tip.id}
          style={[styles.row, index === 0 ? null : styles.divider]}
          testID={`tip-${tip.id}`}
        >
          <Text style={styles.rowQuote}>{tip.title}</Text>
          <Text style={styles.when}>
            {tipDayLabel(dayKey, todayKey)} · {healthCategoryName(tip.category)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loader: {
      marginTop: spacing.xl,
    },
    card: {
      marginTop: spacing.md,
      padding: 22,
      borderRadius: DECK_PAGE_CARD_RADIUS,
      backgroundColor: theme.colors.surface,
    },
    eyebrow: {
      color: theme.colors.accent,
      fontSize: 13,
      fontWeight: fontWeight.medium,
    },
    quote: {
      color: theme.colors.text,
      fontFamily: tipQuoteFontFamily,
      fontSize: 27,
      lineHeight: 33,
      marginTop: 12,
    },
    body: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 10,
    },
    source: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      marginTop: 8,
    },
    firstTip: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 18,
    },
    row: {
      paddingVertical: 14,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    rowQuote: {
      color: theme.colors.text,
      fontFamily: tipQuoteFontFamily,
      fontSize: 19,
      lineHeight: 25,
    },
    when: {
      color: theme.colors.muted,
      fontSize: 12.5,
      marginTop: 5,
    },
  });
