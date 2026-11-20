import { fontWeight, radii, spacing } from '@product/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import type { KeypadKey } from './types';

const DIGIT_ROWS: readonly (readonly KeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

interface DeckKeypadProps {
  onKey: (key: KeypadKey) => void;
  allowsDecimal?: boolean;
}

/** Our own number pad, so a reading never waits on the phone keyboard. */
export function DeckKeypad({ onKey, allowsDecimal = false }: DeckKeypadProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.pad} testID="deck-keypad">
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((key) => (
            <KeypadButton key={key} keyName={key} onKey={onKey} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {allowsDecimal ? <KeypadButton keyName="." onKey={onKey} /> : <View style={styles.blank} />}
        <KeypadButton keyName="0" onKey={onKey} />
        <KeypadButton keyName="delete" onKey={onKey} />
      </View>
    </View>
  );
}

function KeypadButton({ keyName, onKey }: { keyName: KeypadKey; onKey: (key: KeypadKey) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDelete = keyName === 'delete';

  return (
    <Pressable
      accessibilityLabel={isDelete ? 'Delete' : keyName}
      accessibilityRole="button"
      onPress={() => onKey(keyName)}
      style={({ pressed }) => [styles.key, pressed ? styles.keyPressed : null]}
      testID={`keypad-${keyName}`}
    >
      {isDelete ? (
        <Glyph color={colors.text} name="deleteKey" size={22} />
      ) : (
        <Text style={styles.keyText}>{keyName}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pad: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    key: {
      flex: 1,
      height: 52,
      borderRadius: radii.lg,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyPressed: {
      backgroundColor: theme.colors.border,
    },
    blank: {
      flex: 1,
    },
    keyText: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: fontWeight.medium,
    },
  });
