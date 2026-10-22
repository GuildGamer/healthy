import type { CatalogChallenge } from '@product/client';
import { fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles, withAlpha } from '@/theme';
import type { RoutineState } from './types/routine';
import { useChallengeTone } from './useChallengeTone';

const DISC_SIZE = 38;
const STATE_DOT_SIZE = 26;

type RowChallenge = Pick<CatalogChallenge, 'title' | 'category' | 'completionKind' | 'capture'>;

interface ChallengeRowProps {
  challenge: RowChallenge;
  meta: string;
  /** A circle for this period's standing, or a chevron into somewhere else. */
  accessory: RoutineState | 'chevron';
  onPress: () => void;
  tag?: string | null;
  /** Drawn in grey, for a challenge that is paused. */
  isMuted?: boolean;
  isFirst?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** One challenge in a divider list: its mark in a soft circle, its name, and one quiet line. */
export function ChallengeRow({
  challenge,
  meta,
  accessory,
  onPress,
  tag = null,
  isMuted = false,
  isFirst = false,
  accessibilityHint,
  testID,
}: ChallengeRowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${challenge.title}, ${meta}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isFirst ? null : styles.divider,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <ChallengeDisc challenge={challenge} isMuted={isMuted} />
      <View style={styles.text}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={[styles.title, isMuted ? styles.mutedTitle : null]}>
            {challenge.title}
          </Text>
          {tag ? <Text style={styles.tag}>{tag.toUpperCase()}</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      </View>
      <RowAccessory accessory={accessory} challenge={challenge} />
    </Pressable>
  );
}

function ChallengeDisc({ challenge, isMuted }: { challenge: RowChallenge; isMuted: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tone, fill, glyph } = useChallengeTone(challenge);
  const discFill = theme.deckCards.hasToneRail ? withAlpha(tone, 0.13) : fill;

  return (
    <View
      style={[styles.disc, { backgroundColor: isMuted ? theme.colors.surfaceRaised : discFill }]}
    >
      <Glyph color={isMuted ? theme.colors.muted : tone} name={glyph} size={18} strokeWidth={2} />
    </View>
  );
}

function RowAccessory({
  accessory,
  challenge,
}: {
  accessory: ChallengeRowProps['accessory'];
  challenge: RowChallenge;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tone } = useChallengeTone(challenge);

  if (accessory === 'chevron') {
    return <Glyph color={colors.muted} name="forward" size={16} strokeWidth={2} />;
  }

  if (accessory === 'done') {
    return (
      <View style={[styles.stateDot, styles.doneDot]} testID="routine-state-done">
        <Glyph color={colors.onPrimary} name="check" size={14} strokeWidth={3} />
      </View>
    );
  }

  if (accessory === 'part') {
    return (
      <View
        style={[styles.stateDot, styles.partDot, { borderTopColor: tone, borderLeftColor: tone }]}
        testID="routine-state-part"
      />
    );
  }

  return <View style={styles.stateDot} testID="routine-state-open" />;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    disc: {
      width: DISC_SIZE,
      height: DISC_SIZE,
      borderRadius: DISC_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    titleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      flexShrink: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    mutedTitle: {
      color: theme.colors.muted,
    },
    tag: {
      color: theme.colors.muted,
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.sm - 2,
      overflow: 'hidden',
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10.5,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.5,
    },
    meta: {
      color: theme.colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    stateDot: {
      width: STATE_DOT_SIZE,
      height: STATE_DOT_SIZE,
      borderRadius: STATE_DOT_SIZE / 2,
      borderWidth: 2,
      borderColor: theme.colors.tickIdle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneDot: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    partDot: {
      transform: [{ rotate: '45deg' }],
    },
  });
