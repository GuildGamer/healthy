import { fontSize, fontWeight, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

interface DeckEyebrowProps {
  label: string;
  glyph?: GlyphName;
  /** The label's colour; Clinic white tints it with the card's tone. */
  labelColor?: string;
  /** Quiet text in the corner, such as "3 of 4". */
  corner?: string | null;
  /** A chip in the corner instead, such as "Extra". */
  tag?: string | null;
}

/** The line across the top of a card: what it is, and where it sits. */
export function DeckEyebrow({
  label,
  glyph,
  labelColor,
  corner = null,
  tag = null,
}: DeckEyebrowProps) {
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = labelColor ?? deckCards.subtext;

  return (
    <View style={styles.row}>
      <View style={styles.label}>
        {glyph ? <Glyph color={color} name={glyph} size={16} /> : null}
        <Text numberOfLines={1} style={[styles.text, { color }]}>
          {label}
        </Text>
      </View>
      <EyebrowCorner corner={corner} tag={tag} />
    </View>
  );
}

function EyebrowCorner({ corner, tag }: { corner: string | null; tag: string | null }) {
  const styles = useThemedStyles(createStyles);

  if (tag) {
    return <Text style={styles.tag}>{tag.toUpperCase()}</Text>;
  }

  if (!corner) {
    return null;
  }

  return <Text style={styles.text}>{corner}</Text>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    label: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 1,
    },
    text: {
      color: theme.deckCards.subtext,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    tag: {
      color: theme.deckCards.text,
      backgroundColor: theme.deckCards.track,
      borderRadius: radii.sm,
      overflow: 'hidden',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      fontSize: 11,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
    },
  });
