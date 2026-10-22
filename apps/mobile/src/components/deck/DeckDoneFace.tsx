import { fontSize, fontWeight, spacing } from '@product/brand';
import type { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { DECK_NUMERAL_SIZE } from './constants';
import { DeckButton } from './DeckButton';
import { DeckCardFrame } from './DeckCardFrame';
import type { DoneFaceHeadline, DoneFaceProof, DoneFaceQuietAction } from './types';
import { useFlipIn } from './useFlipIn';

const TICK_SIZE = 64;

interface DeckDoneFaceProps {
  fill: string;
  railColor: string | null;
  /** The card's top line, as it was on the front. */
  eyebrow: ReactNode;
  headline: DoneFaceHeadline;
  proof: DoneFaceProof | null;
  nextLabel: string;
  onNext: () => void;
  /** Only for results worth showing; the button is absent otherwise. */
  onShare: (() => void) | null;
  /** A quiet offer under the buttons, such as "Challenge a friend". */
  quietAction?: DoneFaceQuietAction | null;
  testID?: string;
}

/** The back of a card: what you did, how it was measured, and what comes next. */
export function DeckDoneFace({
  fill,
  railColor,
  eyebrow,
  headline,
  proof,
  nextLabel,
  onNext,
  onShare,
  quietAction = null,
  testID,
}: DeckDoneFaceProps) {
  const flipStyle = useFlipIn();

  return (
    <Animated.View style={flipStyle} testID={testID}>
      <DeckCardFrame
        fill={fill}
        footer={
          <>
            {proof ? <DoneProof proof={proof} /> : null}
            <DoneActions nextLabel={nextLabel} onNext={onNext} onShare={onShare} />
            {quietAction ? (
              <DeckButton
                label={quietAction.label}
                loading={quietAction.isBusy}
                onPress={quietAction.onPress}
                testID={quietAction.testID}
                variant="quiet"
              />
            ) : null}
          </>
        }
        railColor={railColor}
      >
        {eyebrow}
        <DoneTick />
        <DoneHeadline headline={headline} />
      </DeckCardFrame>
    </Animated.View>
  );
}

function DoneTick() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.tick}>
      <Glyph color={colors.onPrimary} name="check" size={32} strokeWidth={3} />
    </View>
  );
}

function DoneHeadline({ headline }: { headline: DoneFaceHeadline }) {
  const styles = useThemedStyles(createStyles);

  if (headline.kind === 'word') {
    return (
      <View style={styles.headline}>
        <Text style={styles.word}>{headline.word}</Text>
        <Text style={styles.sub}>{headline.sub}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.headline, styles.measure]} testID="done-face-measure">
      <Text style={styles.numeral}>{headline.value}</Text>
      <Text style={styles.of}>{headline.of}</Text>
    </View>
  );
}

function DoneProof({ proof }: { proof: DoneFaceProof }) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.proof}>
      <Glyph color={deckCards.subtext} name={proof.glyph} size={16} />
      <Text style={styles.proofText}>{proof.line}</Text>
    </View>
  );
}

function DoneActions({
  nextLabel,
  onNext,
  onShare,
}: Pick<DeckDoneFaceProps, 'nextLabel' | 'onNext' | 'onShare'>) {
  const styles = useThemedStyles(createStyles);

  if (!onShare) {
    return (
      <View style={styles.actions}>
        <DeckButton label={nextLabel} onPress={onNext} testID="done-face-next" variant="tonal" />
      </View>
    );
  }

  return (
    <View style={[styles.actions, styles.row]}>
      <DeckButton
        glyph="share"
        isFlexible
        label="Share"
        onPress={onShare}
        testID="done-face-share"
        variant="tonal"
      />
      <DeckButton isFlexible label={nextLabel} onPress={onNext} testID="done-face-next" />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tick: {
      width: TICK_SIZE,
      height: TICK_SIZE,
      borderRadius: TICK_SIZE / 2,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 26,
    },
    headline: {
      marginTop: 'auto',
    },
    word: {
      color: theme.deckCards.text,
      fontSize: 44,
      fontWeight: fontWeight.semibold,
      letterSpacing: -1.3,
      lineHeight: 46,
    },
    sub: {
      color: theme.deckCards.subtext,
      fontSize: 15,
      marginTop: spacing.sm,
    },
    measure: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    numeral: {
      color: theme.deckCards.text,
      fontSize: DECK_NUMERAL_SIZE,
      fontWeight: fontWeight.semibold,
      letterSpacing: -4,
      lineHeight: DECK_NUMERAL_SIZE,
    },
    of: {
      flexShrink: 1,
      color: theme.deckCards.subtext,
      fontSize: 17,
      fontWeight: fontWeight.medium,
    },
    proof: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 14,
    },
    proofText: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    actions: {
      marginTop: 18,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
  });
