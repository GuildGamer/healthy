import { fontSize, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckSheetModal } from '@/components/deck';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { boardFacts } from './board-facts';
import { BOARD_COPY } from './constants/board';

/** Four short facts, what others see of you first. */
export function HowTheBoardWorksSheet({
  publicName,
  onClose,
}: {
  publicName: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <DeckSheetModal
      footer={
        <View style={styles.action}>
          <DeckButton label={BOARD_COPY.gotIt} onPress={onClose} testID="leaderboard-got-it" />
        </View>
      }
      onDismiss={onClose}
      testID="leaderboard-how-it-works"
      title={BOARD_COPY.howItWorks}
      visible
    >
      <View style={styles.facts}>
        {boardFacts(publicName).map((fact, index) => (
          <View key={fact.glyph} style={[styles.fact, index === 0 ? null : styles.divider]}>
            <Glyph color={colors.text} name={fact.glyph} size={18} strokeWidth={2} />
            <View style={styles.factText}>
              <Text style={styles.line}>{fact.line}</Text>
              <Text style={styles.detail}>{fact.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </DeckSheetModal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    facts: {
      marginTop: 10,
    },
    fact: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    factText: {
      flex: 1,
    },
    line: {
      color: theme.colors.text,
      fontSize: fontSize.sm,
      lineHeight: 21,
    },
    detail: {
      color: theme.colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    action: {
      marginTop: spacing.md,
    },
  });
