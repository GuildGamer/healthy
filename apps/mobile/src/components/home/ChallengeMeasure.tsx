import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckCountMeasure } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { DeckMeasure } from './types/today-deck';

const CHECK_RING_SIZE = 104;

/** The middle of a challenge card, shaped by how the challenge is measured. */
export function ChallengeMeasure({ measure, tone }: { measure: DeckMeasure; tone: string }) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (measure.kind === 'count') {
    return (
      <DeckCountMeasure
        fill={measure.fill}
        of={`of ${measure.total} ${measure.unit}`.trim()}
        testID="deck-measure-count"
        tone={tone}
        value={measure.value}
      />
    );
  }

  if (measure.kind === 'photo') {
    return (
      <View style={styles.photoSlot} testID="deck-measure-photo">
        <Glyph color={deckCards.subtext} name="camera" size={26} />
        <Text style={styles.photoLine}>{measure.line}</Text>
      </View>
    );
  }

  if (measure.kind === 'checkRing') {
    return (
      <View style={styles.checkRing} testID="deck-measure-ring">
        <Glyph color={deckCards.subtext} name="check" size={40} strokeWidth={2.2} />
      </View>
    );
  }

  return (
    <View testID="deck-measure-status">
      <Text style={styles.statusLine}>{measure.line}</Text>
      {measure.note ? (
        <Text style={styles.statusNote} testID="deck-measure-note">
          {measure.note}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    statusLine: {
      color: theme.deckCards.text,
      fontSize: 30,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.6,
    },
    statusNote: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.md,
      marginTop: 6,
    },
    photoSlot: {
      height: 138,
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.deckCards.track,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    photoLine: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
    },
    checkRing: {
      width: CHECK_RING_SIZE,
      height: CHECK_RING_SIZE,
      borderRadius: CHECK_RING_SIZE / 2,
      borderWidth: 3,
      borderStyle: 'dashed',
      borderColor: theme.deckCards.track,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
