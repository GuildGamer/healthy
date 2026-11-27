import { fontSize, fontWeight, spacing } from '@product/brand';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton } from '@/components/forms';
import { Glyph } from '@/components/icons';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const DONE_MARK_SIZE = 56;

/** A calm ending, already signed out, with one way forward: the front door. */
export function AccountDeletedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen} testID="account-deleted">
      <View style={styles.body}>
        <View style={styles.mark}>
          <Glyph color={colors.text} name="check" size={26} strokeWidth={2.4} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Your account is deleted.
        </Text>
        <Text style={styles.sub}>Thanks for being here. You can start again any time.</Text>
      </View>
      <View style={styles.dock}>
        <FormButton
          label="Done"
          onPress={() => router.replace('/onboarding')}
          testID="account-deleted-done"
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    mark: {
      width: DONE_MARK_SIZE,
      height: DONE_MARK_SIZE,
      borderRadius: DONE_MARK_SIZE / 2,
      backgroundColor: theme.colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      marginTop: 18,
      color: theme.colors.text,
      fontSize: fontSize.headline,
      fontWeight: fontWeight.semibold,
      letterSpacing: -0.75,
      textAlign: 'center',
    },
    sub: {
      maxWidth: 280,
      marginTop: spacing.sm,
      color: theme.colors.muted,
      fontSize: 14.5,
      lineHeight: 21,
      textAlign: 'center',
    },
    dock: {
      paddingHorizontal: 20,
      paddingBottom: spacing.sm,
    },
  });
