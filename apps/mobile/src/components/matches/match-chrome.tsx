import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon';
import { podiumMedalColor } from '@/components/leaderboard/podium';
import type { MatchActivity } from './match-metric';

export const MATCH_HERO_SIZE = 34;
export const MATCH_HERO_LINE = 38;

export function MatchKicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function MatchCard({
  children,
  emphasized = false,
  testID,
}: {
  children: ReactNode;
  emphasized?: boolean;
  testID?: string;
}) {
  return (
    <View
      style={[styles.card, emphasized ? styles.cardEmphasized : null]}
      testID={testID}
    >
      {children}
    </View>
  );
}

/** A medal before the player has logged anything is a place nobody earned. */
export function MatchRankMark({
  rank,
  scored,
}: {
  rank: number;
  scored: boolean;
}) {
  const medal = scored ? podiumMedalColor(rank) : undefined;

  return (
    <View style={styles.rankWell}>
      {medal ? (
        <Ionicons color={medal} name="medal" size={18} />
      ) : (
        <Text style={styles.rankText}>{rank}</Text>
      )}
    </View>
  );
}

/** A tertiary action that should not compete with the screen's primary button. */
export function MatchChip({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
      testID={testID}
    >
      <Ionicons color={colors.text} name={icon} size={16} />
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

export function MatchActivityMark({
  activity,
  size = 'md',
}: {
  activity: MatchActivity;
  size?: 'sm' | 'md';
}) {
  return <ChallengeIcon category="general" name={activity.icon} size={size} />;
}

/**
 * Stands in for the metric mark on surfaces that exist before any contest
 * does. An empty groups list has no activity to draw yet, and picking one
 * would promise the host a contest they have not chosen.
 */
export function MatchGroupMark() {
  return (
    <View style={styles.groupMark}>
      <Ionicons color={colors.accent} name="people" size={26} />
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardEmphasized: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accentContainer,
    borderWidth: 1,
  },
  groupMark: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.accentSurface,
    borderColor: colors.accentContainer,
    borderWidth: 1,
  },
  rankWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  rankText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
