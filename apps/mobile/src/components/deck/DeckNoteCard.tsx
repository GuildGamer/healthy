import { fontSize, fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { DECK_CARD_RADIUS } from './constants';
import { DeckButton } from './DeckButton';

interface DeckNoteCardProps {
  glyph: GlyphName;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void; testID?: string } | null;
  /** An outline marks a place waiting to be filled; a plain card is a note. */
  isOutlined?: boolean;
  testID?: string;
}

/** One calm card in a list's place: empty, didn't load, or nothing left to show. */
export function DeckNoteCard({
  glyph,
  title,
  body,
  action = null,
  isOutlined = false,
  testID,
}: DeckNoteCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.card, isOutlined ? styles.outlined : styles.plain]} testID={testID}>
      <Glyph color={colors.muted} name={glyph} size={26} strokeWidth={2} />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      {action ? (
        <View style={styles.action}>
          <DeckButton label={action.label} onPress={action.onPress} testID={action.testID} />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.lg,
      borderRadius: DECK_CARD_RADIUS,
      padding: spacing.lg,
    },
    plain: {
      backgroundColor: theme.colors.surface,
    },
    outlined: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
    },
    title: {
      color: theme.colors.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.5,
      lineHeight: 30,
      marginTop: 14,
    },
    body: {
      color: theme.colors.muted,
      fontSize: fontSize.sm,
      lineHeight: 21,
      marginTop: 6,
    },
    action: {
      marginTop: 18,
    },
  });
