import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckCardFrame, DeckEyebrow } from '@/components/deck';
import type { HealthTip } from '@/components/tips';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';
import { ordinal, positionLabel, weeklyRankLabel } from './today-labels';

interface DayDoneCardProps {
  weekday: string;
  completedCount: number;
  totalCount: number;
  pointsToday: number;
  weeklyRank: number | null;
  /** This week's rank before today's points, to say how far today moved it. */
  weeklyRankAtDayStart: number | null;
  streakLine: string | null;
  tomorrowTip: HealthTip | null;
  isSharing: boolean;
  onShare: () => void;
}

/** The deck folded into one card: what the day earned, and one thing for tomorrow. */
export function DayDoneCard({
  weekday,
  completedCount,
  totalCount,
  pointsToday,
  weeklyRank,
  weeklyRankAtDayStart,
  streakLine,
  tomorrowTip,
  isSharing,
  onShare,
}: DayDoneCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <DeckCardFrame
      fill={colors.surface}
      footer={
        <View style={styles.action}>
          <DeckButton
            glyph="share"
            label={TODAY_COPY.shareDay}
            loading={isSharing}
            onPress={onShare}
            testID="home-share-day"
          />
        </View>
      }
      testID="home-day-done"
    >
      <View style={styles.head}>
        <DeckEyebrow corner={positionLabel(completedCount, totalCount)} label={weekday} />
        <Text numberOfLines={2} style={styles.title}>
          {TODAY_COPY.dayDoneTitle}
        </Text>
        {streakLine ? <Text style={styles.sub}>{streakLine}</Text> : null}
      </View>
      <View style={styles.earned}>
        <EarnedTile label={TODAY_COPY.pointsTodayLabel} value={`+${pointsToday}`} />
        {weeklyRank !== null ? (
          <EarnedTile
            label={weeklyRankLabel(weeklyRank, weeklyRankAtDayStart)}
            value={ordinal(weeklyRank)}
          />
        ) : null}
      </View>
      {tomorrowTip ? (
        <View style={styles.tomorrow}>
          <Text style={styles.tomorrowLabel}>{TODAY_COPY.tomorrowLabel.toUpperCase()}</Text>
          <Text numberOfLines={2} style={styles.tomorrowText}>
            {tomorrowTip.title}
          </Text>
        </View>
      ) : null}
    </DeckCardFrame>
  );
}

function EarnedTile({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    head: {
      flexShrink: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    title: {
      color: theme.colors.text,
      fontSize: 40,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1.2,
      marginTop: 12,
    },
    sub: {
      color: theme.colors.muted,
      fontSize: 15,
      marginTop: spacing.sm,
    },
    earned: {
      flexShrink: 0,
      flexDirection: 'row',
      gap: 10,
      marginTop: 'auto',
      paddingTop: spacing.md,
    },
    tile: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    tileValue: {
      color: theme.colors.text,
      fontSize: 26,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
    },
    tileLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    tomorrow: {
      flexShrink: 0,
      marginTop: spacing.md,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    tomorrowLabel: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
    },
    tomorrowText: {
      color: theme.colors.text,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 6,
    },
    action: {
      marginTop: 18,
    },
  });
