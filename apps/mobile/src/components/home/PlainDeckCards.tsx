import { fontSize, fontWeight, radii } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import {
  DECK_CARD_HEIGHT,
  DECK_CARD_RADIUS,
  DECK_PEEK_INSET,
  DECK_PEEK_OFFSET,
  DeckButton,
  DeckCardFrame,
} from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';

/** A still outline of the deck, same shapes as the real thing so nothing jumps when it lands. */
export function DeckSkeleton() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityLabel="Loading today"
      accessibilityRole="progressbar"
      style={styles.stack}
      testID="home-deck-loading"
    >
      <View style={styles.behind} />
      <DeckCardFrame
        fill={colors.surface}
        footer={<View style={[styles.bone, styles.buttonBone]} />}
        variant="flat"
      >
        <View style={[styles.bone, styles.eyebrowBone]} />
        <View style={[styles.bone, styles.titleBone]} />
        <View style={[styles.bone, styles.numeralBone]} />
      </DeckCardFrame>
    </View>
  );
}

/** Nothing cached and nothing arrived: one calm card in the deck's place. */
export function DeckErrorCard({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stack}>
      <DeckCardFrame
        fill={colors.surface}
        footer={<DeckButton label={TODAY_COPY.errorAction} onPress={onRetry} testID="home-retry" />}
        testID="home-deck-error"
      >
        <Glyph color={colors.muted} name="offline" size={26} />
        <Text style={styles.title}>{TODAY_COPY.errorTitle}</Text>
        <Text style={styles.body}>{TODAY_COPY.errorBody}</Text>
      </DeckCardFrame>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    stack: {
      marginTop: DECK_PEEK_OFFSET,
    },
    behind: {
      position: 'absolute',
      top: -DECK_PEEK_OFFSET,
      left: DECK_PEEK_INSET,
      right: DECK_PEEK_INSET,
      height: DECK_CARD_HEIGHT,
      borderRadius: DECK_CARD_RADIUS,
      backgroundColor: theme.colors.surfaceRaised,
    },
    bone: {
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceRaised,
    },
    eyebrowBone: {
      width: 110,
      height: 14,
    },
    titleBone: {
      width: 240,
      height: 30,
      marginTop: 20,
    },
    numeralBone: {
      width: 120,
      height: 70,
      marginTop: 'auto',
    },
    buttonBone: {
      height: 54,
      marginTop: 18,
      borderRadius: radii.lg,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1,
      marginTop: 18,
    },
    body: {
      color: theme.colors.muted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 12,
    },
  });
