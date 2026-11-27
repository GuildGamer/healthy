import { fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DECK_TONE_RAIL_HEIGHT, DeckEyebrow } from '@/components/deck';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { type GroupRules, groupKindLabel } from './group-rule-copy';
import { groupToneFor } from './group-tone';

type GroupCardSize = 'hero' | 'rule';

interface GroupCardProps {
  rules: GroupRules;
  /** Quiet text in the top corner, such as "4 days left". */
  corner: string;
  title: string;
  size?: GroupCardSize;
  children?: ReactNode;
  testID?: string;
}

/**
 * One group as a colour card: what it is, how long is left, and a headline.
 * The board's hero, the start screen's live invite, and the invite itself.
 */
export function GroupCard({
  rules,
  corner,
  title,
  size = 'hero',
  children,
  testID,
}: GroupCardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const tone = groupToneFor(theme, rules);

  return (
    <View style={[styles.card, styles[size], { backgroundColor: tone.fill }]} testID={testID}>
      {tone.railColor ? <View style={[styles.rail, { backgroundColor: tone.railColor }]} /> : null}
      <DeckEyebrow
        corner={corner}
        glyph={tone.glyph}
        label={groupKindLabel(rules)}
        labelColor={tone.railColor ?? undefined}
      />
      <Text style={[styles.title, size === 'rule' ? styles.ruleTitle : null]}>{title}</Text>
      {children}
    </View>
  );
}

/** The plain sentence under a group card's headline. */
export function GroupCardLine({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.line}>{children}</Text>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      shadowColor: theme.deckCards.shadow,
      shadowOpacity: theme.deckCards.hasToneRail ? 1 : 0,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
    },
    hero: {
      borderRadius: 26,
      padding: 20,
      marginTop: 14,
    },
    rule: {
      borderRadius: 22,
      padding: 18,
      marginTop: spacing.md,
    },
    rail: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: DECK_TONE_RAIL_HEIGHT,
    },
    title: {
      color: theme.deckCards.text,
      fontSize: 27,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
      lineHeight: 30,
      marginTop: 12,
    },
    ruleTitle: {
      fontSize: 24,
      lineHeight: 28,
      marginTop: 10,
    },
    line: {
      color: theme.deckCards.subtext,
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
  });
