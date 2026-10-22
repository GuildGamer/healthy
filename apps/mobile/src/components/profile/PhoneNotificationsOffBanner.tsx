import { fontWeight, radii, spacing } from '@product/brand';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles, withAlpha } from '@/theme';

/** The phone refuses Healthy's notifications; the only fix is in the phone's settings. */
export function PhoneNotificationsOffBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityRole="alert" style={styles.banner} testID="notifications-off-on-phone">
      <Glyph color={colors.warning} name="bellOff" size={18} strokeWidth={2} />
      <View style={styles.text}>
        <Text style={[styles.body, styles.title]}>
          Notifications are off for Healthy on this phone.
        </Text>
        <Text style={styles.body}>Photo checks and reminders can’t reach you.</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => void Linking.openSettings()}
          testID="open-phone-settings"
        >
          <Text style={[styles.body, styles.link]}>Open phone settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 14,
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: withAlpha(theme.colors.warning, 0.12),
    },
    text: {
      flex: 1,
    },
    body: {
      color: theme.colors.warning,
      fontSize: 14,
      lineHeight: 20,
    },
    title: {
      fontWeight: fontWeight.semibold,
    },
    link: {
      fontWeight: fontWeight.semibold,
      marginTop: spacing.xs,
    },
  });
