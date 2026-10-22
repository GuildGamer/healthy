import type { DeckCardTones } from '@product/brand';
import { fontWeight } from '@product/brand';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { initialsFor } from '@/components/profile/ProfileAvatar';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { FaceLook } from './group-today';

const BADGE_RATIO = 0.5;
const RING_GAP = 3;
const FACE_TONE_ORDER: readonly (keyof DeckCardTones)[] = [
  'water',
  'gym',
  'walk',
  'strength',
  'bloodPressure',
  'mobility',
];

export type FaceBadge = 'tick' | 'bell' | null;

interface GroupFaceProps {
  userId: string;
  name: string;
  image?: string | null;
  look: FaceLook;
  size: number;
  badge?: FaceBadge;
  /** The ring a cheer leaves for a moment. */
  isRinged?: boolean;
  /** Draws a ring in the page colour, so overlapping faces stay apart. */
  hasEdge?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** One stable colour per person, so a face reads the same on every screen. */
function faceToneFor(theme: Theme, userId: string): string {
  let hash = 0;
  for (const character of userId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  const kind = FACE_TONE_ORDER[hash % FACE_TONE_ORDER.length] ?? 'walk';
  return theme.deckCards.tones[kind];
}

/** A member in a group: lit once they have done today, outlined until then. */
export function GroupFace({
  userId,
  name,
  image = null,
  look,
  size,
  badge = null,
  isRinged = false,
  hasEdge = false,
  onPress,
  accessibilityLabel,
  testID,
}: GroupFaceProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isLit = look === 'lit';
  const circle = { width: size, height: size, borderRadius: size / 2 };

  const face = (
    <View
      style={[
        styles.face,
        circle,
        isLit ? { backgroundColor: faceToneFor(theme, userId) } : styles.off,
        hasEdge ? styles.edge : null,
        look === 'pending' ? styles.pending : null,
      ]}
      testID={testID}
    >
      {image ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: image }}
          style={[circle, isLit ? null : styles.dimPhoto]}
        />
      ) : (
        <Text
          style={[styles.initials, { fontSize: size * 0.38 }, isLit ? null : styles.offInitials]}
        >
          {initialsFor(name).slice(0, 1)}
        </Text>
      )}
      <FaceBadgeMark badge={badge} size={size} />
    </View>
  );

  const ringed = isRinged ? (
    <View style={[styles.ring, { borderRadius: size }]}>{face}</View>
  ) : (
    face
  );

  if (!onPress) {
    return ringed;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
    >
      {ringed}
    </Pressable>
  );
}

function FaceBadgeMark({ badge, size }: { badge: FaceBadge; size: number }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  if (!badge) {
    return null;
  }

  const badgeSize = Math.max(16, Math.round(size * BADGE_RATIO));
  const isTick = badge === 'tick';

  return (
    <View
      style={[
        styles.badge,
        { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
        isTick ? styles.tickBadge : styles.bellBadge,
      ]}
    >
      <Glyph
        color={isTick ? theme.colors.onPrimary : theme.colors.muted}
        name={isTick ? 'check' : 'bell'}
        size={badgeSize * 0.55}
        strokeWidth={isTick ? 3.4 : 2.4}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    face: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    off: {
      backgroundColor: theme.colors.background,
      borderWidth: 1.5,
      borderColor: theme.colors.tickIdle,
    },
    edge: {
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    pending: {
      opacity: 0.45,
    },
    dimPhoto: {
      opacity: 0.4,
    },
    initials: {
      color: theme.colors.onAccent,
      fontWeight: fontWeight.semibold,
    },
    offInitials: {
      color: theme.colors.muted,
    },
    badge: {
      position: 'absolute',
      right: -3,
      bottom: -3,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    tickBadge: {
      backgroundColor: theme.colors.primary,
    },
    bellBadge: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    ring: {
      padding: RING_GAP,
      borderWidth: RING_GAP,
      borderColor: theme.colors.accent,
      margin: -RING_GAP * 2,
    },
  });
