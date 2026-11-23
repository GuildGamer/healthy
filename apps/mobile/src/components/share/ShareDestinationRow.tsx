import { fontSize, fontWeight, spacing } from '@product/brand';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GlyphName } from '@/components/icons/glyph-shapes';
import { Glyph } from '@/components/icons/Glyph';
import type { ShareDestinationId } from '@/components/matches/share-destination';
import { type Theme, useThemedStyles } from '@/theme';
import { SHARE_DEST_COPY } from './constants/share-copy';

export type ShareDestinationSelectId = ShareDestinationId | 'challenge';

type DestinationItem = {
  id: ShareDestinationSelectId;
  label: string;
  glyph: GlyphName;
  tint: string;
  testID: string;
};

const BASE_DESTINATIONS: DestinationItem[] = [
  {
    id: 'whatsapp',
    label: SHARE_DEST_COPY.whatsapp,
    glyph: 'brandWhatsapp',
    tint: '#25D366',
    testID: 'share-dest-whatsapp',
  },
  {
    id: 'status',
    label: SHARE_DEST_COPY.status,
    glyph: 'brandStatus',
    tint: '#128C7E',
    testID: 'share-dest-status',
  },
  {
    id: 'instagram',
    label: SHARE_DEST_COPY.instagram,
    glyph: 'brandInstagram',
    tint: '#E1306C',
    testID: 'share-dest-instagram',
  },
  {
    id: 'x',
    label: SHARE_DEST_COPY.x,
    glyph: 'brandX',
    tint: '#111111',
    testID: 'share-dest-x',
  },
  {
    id: 'messages',
    label: SHARE_DEST_COPY.messages,
    glyph: 'message',
    tint: '#34C759',
    testID: 'share-dest-messages',
  },
  {
    id: 'copy',
    label: SHARE_DEST_COPY.copy,
    glyph: 'doc',
    tint: '#8E8E93',
    testID: 'share-dest-copy',
  },
];

const OVERFLOW_DESTINATION: DestinationItem = {
  id: 'overflow',
  label: SHARE_DEST_COPY.overflow,
  glyph: 'share',
  tint: '#636366',
  testID: 'share-dest-overflow',
};

const CHALLENGE_DESTINATION: DestinationItem = {
  id: 'challenge',
  label: SHARE_DEST_COPY.challenge,
  glyph: 'users',
  tint: '#0A84FF',
  testID: 'share-dest-challenge',
};

type ShareDestinationRowProps = {
  onSelect: (id: ShareDestinationSelectId) => void;
  /** When true, inserts a Challenge disc before overflow. */
  showChallenge?: boolean;
  /** Hide Copy link when there is no invite URL to copy. */
  showCopy?: boolean;
  disabled?: boolean;
};

/** Destination discs: one tap opens the app or attaches the artifact on screen. */
export function ShareDestinationRow({
  onSelect,
  showChallenge = false,
  showCopy = true,
  disabled = false,
}: ShareDestinationRowProps) {
  const styles = useThemedStyles(createStyles);
  const base = showCopy
    ? BASE_DESTINATIONS
    : BASE_DESTINATIONS.filter((item) => item.id !== 'copy');
  const items: DestinationItem[] = [
    ...base,
    ...(showChallenge ? [CHALLENGE_DESTINATION] : []),
    OVERFLOW_DESTINATION,
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="share-destination-row"
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityLabel={item.label}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => [
            styles.item,
            pressed || disabled ? styles.itemPressed : null,
          ]}
          testID={item.testID}
        >
          <View style={[styles.disc, { backgroundColor: item.tint }]}>
            <Glyph color="#FFFFFF" cutoutColor={item.tint} name={item.glyph} size={22} />
          </View>
          <Text numberOfLines={1} style={styles.label}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    item: {
      width: 64,
      alignItems: 'center',
      gap: spacing.xs,
    },
    itemPressed: {
      opacity: 0.65,
    },
    disc: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: theme.colors.muted,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      textAlign: 'center',
    },
  });
