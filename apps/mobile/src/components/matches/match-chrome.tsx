import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, radii, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon';
import { PUSHUP_ICON_NAME } from '@/components/challenges/challenge-icon';
import { podiumMedalColor } from '@/components/leaderboard/podium';

export const MATCH_CARD_RADIUS = radii.md;
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

export function MatchRankMark({ rank }: { rank: number }) {
  const medal = podiumMedalColor(rank);

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

export function MatchInitial({
  name,
  accent = false,
}: {
  name: string;
  accent?: boolean;
}) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.initial, accent ? styles.initialAccent : null]}>
      <Text
        style={[styles.initialLetter, accent ? styles.initialLetterAccent : null]}
      >
        {letter}
      </Text>
    </View>
  );
}

export function MatchMetricMark({
  size = 'md',
}: {
  size?: 'sm' | 'md';
}) {
  return (
    <ChallengeIcon
      category="general"
      name={PUSHUP_ICON_NAME}
      size={size}
    />
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
    borderRadius: MATCH_CARD_RADIUS,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardEmphasized: {
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
  initial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  initialAccent: {
    backgroundColor: colors.accentContainer,
  },
  initialLetter: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  initialLetterAccent: {
    color: colors.accent,
  },
});
