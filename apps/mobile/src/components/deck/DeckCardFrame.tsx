import { spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { DECK_CARD_HEIGHT, DECK_CARD_RADIUS, DECK_TONE_RAIL_HEIGHT } from './constants';

export type DeckCardFrameVariant = 'lifted' | 'flat' | 'outline';

interface DeckCardFrameProps {
  fill: string;
  /** Clinic white cards carry their colour as a rail along the top. */
  railColor?: string | null;
  variant?: DeckCardFrameVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children: ReactNode;
  /**
   * The card's action, pinned to its foot. The card is a fixed height, so the
   * content above gives way rather than pushing the action out of the card.
   */
  footer?: ReactNode;
  testID?: string;
}

/** The shape every card in a deck shares, whatever it holds. */
export function DeckCardFrame({
  fill,
  railColor = null,
  variant = 'lifted',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  children,
  footer,
  testID,
}: DeckCardFrameProps) {
  const styles = useThemedStyles(createStyles);
  const frameStyle = [styles.card, styles[variant], { backgroundColor: fill }];
  const content = (
    <>
      {railColor ? (
        <View pointerEvents="none" style={styles.railClip} testID="deck-card-rail-clip">
          <View style={[styles.rail, { backgroundColor: railColor }]} testID="deck-card-rail" />
        </View>
      ) : null}
      <View style={styles.body} testID={testID ? `${testID}-body` : undefined}>
        {children}
      </View>
      {footer ? (
        <View style={styles.footer} testID={testID ? `${testID}-footer` : undefined}>
          {footer}
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={frameStyle} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={frameStyle}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      height: DECK_CARD_HEIGHT,
      borderRadius: DECK_CARD_RADIUS,
      padding: spacing.lg,
    },
    body: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    footer: {
      flexShrink: 0,
    },
    lifted: {
      shadowColor: theme.deckCards.shadow,
      shadowOpacity: 1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 18 },
      elevation: 8,
      borderWidth: theme.deckCards.hasToneRail ? StyleSheet.hairlineWidth : 0,
      borderColor: theme.colors.border,
    },
    flat: {},
    outline: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
    },
    /** The rail is shorter than the corner radius, so the card's own shape has to clip it. */
    railClip: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: DECK_CARD_RADIUS,
      overflow: 'hidden',
    },
    rail: {
      height: DECK_TONE_RAIL_HEIGHT,
    },
  });
