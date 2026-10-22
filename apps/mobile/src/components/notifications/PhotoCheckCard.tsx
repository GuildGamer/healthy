import type { TodayChallenge } from '@product/client';
import { fontWeight, radii, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeckEyebrow, deckCardKindFor } from '@/components/deck';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { INBOX_COPY } from './constants/inbox';
import { countdownLabel } from './inbox-sections';
import { useSecondsLeft } from './useSecondsLeft';

const CARD_RADIUS = 22;
const BUTTON_HEIGHT = 42;

/** Something with a timer running: one card, one button, gone when the time is. */
export function PhotoCheckCard({ challenge }: { challenge: TodayChallenge }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const secondsLeft = useSecondsLeft(challenge.evidenceRequest?.expiresAt ?? '');
  const kind = deckCardKindFor(challenge);

  if (secondsLeft === 0) {
    return null;
  }

  return (
    <View
      style={[styles.card, { backgroundColor: theme.deckCards[kind] }]}
      testID={`inbox-photo-check-${challenge.id}`}
    >
      <DeckEyebrow
        corner={`${countdownLabel(secondsLeft)} ${INBOX_COPY.left}`}
        glyph="camera"
        label={INBOX_COPY.photoCheck}
      />
      <Text style={styles.title}>{challenge.title}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/challenge/${challenge.challengeId}/verify`)}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
        testID={`inbox-open-camera-${challenge.id}`}
      >
        <Text style={styles.buttonLabel}>{INBOX_COPY.openCamera}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: 18,
      borderRadius: CARD_RADIUS,
    },
    title: {
      color: theme.deckCards.text,
      fontSize: 17,
      fontWeight: fontWeight.semibold,
      marginTop: spacing.sm,
    },
    button: {
      height: BUTTON_HEIGHT,
      marginTop: 12,
      borderRadius: radii.md + 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.deckCards.text,
    },
    pressed: {
      opacity: 0.8,
    },
    buttonLabel: {
      color: theme.colors.background,
      fontSize: 14.5,
      fontWeight: fontWeight.semibold,
    },
  });
