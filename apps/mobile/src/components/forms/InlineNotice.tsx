import { fontSize, radii, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { Glyph, type GlyphName } from '@/components/icons';
import { useTheme } from '@/theme';

type InlineNoticeTone = 'warning' | 'error';

/**
 * A plain banner that stays on the page while its state holds, unlike a toast,
 * such as an expired code or a failed connection.
 */
export function InlineNotice({
  message,
  tone,
  icon,
  testID,
}: {
  message: string;
  tone: InlineNoticeTone;
  icon: GlyphName;
  testID?: string;
}) {
  const { colors } = useTheme();
  const color = tone === 'error' ? colors.danger : colors.warning;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.notice, { backgroundColor: `${color}1F` }]}
      testID={testID}
    >
      <Glyph color={color} name={icon} size={18} strokeWidth={2} />
      <Text style={[styles.message, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
