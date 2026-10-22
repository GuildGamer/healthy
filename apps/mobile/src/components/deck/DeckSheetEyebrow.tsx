import { fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useThemedStyles } from '@/theme';

interface DeckSheetEyebrowProps {
  glyph: GlyphName;
  label: string;
  /** The card's tone, carried onto the sheet so you know which card you lifted. */
  tone: string;
  /** Quiet text on the right, such as "Now, 08:10". */
  corner?: string | null;
}

/** The line across the top of a sheet: what you are logging, and when. */
export function DeckSheetEyebrow({ glyph, label, tone, corner = null }: DeckSheetEyebrowProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <View style={styles.label}>
        <Glyph color={tone} name={glyph} size={16} strokeWidth={2} />
        <Text style={[styles.text, { color: tone }]}>{label}</Text>
      </View>
      {corner ? <Text style={styles.text}>{corner}</Text> : null}
    </View>
  );
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
      gap: 7,
    },
    text: {
      color: theme.colors.muted,
      fontSize: 13,
      fontWeight: fontWeight.medium,
    },
  });
