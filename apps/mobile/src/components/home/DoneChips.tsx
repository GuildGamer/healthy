import type { TodayChallenge } from '@product/client';
import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canPracticeAgain, PRACTICE_AGAIN_LABEL } from '@/components/challenges/practice-entry';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { ChallengeDeckItem } from './types/today-deck';

const TICK_SIZE = 18;

interface DoneChipsProps {
  items: readonly ChallengeDeckItem[];
  onOpen: (challenge: TodayChallenge) => void;
}

/** Finished cards collapse into chips under the deck, each with what it earned. */
export function DoneChips({ items, onOpen }: DoneChipsProps) {
  const { deckCards, colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.pile} testID="home-done-chips">
      {items.map(({ challenge, kind }) => (
        <Pressable
          accessibilityLabel={`${challenge.title}, done, ${challenge.rewardPoints} points`}
          accessibilityRole="button"
          key={challenge.id}
          accessibilityHint={canPracticeAgain(challenge) ? PRACTICE_AGAIN_LABEL : undefined}
          onPress={() => onOpen(challenge)}
          style={styles.chip}
          testID={`home-done-${challenge.id}`}
        >
          <View style={[styles.tick, { backgroundColor: deckCards.tones[kind] }]}>
            <Glyph color={colors.background} name="check" size={11} strokeWidth={3} />
          </View>
          <Text numberOfLines={1} style={styles.chipLabel}>
            {challenge.title}
          </Text>
          <Text style={styles.points}>+{challenge.rewardPoints}</Text>
          {canPracticeAgain(challenge) ? (
            <Glyph
              color={colors.muted}
              name="repeat"
              size={13}
              testID={`home-done-again-${challenge.id}`}
            />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pile: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    chip: {
      height: 32,
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: spacing.sm,
      paddingRight: 12,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surface,
    },
    tick: {
      width: TICK_SIZE,
      height: TICK_SIZE,
      borderRadius: TICK_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipLabel: {
      flexShrink: 1,
      color: theme.colors.muted,
      fontSize: 13,
      fontWeight: fontWeight.medium,
    },
    points: {
      color: theme.colors.text,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
    },
  });
